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

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) { }

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

  async findAll(pagination: PaginationDto, profile_id: string) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: profile_id },
    });
    if (!profile) {
      throw new NotFoundException('CustomerProfile Not Found');
    }

    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    const whereClause = { customerProfileId: profile.id };

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

  async findOneOrder(orderId: string, profile_id: string) {
    // find customer profile
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: profile_id },
    });
    if (!profile) {
      throw new NotFoundException('CustomerProfile Not Found');
    }

    // find the order belonging to this customer
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerProfileId: profile.id },
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
            product: {
              include: {
                images: true, // ✅ include product images
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
    // ensure order exists
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Order with id ${id} not found`);

    // update
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
      },
      include: {
        items: true,
        shippingAddress: true,
      },
    });

    return {
      message: 'Order updated successfully',
      data: updated,
    };
  }


  async adminFindAll(pagination: PaginationDto & {
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    // Build where clause dynamically
    const whereClause: any = {};

    if (pagination.search) {
      whereClause.orderNumber = {
        contains: pagination.search.toLowerCase()
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

  async cancelOrder(orderId: string, profile_id: string) {
    // Find customer profile
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId: profile_id },
    });
    if (!profile) {
      throw new NotFoundException('CustomerProfile Not Found');
    }

    // Find the order belonging to this customer
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerProfileId: profile.id },
    });

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
        notes: 'Order cancelled by customer',
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

}
