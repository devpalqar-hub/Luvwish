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

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseSender: FirebaseSender,
    private readonly emailService: MailService,
  ) {}

  /**
   * Create a new return request
   */
  async createReturn(dto: CreateReturnDto, customerProfileId: string) {
    // 1️⃣ Fetch order with details
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        customerProfileId,
        status: 'delivered', // Only delivered orders can be returned
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
      },
    });

    if (!order) {
      throw new NotFoundException(
        'Order not found or not eligible for return (must be delivered)',
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

    // 3️⃣ Check if return already exists
    const existingReturn = await this.prisma.return.findFirst({
      where: { orderId: dto.orderId },
    });

    if (existingReturn) {
      throw new BadRequestException('Return request already exists for this order');
    }

    // 4️⃣ Calculate refund amount
    let refundAmount = 0;
    const returnFee = Number(order.shippingCost); // Return fee = delivery charge

    if (dto.returnType === 'full') {
      // Full order return
      refundAmount = Number(order.totalAmount) - returnFee;
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
        refundMethod: dto.refundMethod,
        status: 'pending',
        returnItems:
          dto.returnType === 'partial' && dto.items
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
            returnType: dto.returnType,
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

    // 3️⃣ Update return status
    const updated = await this.prisma.return.update({
      where: { id: returnId },
      data: {
        status: dto.status,
        adminNotes: dto.adminNotes || returnRequest.adminNotes,
        updatedAt: new Date(),
      },
    });

    // 4️⃣ If status is 'returned', handle inventory and refund
    if (dto.status === 'returned') {
      await this.handleReturnedItems(returnRequest);
    }

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

    if (returnRequest.customerProfile?.user?.email) {
      try {
        await this.emailService.sendMail({
          to: returnRequest.customerProfile.user.email,
          subject: `Return Update - Order #${returnRequest.order.orderNumber}`,
          template: 'return-status-update',
          context: {
            customerName: returnRequest.customerProfile.name,
            orderNumber: returnRequest.order.orderNumber,
            status: dto.status,
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
  private async handleReturnedItems(returnRequest: any) {
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
        } else {
          await this.prisma.product.update({
            where: { id: orderItem.productId },
            data: {
              stockCount: {
                increment: returnItem.quantity,
              },
            },
          });
        }
      }
    }

    // Update order status to refunded
    await this.prisma.order.update({
      where: { id: returnRequest.orderId },
      data: {
        status: 'refunded',
        paymentStatus: 'refunded',
      },
    });
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
}
