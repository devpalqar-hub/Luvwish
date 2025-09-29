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
    const { productId } = dto;

    const product = await this.prisma.product.findFirst({
      where: { id: productId, isStock: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId }, // userId maps to the CustomerProfile
    });
    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    try {
      return await this.prisma.wishlist.create({
        data: {
          customerProfileId: customerProfile.id, // ✅ Correct FK
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
        where: { customerProfileId: customerProfile.id }, // ✅ correct FK
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


  async removeFromWishlist(id: string, userId: string) {
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    const item = await this.prisma.wishlist.findFirst({
      where: { id, customerProfileId: customerProfile.id }, // ✅ correct query
    });
    if (!item) throw new NotFoundException('Wishlist item not found');

    return this.prisma.wishlist.delete({
      where: { id }, // ✅ id is unique, safe to delete directly
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
