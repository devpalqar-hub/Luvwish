// review.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateReviewDto, user) {
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId: user },
    });

    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    // 1️⃣ Validate order ownership and that it contains the product
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        customerProfileId: customerProfile.id,
        status: 'delivered', // ✅ only delivered orders can be reviewed
        items: {
          some: {
            productId: dto.productId,
          },
        },
      },
      include: {
        items: {
          where: {
            productId: dto.productId,
          },
        },
      },
    });

    if (!order || order.items.length === 0) {
      throw new ForbiddenException(
        'You can only review products from your delivered orders.',
      );
    }

    const orderItem = order.items[0];

    // 2️⃣ Check if review already exists for this product and order
    const existingReview = await this.prisma.review.findFirst({
      where: {
        orderItemId: orderItem.id,
      },
    });

    if (existingReview) {
      throw new ForbiddenException(
        'You have already reviewed this product for this order.',
      );
    }

    // 3️⃣ Create the review
    return this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment,
        productId: dto.productId,
        customerProfileId: customerProfile.id,
        orderItemId: orderItem.id, // ✅ link review to specific order item
        images: {
          create: dto.images?.map((url) => ({ url })) || [],
        },
      },
      include: {
        images: true,
        customerProfile: {
          select: {
            name: true,
            profilePicture: true,
          },
        },
      },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      include: {
        images: true,
        customerProfile: {
          select: {
            name: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async update(id: string, dto: UpdateReviewDto, userId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // If NOT admin, check ownership
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      const customerProfile = await this.prisma.customerProfile.findUnique({
        where: { userId },
      });

      if (!customerProfile || review.customerProfileId !== customerProfile.id) {
        throw new ForbiddenException('You cannot edit this review');
      }
    }

    return this.prisma.review.update({
      where: { id },
      data: {
        ...dto,
        images: dto.images
          ? {
              deleteMany: {},
              create: dto.images.map((url) => ({ url })),
            }
          : undefined,
      },
      include: { images: true },
    });
  }

  async remove(id: string, userId: string) {
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId: userId },
    });
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.customerProfileId !== customerProfile.id)
      throw new ForbiddenException('You cannot delete this review');

    return this.prisma.review.delete({ where: { id } });
  }

  // async markHelpful(id: string) {
  //     return this.prisma.review.update({
  //         where: { id },
  //         data: { helpfulCount: { increment: 1 } },
  //     });
  // }

  async getAverageRating(productId: string) {
    const result = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return {
      averageRating: result._avg.rating,
      totalReviews: result._count.rating,
    };
  }

  // 🔹 Get products user can review from their delivered orders
  async getReviewableProducts(userId: string) {
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    // Get all delivered orders for this customer
    const deliveredOrders = await this.prisma.order.findMany({
      where: {
        customerProfileId: customerProfile.id,
        status: 'delivered',
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: {
                    sortOrder: 'asc',
                  },
                  take: 1,
                },
              },
            },
            Review: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Build list of reviewable products
    const reviewableProducts = [];

    for (const order of deliveredOrders) {
      for (const item of order.items) {
        // Only include if not yet reviewed
        if (!item.Review) {
          reviewableProducts.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderDate: order.createdAt,
            productId: item.product.id,
            productName: item.product.name,
            productImage: item.product.images[0]?.url || null,
            quantity: item.quantity,
            price: Number(item.discountedPrice),
          });
        }
      }
    }

    return {
      reviewableProducts,
      total: reviewableProducts.length,
    };
  }
}
