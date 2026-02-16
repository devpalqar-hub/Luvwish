import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto';
import { UpdateDeliveryPartnerDto } from './dto/update-delivery-partner.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DeliveryPartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDeliveryPartnerDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: 'DELIVERY',
        AdminProfile: {
          create: {
            name: dto.name,
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        AdminProfile: {
          select: {
            name: true,
            phone: true,
            profilePicture: true,
            notes: true,
          },
        },
      },
    });

    return { message: 'Delivery partner created successfully', data: user };
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { role: 'DELIVERY' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        AdminProfile: {
          select: {
            name: true,
            phone: true,
            profilePicture: true,
            notes: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'DELIVERY' },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        AdminProfile: {
          select: {
            name: true,
            phone: true,
            profilePicture: true,
            notes: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Delivery partner not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateDeliveryPartnerDto) {
    if (!dto.email && !dto.password && !dto.name) {
      throw new BadRequestException('No fields provided for update');
    }

    const existing = await this.prisma.user.findFirst({
      where: { id, role: 'DELIVERY' },
      select: { id: true, email: true },
    });
    if (!existing) {
      throw new NotFoundException('Delivery partner not found');
    }

    if (dto.email && dto.email !== existing.email) {
      const emailInUse = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      });
      if (emailInUse) {
        throw new ConflictException('Email already in use');
      }
    }

    const data: any = {};

    if (dto.email) {
      data.email = dto.email;
    }

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.name) {
      data.AdminProfile = {
        upsert: {
          create: { name: dto.name },
          update: { name: dto.name },
        },
      };
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        AdminProfile: {
          select: {
            name: true,
            phone: true,
            profilePicture: true,
            notes: true,
          },
        },
      },
    });

    return { message: 'Delivery partner updated successfully', data: user };
  }

  async remove(id: string) {
    const existing = await this.prisma.user.findFirst({
      where: { id, role: 'DELIVERY' },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Delivery partner not found');
    }

    await this.prisma.$transaction([
      this.prisma.adminProfile.deleteMany({ where: { userId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    return { message: 'Delivery partner deleted successfully' };
  }

  /**
   * Get analytics for a delivery partner
   * @param partnerId - Delivery partner ID
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   */
  async getAnalytics(
    partnerId: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Verify delivery partner exists
    const partner = await this.prisma.user.findFirst({
      where: { id: partnerId, role: 'DELIVERY' },
      select: {
        id: true,
        email: true,
        isActive: true,
        AdminProfile: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException('Delivery partner not found');
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const whereClause: any = {
      deliveryPartnerId: partnerId,
    };

    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }

    // Get all orders for this delivery partner
    const orders = await this.prisma.order.findMany({
      where: whereClause,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
          },
        },
      },
    });

    // Calculate statistics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    );
    const totalItems = orders.reduce(
      (sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );

    // Group by status
    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by payment status
    const ordersByPaymentStatus = orders.reduce((acc, order) => {
      acc[order.paymentStatus] = (acc[order.paymentStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate completed orders (delivered status)
    const completedOrders = orders.filter(
      (order) => order.status === 'delivered',
    ).length;
    const completedRevenue = orders
      .filter((order) => order.status === 'delivered')
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

    // Recent orders (last 10)
    const recentOrders = orders
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
      }));

    return {
      partner: {
        id: partner.id,
        email: partner.email,
        name: partner.AdminProfile?.name,
        isActive: partner.isActive,
      },
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        totalOrders,
        totalRevenue,
        totalItems,
        completedOrders,
        completedRevenue,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
      ordersByStatus,
      ordersByPaymentStatus,
      recentOrders,
    };
  }

  /**
   * Get all assigned orders for a delivery partner (admin use)
   * @param partnerId - Delivery partner ID
   * @param startDate - Optional start date for filtering
   * @param endDate - Optional end date for filtering
   */
  async getAssignedOrders(
    partnerId: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Verify delivery partner exists
    const partner = await this.prisma.user.findFirst({
      where: { id: partnerId, role: 'DELIVERY' },
      select: {
        id: true,
        email: true,
        AdminProfile: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException('Delivery partner not found');
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const whereClause: any = {
      deliveryPartnerId: partnerId,
    };

    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }

    // Get all orders with details
    const orders = await this.prisma.order.findMany({
      where: whereClause,
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
        createdAt: true,
        updatedAt: true,
        CustomerProfile: {
          select: {
            name: true,
            phone: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        shippingAddress: true,
        tracking: {
          select: {
            status: true,
            trackingNumber: true,
            lastUpdatedAt: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            discountedPrice: true,
            actualPrice: true,
            product: {
              select: {
                id: true,
                name: true,
                images: {
                  where: { isMain: true },
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });

    return {
      partner: {
        id: partner.id,
        email: partner.email,
        name: partner.AdminProfile?.name,
      },
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      totalOrders: orders.length,
      orders,
    };
  }
}
