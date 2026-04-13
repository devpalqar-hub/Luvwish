import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';
import { ReturnFilterDto } from './dto/return-filter.dto';
import { FirebaseSender } from '../firebase/firebase.sender';
import { MailService } from '../mail/mail.service';
import { ReturnPaymentMethod, ReturnStatus } from '@prisma/client';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseSender: FirebaseSender,
    private readonly emailService: MailService,
  ) { }

  /**
   * Create a new return request
   */

  async createReturn(dto: CreateReturnDto, customerProfileId: string) {
    // 1️⃣ Fetch order with details
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        customerProfileId,
      },
      include: {
        items: {
          include: {
            product: true,
            productVariation: true,
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            email: true,
            AdminProfile: {
              select: {
                name: true,
                fcmToken: true,
              },
            },
          },
        },
        shippingAddress: true,
        CustomerProfile: {
          select: {
            name: true,
            user: {
              select: { email: true },
            },
          },
        },
        tracking: {
          select: {
            status: true,
          },
        },
      },
    });
    // 1️⃣ Order existence check FIRST
    if (!order) {
      throw new NotFoundException('Order not found for this customer');
    }

    // 2️⃣ Tracking existence check
    if (!order.tracking) {
      throw new BadRequestException(
        'Tracking details not found for this order',
      );
    }

    // 3️⃣ Delivery check
    if (order.tracking.status !== 'delivered') {
      throw new BadRequestException(
        'Order must be delivered before it can be returned',
      );
    }


    // 2️⃣ Check if return window is within 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    if (order.updatedAt < threeDaysAgo) {
      throw new BadRequestException(
        'Return window expired. Returns are only allowed within 3 days of delivery',
      );
    }

    // 3️⃣ Prevent duplicate returns

    if (dto.returnType === 'full') {

      // 🔹 FULL RETURN → Check all order items
      for (const orderItem of order.items) {

        const existingReturnItem = await this.prisma.returnItem.findFirst({
          where: {
            orderItemId: orderItem.id,
          },
          select: { id: true },
        });

        if (existingReturnItem) {
          throw new BadRequestException(
            `Return already exists for item ${orderItem.product.name}`,
          );
        }
      }

    } else if (dto.returnType === 'partial') {

      if (!dto.items || !dto.items.length) {
        throw new BadRequestException('Items are required for partial return');
      }

      // 🔹 PARTIAL RETURN → Check only passed items
      for (const returnItem of dto.items) {

        // 1️⃣ Verify item belongs to this order
        const orderItem = order.items.find(
          item => item.id === returnItem.orderItemId,
        );

        if (!orderItem) {
          throw new BadRequestException(
            `Order item ${returnItem.orderItemId} does not belong to this order`,
          );
        }

        // 2️⃣ Check if already returned
        const existingReturnItem = await this.prisma.returnItem.findFirst({
          where: {
            orderItemId: returnItem.orderItemId,
          },
          select: { id: true },
        });

        if (existingReturnItem) {
          throw new BadRequestException(
            `Return already exists for item ${orderItem.product.name}`,
          );
        }
      }
    }



    // 4️⃣ Calculate refund amount
    let refundAmount = 0;
    const returnFee = Number(order.actualDeliveryFee ?? 0); // Return fee = delivery charge

    if (dto.returnType === 'full') {
      // Full order return
      refundAmount = Number(order.discountAmount) - returnFee;
    } else if (dto.returnType === 'partial' && dto.items && dto.items.length > 0) {
      // Partial return - calculate based on items
      for (const returnItem of dto.items) {
        const orderItem = order.items.find((item) => item.id === returnItem.orderItemId);
        if (!orderItem) {
          throw new NotFoundException(`Order item ${returnItem.orderItemId} not found`);
        }
        if (returnItem.quantity > orderItem.quantity) {
          throw new BadRequestException(
            `Cannot return ${returnItem.quantity} of item ${orderItem.product.name}. Only ${orderItem.quantity} were ordered`,
          );
        }
        refundAmount += Number(orderItem.discountedPrice) * returnItem.quantity;
      }
      refundAmount -= returnFee;
    } else {
      throw new BadRequestException('Items are required for partial returns');
    }

    if (refundAmount < 0) {
      refundAmount = 0;
    }

    // 5️⃣ Create return request
    const returnRequest = await this.prisma.return.create({
      data: {
        orderId: dto.orderId,
        customerProfileId,
        deliveryPartnerId: order.deliveryPartnerId,
        returnType: dto.returnType,
        reason: dto.reason,
        refundAmount,
        returnFee,
        // refundMethod: dto.refundMethod,
        status: 'pending',
        returnItems:
          dto.returnType === 'full'
            ? {
              create: order.items.map((item) => ({
                orderItemId: item.id,
                quantity: item.quantity,
                reason: dto.reason,
              })),
            }
            : dto.returnType === 'partial' && dto.items
              ? {
                create: dto.items.map((item) => ({
                  orderItemId: item.orderItemId,
                  quantity: item.quantity,
                  reason: item.reason,
                })),
              }
              : undefined,

      },
      include: {
        returnItems: {
          include: {
            orderItem: {
              include: {
                product: true,
              },
            },
          },
        },
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    // 5️⃣.1 Mark returned order items with pending status
    if (dto.returnType === 'full') {
      await this.prisma.orderItem.updateMany({
        where: {
          orderId: dto.orderId,
        },
        data: {
          isReturned: true,
          returnStatus: 'pending',
        },
      });
    } else if (dto.returnType === 'partial' && dto.items?.length) {
      await this.prisma.orderItem.updateMany({
        where: {
          id: {
            in: dto.items.map((item) => item.orderItemId),
          },
        },
        data: {
          isReturned: true,
          returnStatus: 'pending',
        },
      });
    }


    // 6️⃣ Send notification to delivery partner
    if (order.deliveryPartner?.AdminProfile?.fcmToken) {
      try {
        await this.firebaseSender.sendPush(
          order.deliveryPartner.AdminProfile.fcmToken,
          'New Return Request',
          `Return requested for order #${order.orderNumber}. Please pick up the items.`,
        );
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }

    type ReturnType = 'full' | 'partial';

    const ReturnTypeLabel: Record<ReturnType, string> = {
      full: 'Full Return',
      partial: 'Partial Return',
    };



    // 7️⃣ Send email to customer
    if (order.CustomerProfile?.user?.email) {
      try {
        await this.emailService.sendMail({
          to: order.CustomerProfile.user.email,
          subject: `Return Request Created - Order #${order.orderNumber}`,
          template: 'return-created',
          context: {
            customerName: order.CustomerProfile.name,
            orderNumber: order.orderNumber,
            returnType: ReturnTypeLabel[dto.returnType],
            refundAmount,
            returnFee,
          },
        });
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }

    return {
      message: 'Return request created successfully',
      data: returnRequest,
    };
  }

  /**
   * Update return status (delivery partner or admin)
   */
  async updateReturnStatus(
    returnId: string,
    dto: UpdateReturnStatusDto,
    userId: string,
    userRole: string,
  ) {
    // 1️⃣ Fetch return with order details
    const returnRequest = await this.prisma.return.findUnique({
      where: { id: returnId },
      include: {
        returnItems: {
          include: {
            orderItem: {
              include: {
                product: true,
                productVariation: true,
              },
            },
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
          },
        },
        customerProfile: {
          select: {
            name: true,
            user: {
              select: { email: true },
            },
            fcmToken: true,
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            AdminProfile: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    // 2️⃣ Authorization check
    if (userRole === 'DELIVERY') {
      if (returnRequest.deliveryPartnerId !== userId) {
        throw new ForbiddenException(
          'You can only update returns assigned to you',
        );
      }
    }



    let paymentMethodToUpdate: ReturnPaymentMethod | null =
      returnRequest.returnPaymentMethod;

    // ❌ If rejected → force NULL
    if (dto.status === 'rejected') {
      paymentMethodToUpdate = null;
    }

    // ✅ If refunded → allow dto value
    else if (dto.status === 'refunded') {
      paymentMethodToUpdate = dto.returnPaymentMethod;
    }

    // Otherwise keep previous value

    // 3️⃣ Update return status and order items
    const updated = await this.prisma.return.update({
      where: { id: returnId },
      data: {
        status: dto.status,
        adminNotes: dto.adminNotes || returnRequest.adminNotes,
        updatedAt: new Date(),
        returnPaymentMethod: paymentMethodToUpdate,
      },
    });

    // 3️⃣.1 Update order item return statuses
    const orderItemIds = returnRequest.returnItems.map(item => item.orderItemId);
    await this.prisma.orderItem.updateMany({
      where: {
        id: { in: orderItemIds },
      },
      data: {
        returnStatus: dto.status,
      },
    });

    // 4️⃣ Handle different return statuses
    if (dto.status === 'refunded') {
      // Restore stock when refunded
      await this.restoreStockForReturn(returnRequest);
    } else if (dto.status === 'rejected') {
      // Mark items as not returned when rejected
      await this.prisma.orderItem.updateMany({
        where: {
          id: { in: orderItemIds },
        },
        data: {
          isReturned: false,
          returnStatus: 'rejected',
        },
      });
    }

    // Note: Order and tracking status remain as 'delivered', never changed to 'returned'

    // 5️⃣ Send notifications
    if (returnRequest.customerProfile?.fcmToken) {
      try {
        await this.firebaseSender.sendPush(
          returnRequest.customerProfile.fcmToken,
          'Return Status Updated',
          `Your return request for order #${returnRequest.order.orderNumber} is now ${dto.status}`,
        );
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }


    const ReturnStatusLabel: Record<ReturnStatus, string> = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      picked_up: 'Picked Up',
      returned: 'Returned',
      refunded: 'Refunded',
    };


    if (returnRequest.customerProfile?.user?.email) {
      try {
        await this.emailService.sendMail({
          to: returnRequest.customerProfile.user.email,
          subject: `Return Update - Order #${returnRequest.order.orderNumber}`,
          template: 'return-status-update',
          context: {
            customerName: returnRequest.customerProfile.name,
            orderNumber: returnRequest.order.orderNumber,
            status: ReturnStatusLabel[dto.status],
            refundAmount: returnRequest.refundAmount,
          },
        });
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }

    return {
      message: 'Return status updated successfully',
      data: updated,
    };
  }

  /**
   * Handle returned items - restore inventory
   */
  /**
   * Restore stock for refunded return items (doesn't change order status)
   */
  private async restoreStockForReturn(returnRequest: any) {
    console.log('🔄 Restoring stock for return:', returnRequest.id);

    if (returnRequest.returnType === 'full') {
      // Restore all items from order
      const orderItems = await this.prisma.orderItem.findMany({
        where: { orderId: returnRequest.orderId },
        include: {
          product: true,
          productVariation: true,
        },
      });

      for (const item of orderItems) {
        if (item.productVariationId) {
          // Update product variation stock
          await this.prisma.productVariation.update({
            where: { id: item.productVariationId },
            data: {
              stockCount: {
                increment: item.quantity,
              },
            },
          });
          console.log(`✅ Restored ${item.quantity} units to variation ${item.productVariationId}`);
        } else {
          // Update product stock
          await this.prisma.product.update({
            where: { id: item.productId },
            data: {
              stockCount: {
                increment: item.quantity,
              },
            },
          });
          console.log(`✅ Restored ${item.quantity} units to product ${item.productId}`);
        }
      }
    } else if (returnRequest.returnType === 'partial') {
      // Restore only returned items
      for (const returnItem of returnRequest.returnItems) {
        const { orderItem } = returnItem;
        if (orderItem.productVariationId) {
          await this.prisma.productVariation.update({
            where: { id: orderItem.productVariationId },
            data: {
              stockCount: {
                increment: returnItem.quantity,
              },
            },
          });
          console.log(`✅ Restored ${returnItem.quantity} units to variation ${orderItem.productVariationId}`);
        } else {
          await this.prisma.product.update({
            where: { id: orderItem.productId },
            data: {
              stockCount: {
                increment: returnItem.quantity,
              },
            },
          });
          console.log(`✅ Restored ${returnItem.quantity} units to product ${orderItem.productId}`);
        }
      }
    }

    console.log('✅ Stock restoration completed. Order status remains as delivered.');
  }

  /**
   * Get all returns with filters (admin)
   */
  async getAllReturns(filters: ReturnFilterDto) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (filters.orderId) {
      whereClause.orderId = filters.orderId;
    }

    if (filters.deliveryPartnerId) {
      whereClause.deliveryPartnerId = filters.deliveryPartnerId;
    }

    if (filters.customerProfileId) {
      whereClause.customerProfileId = filters.customerProfileId;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    const [returns, total] = await this.prisma.$transaction([
      this.prisma.return.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
            },
          },
          customerProfile: {
            select: {
              name: true,
              phone: true,
              user: {
                select: { email: true },
              },
            },
          },
          deliveryPartner: {
            select: {
              email: true,
              AdminProfile: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          },
          returnItems: {
            include: {
              orderItem: {
                include: {
                  product: {
                    select: {
                      name: true,
                      images: {
                        where: { isMain: true },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.return.count({ where: whereClause }),
    ]);

    return {
      data: returns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get customer's returns
   */
  async getCustomerReturns(customerProfileId: string, filters: ReturnFilterDto) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = { customerProfileId };

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    const [returns, total] = await this.prisma.$transaction([
      this.prisma.return.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
            },
          },
          returnItems: {
            include: {
              orderItem: {
                include: {
                  product: {
                    select: {
                      name: true,
                      images: {
                        where: { isMain: true },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.return.count({ where: whereClause }),
    ]);

    return {
      data: returns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get delivery partner's assigned returns
   */
  async getDeliveryPartnerReturns(deliveryPartnerId: string, filters: ReturnFilterDto) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = { deliveryPartnerId };

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      whereClause.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    const [returns, total] = await this.prisma.$transaction([
      this.prisma.return.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              shippingAddress: true,
            },
          },
          customerProfile: {
            select: {
              name: true,
              phone: true,
            },
          },
          returnItems: {
            include: {
              orderItem: {
                include: {
                  product: {
                    select: {
                      name: true,
                      images: {
                        where: { isMain: true },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.return.count({ where: whereClause }),
    ]);

    return {
      data: returns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single return details
   */
  async getReturnById(returnId: string) {
    const returnRequest = await this.prisma.return.findUnique({
      where: { id: returnId },
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            shippingAddress: true,
          },
        },
        customerProfile: {
          select: {
            name: true,
            phone: true,
            user: {
              select: { email: true },
            },
          },
        },
        deliveryPartner: {
          select: {
            email: true,
            AdminProfile: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
        returnItems: {
          include: {
            orderItem: {
              include: {
                product: {
                  select: {
                    name: true,
                    images: {
                      where: { isMain: true },
                      take: 1,
                    },
                  },
                },
                productVariation: true,
              },
            },
          },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    return returnRequest;
  }

  /**
   * Admin directly processes return and refunds items
   * Return charge = delivery charge (not included in revenue)
   */
  async adminDirectReturn(dto: CreateReturnDto, adminNotes?: string) {
    // 1️⃣ Fetch order with details
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
      },
      include: {
        items: {
          include: {
            product: true,
            productVariation: true,
          },
        },
        deliveryPartner: {
          select: {
            id: true,
            email: true,
            AdminProfile: {
              select: {
                name: true,
                fcmToken: true,
              },
            },
          },
        },
        shippingAddress: true,
        CustomerProfile: {
          select: {
            id: true,
            name: true,
            user: {
              select: { email: true },
            },
            fcmToken: true,
          },
        },
        tracking: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.tracking.status !== 'delivered') {
      throw new BadRequestException(
        'Order must be delivered before it can be returned',
      );
    }

    // 2️⃣ Calculate refund amount
    let refundAmount = 0;
    const returnCharge = Number(order.shippingCost ?? 0); // Return charge = delivery charge

    if (dto.returnType === 'full') {
      // Full order return
      refundAmount = Number(order.totalAmount) - returnCharge;
    } else if (dto.returnType === 'partial' && dto.items && dto.items.length > 0) {
      // Partial return - calculate based on items
      for (const returnItem of dto.items) {
        const orderItem = order.items.find((item) => item.id === returnItem.orderItemId);
        if (!orderItem) {
          throw new NotFoundException(`Order item ${returnItem.orderItemId} not found`);
        }
        if (returnItem.quantity > orderItem.quantity) {
          throw new BadRequestException(
            `Cannot return ${returnItem.quantity} of item ${orderItem.product.name}. Only ${orderItem.quantity} were ordered`,
          );
        }
        refundAmount += Number(orderItem.discountedPrice) * returnItem.quantity;
      }
      refundAmount -= returnCharge;
    } else {
      throw new BadRequestException('Items are required for partial returns');
    }

    if (refundAmount < 0) {
      refundAmount = 0;
    }

    // 3️⃣ Create return request with 'refunded' status (directly approved by admin)
    const returnRequest = await this.prisma.return.create({
      data: {
        orderId: dto.orderId,
        customerProfileId: order.CustomerProfile.id,
        deliveryPartnerId: order.deliveryPartnerId,
        returnType: dto.returnType,
        reason: dto.reason,
        refundAmount,
        returnFee: returnCharge, // Return charge = delivery charge
        status: 'refunded', // Directly set to refunded
        adminNotes: adminNotes || 'Processed directly by admin',
        returnItems:
          dto.returnType === 'full'
            ? {
              create: order.items.map((item) => ({
                orderItemId: item.id,
                quantity: item.quantity,
                reason: dto.reason,
              })),
            }
            : dto.returnType === 'partial' && dto.items
              ? {
                create: dto.items.map((item) => ({
                  orderItemId: item.orderItemId,
                  quantity: item.quantity,
                  reason: item.reason,
                })),
              }
              : undefined,
      },
      include: {
        returnItems: {
          include: {
            orderItem: {
              include: {
                product: true,
              },
            },
          },
        },
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    // 4️⃣ Mark order items as returned with 'refunded' status
    const orderItemIds = returnRequest.returnItems.map(item => item.orderItemId);
    await this.prisma.orderItem.updateMany({
      where: {
        id: { in: orderItemIds },
      },
      data: {
        isReturned: true,
        returnStatus: 'refunded',
      },
    });

    // 5️⃣ Restore stock immediately (since admin approved directly)
    await this.restoreStockForReturn(returnRequest);

    // 6️⃣ Send notification to customer
    if (order.CustomerProfile?.fcmToken) {
      try {
        await this.firebaseSender.sendPush(
          order.CustomerProfile.fcmToken,
          'Return Processed',
          `Your return for order #${order.orderNumber} has been processed. Refund: ${refundAmount}`,
        );
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }

    if (order.CustomerProfile?.user?.email) {
      try {
        await this.emailService.sendMail({
          to: order.CustomerProfile.user.email,
          subject: `Return Processed - Order #${order.orderNumber}`,
          template: 'return-status-update',
          context: {
            customerName: order.CustomerProfile.name,
            orderNumber: order.orderNumber,
            status: 'Refunded',
            refundAmount,
            returnCharge,
            adminNotes: adminNotes || 'Processed directly by admin',
          },
        });
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }

    console.log('✅ Admin direct return processed:', {
      returnId: returnRequest.id,
      orderNumber: order.orderNumber,
      refundAmount,
      returnCharge,
    });

    return {
      message: 'Return processed successfully by admin',
      data: returnRequest,
    };
  }
}
