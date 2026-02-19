import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-orders.dto';
import { UpdateOrderDto } from './dto/update-orders.dto';
import { OrderStatus } from '@prisma/client';
import { PaginationResponseDto } from 'src/pagination/pagination-response.dto';
import { PaginationDto } from 'src/pagination/dto/pagination.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderAggregatesFilterDto } from './dto/order-aggregates-filter.dto';
import * as ExcelJS from 'exceljs';
import { MailService } from 'src/mail/mail.service';
import { FirebaseSender } from 'src/firebase/firebase.sender';
import { BulkUpdateOrderStatusDto } from './dto/update-bulk-orders.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private readonly emailService: MailService,
    private readonly firebaseSender: FirebaseSender
  ) { }

  /**
   * Get next delivery partner in round-robin rotation
   */
  private async getNextDeliveryPartner(): Promise<string | null> {
    // Get all active delivery partners
    const deliveryPartners = await this.prisma.user.findMany({
      where: {
        role: 'DELIVERY',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        deliveryOrders: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Oldest partners first
      },
    });

    if (deliveryPartners.length === 0) {
      return null; // No delivery partners available
    }

    // Find the partner with least assigned orders (round-robin)
    const partnerWithLeastOrders = deliveryPartners.reduce((min, partner) => {
      return partner.deliveryOrders.length < min.deliveryOrders.length ? partner : min;
    });

    return partnerWithLeastOrders.id;
  }

  async create(createOrderDto: CreateOrderDto) {
    const { items, ...orderData } = createOrderDto;

    // Get next delivery partner in rotation
    const deliveryPartnerId = await this.getNextDeliveryPartner();

    const order = await this.prisma.order.create({
      data: {
        ...orderData,
        deliveryPartnerId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            actualPrice: item.actualPrice,
            discountedPrice: item.discountedPrice,
          })),
        },
      },
      include: {
        items: true,
        shippingAddress: true,
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
      },
    });

    // Send push notification to assigned delivery partner
    if (order.deliveryPartner?.AdminProfile?.fcmToken) {
      try {
        await this.firebaseSender.sendPush(
          order.deliveryPartner.AdminProfile.fcmToken,
          'New Order Assigned',
          `Order #${order.orderNumber} has been assigned to you. Total: ${order.totalAmount}`,
        );
      } catch (error) {
        console.error('Failed to send push notification to delivery partner:', error);
      }
    }

    return order;
  }

  async findAll(
    pagination: PaginationDto,
    profile_id: string,
    status?: string,
  ) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: profile_id },
    });
    if (!profile) {
      throw new NotFoundException('CustomerProfile Not Found');
    }

    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = { customerProfileId: profile.id };

    // Add status filter if provided
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          totalAmount: true,
          shippingCost: true,
          taxAmount: true,
          discountAmount: true,
          notes: true,
          razorpay_id: true,
          createdAt: true,
          updatedAt: true,
          customerProfileId: true,
          // 🚫 omit shippingAddressId
          shippingAddress: true, // ✅ include full address object
          tracking: true,
          coupun: true,
          deliveryPartner: {
            select: {
              id: true,
              email: true,
              AdminProfile: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              discountedPrice: false,
              actualPrice: false,
              isReturned: true,
              product: {
                include: {
                  images: true, // ✅ include product images
                },
              },
              productVariation: true,
              Review: {
                select: {
                  id: true,
                  rating: true,
                  comment: true,
                  createdAt: true,
                  images: {
                    select: {
                      id: true,
                      url: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: whereClause }),
    ]);

    return new PaginationResponseDto(data, total, page, limit);
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, productVariation: true } },
        coupun: true,
        shippingAddress: true,
        deliveryPartner: {
          select: {
            id: true,
            email: true,
            AdminProfile: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException(`Order with id ${id} not found`);
    return order;
  }

  async findOneOrder(orderId: string) {
    // find the order belonging to this customer
    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true,
        shippingCost: true,
        taxAmount: true,
        discountAmount: true,
        notes: true,
        razorpay_id: true,
        createdAt: true,
        updatedAt: true,
        customerProfileId: true,
        shippingAddress: true,
        tracking: true,
        coupun: true,
        deliveryPartner: {
          select: {
            id: true,
            email: true,
            AdminProfile: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            Review: true,
            isReturned: true,
            product: {
              include: {
                images: true, // ✅ include product images
                reviews: true,
              },
            },
            productVariation: true
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const { items, ...orderData } = updateOrderDto;
    await this.findOne(id); // ensure exists
    return this.prisma.order.update({
      where: { id },
      data: {
        ...orderData,
        ...(items
          ? {
            items: {
              deleteMany: {}, // clear old items
              create: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                actualPrice: item.actualPrice,
                discountedPrice: item.discountedPrice,
              })),
            },
          }
          : {}),
      },
      include: {
        items: true,
        shippingAddress: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // ensure exists
    return this.prisma.order.delete({
      where: { id },
    });
  }

  async findByUser(profile_id: string) {
    return this.prisma.order.findMany({
      where: { customerProfileId: profile_id },
      include: {
        items: true,
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Order with id ${id} not found`);
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    // 1️⃣ Ensure order exists (minimal fetch)
    const existing = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        CustomerProfile: {
          select: {
            name: true,
            fcmToken: true,
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    const statusChanged =
      dto.status && dto.status !== existing.status;
    const paymentStatusChanged =
      dto.paymentStatus && dto.paymentStatus !== existing.paymentStatus;

    // 2️⃣ Update order
    const updated = await this.prisma.trackingDetail.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
      },
    });

    // 3️⃣ Send mail ONLY if something changed
    if ((statusChanged || paymentStatusChanged) && existing.CustomerProfile?.user?.email) {
      await this.emailService.sendMail({
        to: existing.CustomerProfile.user.email,
        subject: `Order Update – ${existing.orderNumber}`,
        template: 'order-status-update',
        context: {
          customerName: existing.CustomerProfile.name,
          orderNumber: existing.orderNumber,

          oldStatus: statusChanged ? existing.status : null,
          newStatus: statusChanged ? dto.status : null,

          oldPaymentStatus: paymentStatusChanged
            ? existing.paymentStatus
            : null,
          newPaymentStatus: paymentStatusChanged
            ? dto.paymentStatus
            : null,
        },
      });
      await this.firebaseSender.sendPush(
        existing.CustomerProfile.fcmToken,
        'Order Status Updated',
        `Your order ${existing.orderNumber} is now ${dto.status}`,
      );
    }

    return {
      message: 'Order updated successfully',
      data: updated,
    };
  }

  /**
   * Update order status by delivery partner (only for their assigned orders)
   */
  async updateOrderStatusByDeliveryPartner(
    orderId: string,
    deliveryPartnerId: string,
    dto: UpdateOrderStatusDto,
  ) {
    // 1️⃣ Ensure order exists and is assigned to this delivery partner
    const existing = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        deliveryPartnerId: deliveryPartnerId,
      },
      include: {
        CustomerProfile: {
          select: {
            name: true,
            fcmToken: true,
            user: {
              select: { email: true },
            },
          },
        },
        deliveryPartner: {
          select: {
            AdminProfile: {
              select: {
                name: true,
              },
            },
          },
        },
        tracking: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        'Order not found or not assigned to you',
      );
    }

    if (!existing.tracking) {
      throw new NotFoundException('Tracking details not found for this order');
    }

    const previousTrackingStatus = existing.tracking.status;
    const previousOrderStatus = existing.status;
    const statusChanged = dto.status && dto.status !== previousTrackingStatus;
    const paymentStatusChanged =
      dto.paymentStatus && dto.paymentStatus !== existing.paymentStatus;

    console.log('🚚 Delivery Partner Status Update:', {
      orderId,
      deliveryPartnerId,
      previousTrackingStatus,
      newTrackingStatus: dto.status,
      previousOrderStatus,
      paymentStatusChanged,
    });

    let updated = existing.tracking;
    let updatedOrder = existing;

    // 2️⃣ Update tracking details with status history and order status in a transaction
    if (dto.status || dto.paymentStatus) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          let trackingUpdate = existing.tracking;
          let orderUpdate = existing;

          // Update tracking if status provided
          if (dto.status) {
            // Get existing status history or initialize
            const statusHistory = (existing.tracking.statusHistory as any[]) || [];

            // Add new status to history
            const newHistoryEntry = {
              status: dto.status,
              timestamp: new Date().toISOString(),
              notes: `Updated by delivery partner`,
            };
            statusHistory.push(newHistoryEntry);

            // Update tracking detail with status history
            trackingUpdate = await tx.trackingDetail.update({
              where: { orderId },
              data: {
                status: dto.status,
                statusHistory,
                lastUpdatedAt: new Date(),
              },
            });

            console.log('✅ Tracking updated:', {
              orderId,
              newStatus: dto.status,
              historyLength: statusHistory.length,
            });

            // Sync order status based on tracking status
            const orderStatus = this.mapTrackingToOrderStatus(dto.status);
            if (orderStatus) {
              orderUpdate = await tx.order.update({
                where: { id: orderId },
                data: {
                  status: orderStatus as any,
                  ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
                },
              });

              console.log('✅ Order status synced:', {
                orderId,
                trackingStatus: dto.status,
                orderStatus: orderStatus,
              });
            }
          } else if (dto.paymentStatus) {
            // Only update payment status if no tracking status change
            orderUpdate = await tx.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: dto.paymentStatus,
              },
            });
          }

          return { trackingUpdate, orderUpdate };
        });

        updated = result.trackingUpdate;
        updatedOrder = result.orderUpdate;
      } catch (error) {
        console.error('❌ Error updating tracking/order status:', error);
        throw error;
      }
    }

    // 3️⃣ Send notifications to customer
    if (
      (statusChanged || paymentStatusChanged) &&
      existing.CustomerProfile?.user?.email
    ) {
      const deliveryPartnerName =
        existing.deliveryPartner?.AdminProfile?.name || 'Delivery Partner';

      try {
        // Send email notification
        await this.emailService.sendMail({
          to: existing.CustomerProfile.user.email,
          subject: `Order Tracking Update – ${existing.orderNumber}`,
          template: 'order-tracking-update',
          context: {
            customerName: existing.CustomerProfile.name,
            orderNumber: existing.orderNumber,
            deliveryPartnerName,
            oldStatus: statusChanged ? previousTrackingStatus : null,
            newStatus: statusChanged ? dto.status : null,
            oldPaymentStatus: paymentStatusChanged
              ? existing.paymentStatus
              : null,
            newPaymentStatus: paymentStatusChanged ? dto.paymentStatus : null,
            notes: 'Updated by delivery partner',
          },
        });

        // Send push notification
        if (existing.CustomerProfile.fcmToken) {
          await this.firebaseSender.sendPush(
            existing.CustomerProfile.fcmToken,
            'Order Tracking Updated',
            `Your order ${existing.orderNumber} is now ${dto.status || previousTrackingStatus}`,
          );
        }

        console.log('✅ Notifications sent for order', existing.orderNumber);
      } catch (error) {
        console.error('❌ Failed to send notifications:', error);
      }
    }

    return {
      message: 'Order status updated successfully',
      data: {
        tracking: updated,
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
        },
      },
    };
  }

  /**
   * Map tracking status to order status
   */
  private mapTrackingToOrderStatus(trackingStatus: any): string | null {
    const statusMap: Record<string, string> = {
      order_placed: 'confirmed',
      processing: 'processing',
      ready_to_ship: 'processing',
      shipped: 'shipped',
      in_transit: 'shipped',
      out_for_delivery: 'shipped',
      delivered: 'delivered',
      failed_delivery: 'shipped',
      return_processing: 'return_processing',
      returned: 'cancelled',
    };

    return statusMap[trackingStatus] || null;
  }



  async adminFindAll(
    pagination: PaginationDto & {
      search?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    // Build where clause dynamically
    const whereClause: any = {};

    if (pagination.search) {
      whereClause.orderNumber = {
        contains: pagination.search.toLowerCase(),
      };
    }

    if (pagination.status) {
      whereClause.status = pagination.status;
    }

    if (pagination.startDate && pagination.endDate) {
      whereClause.createdAt = {
        gte: new Date(pagination.startDate),
        lte: new Date(pagination.endDate),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          totalAmount: true,
          shippingCost: true,
          taxAmount: true,
          discountAmount: true,
          notes: true,
          razorpay_id: true,
          createdAt: true,
          updatedAt: true,
          CustomerProfile: { select: { id: true, name: true } },
          shippingAddress: true,
          tracking: true,
          coupun: true,
          deliveryPartner: {
            select: {
              id: true,
              email: true,
              AdminProfile: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              isReturned: true,
              product: {
                select: {
                  id: true,
                  name: true,

                  actualPrice: true,
                  images: true, // ✅ include product images
                },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where: whereClause }),
    ]);

    return new PaginationResponseDto(data, total, page, limit);
  }

  /**
   * Get orders assigned to a specific delivery partner
   */
  async findOrdersByDeliveryPartner(
    deliveryPartnerId: string,
    pagination: PaginationDto & {
      status?: string;
    },
  ) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = { deliveryPartnerId };

    if (pagination.status) {
      whereClause.status = pagination.status;
    }
    if (pagination.orderId) {
      whereClause.id = pagination.orderId;
    }


    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          totalAmount: true,
          shippingCost: true,
          taxAmount: true,
          discountAmount: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          CustomerProfile: {
            select: {
              id: true,
              name: true,
              phone: true,
              user: { select: { email: true } },
            },
          },
          shippingAddress: true,
          tracking: true,
          items: {
            select: {
              id: true,
              quantity: true,
              isReturned: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
              productVariation: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where: whereClause }),
    ]);

    return new PaginationResponseDto(data, total, page, limit);
  }

  async cancelOrder(
    orderId: string,
    userId: string | null,
    isAdmin: boolean = false,
  ) {
    let order;

    if (isAdmin) {
      // Admin can cancel any order
      order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
    } else {
      // User can only cancel their own orders
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      // Find customer profile
      const profile = await this.prisma.customerProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        throw new NotFoundException('Customer profile not found');
      }

      // Find the order belonging to this customer
      order = await this.prisma.order.findFirst({
        where: { id: orderId, customerProfileId: profile.id },
      });
    }

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order with status: ${order.status}`,
      );
    }

    // Update order status to cancelled
    const cancelledOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
        shippingAddress: true,
        tracking: true,
      },
    });

    // Update tracking status if exists
    const tracking = await this.prisma.trackingDetail.findUnique({
      where: { orderId },
    });

    if (tracking) {
      const statusHistory = (tracking.statusHistory as any[]) || [];
      statusHistory.push({
        status: 'returned',
        timestamp: new Date().toISOString(),
        notes: isAdmin
          ? 'Order cancelled by admin'
          : 'Order cancelled by customer',
      });

      await this.prisma.trackingDetail.update({
        where: { orderId },
        data: {
          status: 'returned',
          statusHistory,
          lastUpdatedAt: new Date(),
        },
      });
    }

    return {
      message: 'Order cancelled successfully',
      order: cancelledOrder,
    };
  }

  async getOrderAggregates(filters?: OrderAggregatesFilterDto) {
    // Build base where clause with filters
    const baseWhere: any = {};

    // Date range filter
    if (filters?.startDate && filters?.endDate) {
      baseWhere.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    // Payment method filter
    if (filters?.paymentMethod) {
      baseWhere.paymentMethod = filters.paymentMethod;
    }

    // Payment status filter
    if (filters?.paymentStatus) {
      baseWhere.paymentStatus = filters.paymentStatus;
    }

    // Customer profile filter
    if (filters?.customerProfileId) {
      baseWhere.customerProfileId = filters.customerProfileId;
    }

    // Category or subcategory filter (filter by products in order items)
    if (filters?.categoryId || filters?.subCategoryId) {
      baseWhere.items = {
        some: {
          product: {
            ...(filters.subCategoryId
              ? { subCategoryId: filters.subCategoryId }
              : {}),
            ...(filters.categoryId
              ? {
                subCategory: {
                  is: {
                    categoryId: filters.categoryId,
                  },
                },
              }
              : {}),
          },
        },
      };
    }

    const [totalOrders, processedOrders, shippedOrders, completedOrders] =
      await this.prisma.$transaction([
        // Total orders (all statuses)
        this.prisma.order.count({ where: baseWhere }),

        // Processed orders (confirmed + processing)
        this.prisma.order.count({
          where: {
            ...baseWhere,
            status: {
              in: ['confirmed', 'processing'],
            },
          },
        }),

        // Shipped orders
        this.prisma.order.count({
          where: {
            ...baseWhere,
            status: 'shipped',
          },
        }),

        // Completed orders (delivered)
        this.prisma.order.count({
          where: {
            ...baseWhere,
            status: 'delivered',
          },
        }),
      ]);

    return {
      totalOrders,
      processedOrders,
      shippedOrders,
      completedOrders,
      filters: filters || null,
    };
  }

  async exportOrdersToExcel(): Promise<Buffer> {
    const orders = await this.prisma.order.findMany({
      include: {
        CustomerProfile: {
          include: {
            user: true,
          },
        },
        shippingAddress: true,
        items: {
          include: {
            product: true,
            productVariation: true,
          },
        },
        coupun: true,
        Payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');

    worksheet.columns = [
      { header: 'Order Number', key: 'orderNumber', width: 20 },
      { header: 'Order Status', key: 'status', width: 15 },
      { header: 'Payment Status', key: 'paymentStatus', width: 18 },
      { header: 'Payment Method', key: 'paymentMethod', width: 20 },

      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Shipping Cost', key: 'shippingCost', width: 15 },
      { header: 'Tax Amount', key: 'taxAmount', width: 15 },
      { header: 'Discount Amount', key: 'discountAmount', width: 18 },

      { header: 'Customer Name', key: 'customerName', width: 20 },
      { header: 'Customer Email', key: 'customerEmail', width: 25 },
      { header: 'Customer Phone', key: 'customerPhone', width: 18 },

      { header: 'Shipping Address', key: 'shippingAddress', width: 40 },

      { header: 'Coupon', key: 'coupon', width: 15 },
      { header: 'Coupon Value', key: 'couponValue', width: 15 },

      { header: 'Items', key: 'items', width: 50 },

      { header: 'Payments', key: 'payments', width: 30 },

      { header: 'Created At', key: 'createdAt', width: 22 },
    ];

    for (const order of orders) {
      const itemsText = order.items
        .map(item => {
          const variation = item.productVariation
            ? ` (${item.productVariation.variationName})`
            : '';
          return `${item.product.name}${variation} x${item.quantity}`;
        })
        .join(', ');

      const paymentsText = order.Payment
        .map(
          p => `${p.method} - ${p.status} - ₹${p.amount.toString()}`
        )
        .join(', ');

      const shippingAddress = order.shippingAddress
        ? `${order.shippingAddress.name}, ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.postalCode}`
        : '';

      worksheet.addRow({
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,

        totalAmount: order.totalAmount.toString(),
        shippingCost: order.shippingCost.toString(),
        taxAmount: order.taxAmount.toString(),
        discountAmount: order.discountAmount.toString(),

        customerName: order.CustomerProfile?.name || '',
        customerEmail: order.CustomerProfile?.user?.email || '',
        customerPhone: order.CustomerProfile?.phone || '',

        shippingAddress,

        coupon: order.coupun?.couponName || '',
        couponValue: order.coupun?.Value || '',

        items: itemsText,
        payments: paymentsText,

        createdAt: order.createdAt.toISOString(),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }


  async checkDeliverable(postalCode: string) {
    const area = await this.prisma.deliveryCharges.findUnique({
      where: { postalCode: postalCode }
    })
    if (!area) {
      throw new NotFoundException("Cannot Deliver at this location")
    }
    return { message: "Deliverable at this location", data: area }
  }


  async testPush(token: string) {
    return this.firebaseSender.sendPush(
      token,
      'FCM Test',
      'If you see this, backend push works',
    );
  }

  /**
   * Manually assign or reassign a delivery partner to an order
   */
  async assignDeliveryPartner(orderId: string, deliveryPartnerId: string, notes: string) {
    // Verify order exists
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, totalAmount: true, deliveryPartnerId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify delivery partner exists and is active
    const deliveryPartner = await this.prisma.user.findFirst({
      where: {
        id: deliveryPartnerId,
        role: 'DELIVERY',
        isActive: true,
      },
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
    });

    if (!deliveryPartner) {
      throw new NotFoundException('Delivery partner not found or inactive');
    }

    // Update order with new delivery partner
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: { deliveryPartnerId, notes: notes },
      include: {
        deliveryPartner: {
          select: {
            id: true,
            email: true,
            AdminProfile: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // Send push notification to newly assigned delivery partner
    if (deliveryPartner?.AdminProfile?.fcmToken) {
      try {
        await this.firebaseSender.sendPush(
          deliveryPartner.AdminProfile.fcmToken,
          'Order Assigned',
          `Order #${order.orderNumber} has been assigned to you. Total: ${order.totalAmount}`,
        );
      } catch (error) {
        console.error('Failed to send push notification:', error);
      }
    }

    return {
      message: 'Delivery partner assigned successfully',
      data: updatedOrder,
    };
  }


  async bulkUpdateOrderStatusByDeliveryPartner(
    deliveryPartnerId: string,
    dto: BulkUpdateOrderStatusDto,
  ) {
    const { orderIds, status, paymentStatus } = dto;

    // 1️⃣ Fetch orders with tracking
    const orders = await this.prisma.order.findMany({
      where: {
        id: { in: orderIds },
        deliveryPartnerId,
      },
      include: {
        tracking: true,
        CustomerProfile: {
          select: {
            name: true,
            fcmToken: true,
            user: { select: { email: true } },
          },
        },
        deliveryPartner: {
          select: {
            AdminProfile: { select: { name: true } },
          },
        },
      },
    });

    if (orders.length !== orderIds.length) {
      throw new NotFoundException(
        'Some orders not found or not assigned to you',
      );
    }

    // 2️⃣ Ensure all orders have tracking
    if (orders.some(o => !o.tracking)) {
      throw new BadRequestException(
        'Some orders do not have tracking details',
      );
    }

    // 3️⃣ Validate all have same tracking status
    const currentStatus = orders[0].tracking.status;

    const invalid = orders.some(
      o => o.tracking.status !== currentStatus,
    );

    if (invalid) {
      throw new BadRequestException(
        'All selected orders must have same tracking status',
      );
    }

    // 4️⃣ Update tracking details with status history and order status in transactions
    console.log('🚚 Bulk updating orders:', {
      orderCount: orders.length,
      newTrackingStatus: status,
      paymentStatus,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        // Map tracking status to order status
        const orderStatus = this.mapTrackingToOrderStatus(status);

        for (const order of orders) {
          // Get existing status history or initialize
          const statusHistory = (order.tracking.statusHistory as any[]) || [];

          // Add new status to history
          const newHistoryEntry = {
            status,
            timestamp: new Date().toISOString(),
            notes: 'Bulk update by delivery partner',
          };
          statusHistory.push(newHistoryEntry);

          // Update tracking detail with status history
          await tx.trackingDetail.update({
            where: { orderId: order.id },
            data: {
              status,
              statusHistory,
              lastUpdatedAt: new Date(),
            },
          });

          // Update order status based on tracking status
          if (orderStatus) {
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: orderStatus as any,
                ...(paymentStatus && { paymentStatus }),
              },
            });
          } else if (paymentStatus) {
            // Only update payment status if no order status mapping
            await tx.order.update({
              where: { id: order.id },
              data: { paymentStatus },
            });
          }
        }
      });

      console.log('✅ Bulk update completed successfully');
    } catch (error) {
      console.error('❌ Error in bulk update transaction:', error);
      throw error;
    }

    // 5️⃣ Notifications (non-blocking loop)
    for (const order of orders) {
      const deliveryPartnerName =
        order.deliveryPartner?.AdminProfile?.name ||
        'Delivery Partner';

      try {
        if (order.CustomerProfile?.user?.email) {
          await this.emailService.sendMail({
            to: order.CustomerProfile.user.email,
            subject: `Order Tracking Update – ${order.orderNumber}`,
            template: 'order-tracking-update',
            context: {
              customerName: order.CustomerProfile.name,
              orderNumber: order.orderNumber,
              deliveryPartnerName,
              oldStatus: order.tracking.status,
              newStatus: status,
              oldPaymentStatus: order.paymentStatus,
              newPaymentStatus: paymentStatus,
              notes: 'Bulk update by delivery partner',
            },
          });
        }

        if (order.CustomerProfile?.fcmToken) {
          await this.firebaseSender.sendPush(
            order.CustomerProfile.fcmToken,
            'Order Tracking Updated',
            `Your order ${order.orderNumber} is now ${status}`,
          );
        }
      } catch (error) {
        console.error(`❌ Failed to send notification for order ${order.orderNumber}:`, error);
      }
    }

    console.log(`✅ Sent notifications for ${orders.length} orders`);

    return {
      message: 'Orders updated successfully',
      updatedCount: orderIds.length,
    };
  }

}
