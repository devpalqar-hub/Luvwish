import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWishlistDto } from './dto/wishlist.dto';
import { PaginationDto } from 'src/pagination/dto/pagination.dto';
import { PaginationResponseDto } from 'src/pagination/pagination-response.dto';
@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) { }

  async addToWishlist(dto: CreateWishlistDto, userId: string) {
    const { productId, productVariationId } = dto;

    // 1️⃣ Customer profile
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    // --------------------------------------------------
    // CASE A: ADD PRODUCT VARIATION TO WISHLIST
    // --------------------------------------------------
    if (productVariationId) {
      const variation = await this.prisma.productVariation.findFirst({
        where: {
          id: productVariationId,
        },
        include: { product: true },
      });

      if (!variation) {
        throw new NotFoundException('Product variation not found or inactive');
      }

      try {
        return await this.prisma.wishlist.create({
          data: {
            customerProfileId: customerProfile.id,
            productVariationId,
            productId: variation.productId
          },
          include: {
            productVariation: {
              include: { product: true },
            },
          },
        });
      } catch (err) {
        if (err.code === 'P2002') {
          throw new ConflictException(
            'Product variation already exists in wishlist',
          );
        }
        throw err;
      }
    }

    // --------------------------------------------------
    // CASE B: ADD PRODUCT (NO VARIATIONS)
    // --------------------------------------------------
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        variations: {
          none: {}, // 🚨 prevents base product wishlist if variations exist
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Product not found, inactive, or has variations',
      );
    }

    try {
      return await this.prisma.wishlist.create({
        data: {
          customerProfileId: customerProfile.id,
          productId,
        },
        include: { product: true },
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new ConflictException('Product already exists in wishlist');
      }
      throw err;
    }
  }


  async getWishlist(userId: string, pagination: PaginationDto) {
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.wishlist.findMany({
        where: { customerProfileId: customerProfile.id, productId: { not: null } }, // ✅ correct FK
        include: {
          product: {
            include: {
              images: true, // ✅ fixed include syntax
            },
          },
        },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wishlist.count({
        where: { customerProfileId: customerProfile.id }, // ✅ correct FK
      }),
    ]);

    return new PaginationResponseDto(
      data,
      total,
      pagination.page,
      pagination.limit,
    );
  }

  async removeFromWishlist(
    id: string | null,
    userId: string,
    productId?: string,
  ) {
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    // ---------------------------------------------------
    // Resolve wishlist item
    // ---------------------------------------------------
    let item;

    // ✅ Existing behaviour (priority)
    if (id) {
      item = await this.prisma.wishlist.findFirst({
        where: {
          id,
          customerProfileId: customerProfile.id,
        },
      });
    }

    // ✅ Optional removal using productId
    if (!item && productId) {
      item = await this.prisma.wishlist.findFirst({
        where: {
          customerProfileId: customerProfile.id,
          productId,
        },
      });
    }

    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }

    // ---------------------------------------------------
    // Delete
    // ---------------------------------------------------
    return this.prisma.wishlist.delete({
      where: { id: item.id },
    });
  }

  async clearWishlist(userId: string) {
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    return this.prisma.wishlist.deleteMany({
      where: { customerProfileId: customerProfile.id }, // ✅ correct FK
    });
  }
}
