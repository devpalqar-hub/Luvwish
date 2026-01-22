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

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private readonly emailService: MailService,
    private readonly firebaseSender: FirebaseSender
  ) { }

  async create(createOrderDto: CreateOrderDto) {
    const { items, ...orderData } = createOrderDto;
    return this.prisma.order.create({
      data: {
        ...orderData,
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
      },
    });
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
          items: {
            select: {
              id: true,
              quantity: true,
              discountedPrice: false,
              actualPrice: false,
              product: {
                include: {
                  images: true, // ✅ include product images
                },
              },
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
        items: true,
        shippingAddress: true,
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
        items: {
          select: {
            id: true,
            quantity: true,
            Review: true,
            product: {
              include: {
                images: true, // ✅ include product images
                reviews: true
              },
            },
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
    const updated = await this.prisma.order.update({
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
          items: {
            select: {
              id: true,
              quantity: true,
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

  async testPush(token: string) {
    return this.firebaseSender.sendPush(
      token,
      'FCM Test',
      'If you see this, backend push works',
    );
  }
}
