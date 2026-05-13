// review.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateMockReviewDto } from './dto/create-mock-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ListReviewsFilterDto } from './dto/list-reviews-filter.dto';
import { PaginationResponseDto } from 'src/pagination/pagination-response.dto';

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
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // If NOT admin, enforce ownership check
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      const customerProfile = await this.prisma.customerProfile.findUnique({
        where: { userId },
      });

      if (!customerProfile || review.customerProfileId !== customerProfile.id) {
        throw new ForbiddenException('You cannot delete this review');
      }
    }

    return this.prisma.review.delete({
      where: { id },
    });
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

  async createMockReview(dto: CreateMockReviewDto) {
    // Validate that the product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment,
        productId: dto.productId,
        isMock: true,
        mockReviewerName: dto.reviewerName,
        images: {
          create: dto.images?.map((url) => ({ url })) || [],
        },
      },
      include: {
        images: true,
      },
    });
  }

  async listAllReviews(filters: ListReviewsFilterDto) {
    const where: any = {};

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.customerProfileId) {
      where.customerProfileId = filters.customerProfileId;
    }

    if (filters.isMock !== undefined) {
      where.isMock = filters.isMock;
    }

    // Exact rating takes priority over range
    if (filters.rating) {
      where.rating = filters.rating;
    } else {
      if (filters.minRating || filters.maxRating) {
        where.rating = {};
        if (filters.minRating) where.rating.gte = filters.minRating;
        if (filters.maxRating) where.rating.lte = filters.maxRating;
      }
    }

    if (filters.search) {
      where.OR = [
        { comment: { contains: filters.search } },
        { mockReviewerName: { contains: filters.search } },
      ];
    }

    const sortField = ['createdAt', 'rating'].includes(filters.sortBy)
      ? filters.sortBy
      : 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        include: {
          images: true,
          product: {
            select: {
              id: true,
              name: true,
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
            },
          },
          customerProfile: {
            select: {
              id: true,
              name: true,
              profilePicture: true,
            },
          },
        },
        skip: filters.skip,
        take: filters.limit,
        orderBy: { [sortField]: sortOrder },
      }),
      this.prisma.review.count({ where }),
    ]);

    return new PaginationResponseDto(data, total, filters.page, filters.limit);
  }
}
