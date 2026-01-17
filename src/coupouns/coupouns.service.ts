import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { HttpStatus } from '@nestjs/common';
import { SearchFilterDto } from 'src/pagination/dto/search-filter.dto';
import { PaginationResponseDto } from 'src/pagination/pagination-response.dto';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) { }

  // Add coupon
  async create(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: dto,
    });
  }

  async findAllCoupons(query: SearchFilterDto) {
    const { search, limit = 10, page = 1 } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
        OR: [
          { couponName: { contains: search } },
          { Value: { contains: search } },
        ],
      }
      : {};

    const [coupons, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return new PaginationResponseDto(coupons, total, page, limit);
  }

  async findAllValidCoupons(query: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where = {
      AND: [
        search
          ? {
            OR: [
              { couponName: { contains: search, mode: 'insensitive' } },
              { Value: { contains: search, mode: 'insensitive' } },
            ],
          }
          : {},
        {
          validFrom: { lte: new Date().toISOString() },
        },
        {
          ValidTill: { gte: new Date().toISOString() },
        },
      ],
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get single coupon
  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  // Update coupon (PATCH)
  async update(id: string, dto: UpdateCouponDto) {
    await this.findOne(id); // ensure exists
    return this.prisma.coupon.update({
      where: { id },
      data: dto,
    });
  }

  // Delete coupon
  async remove(id: string) {
    await this.findOne(id); // ensure exists
    return this.prisma.coupon.delete({
      where: { id },
    });
  }

  async findApplicableCoupons(profile_id: string) {
    // check if the user is new (no orders yet)
    const newUser =
      (await this.prisma.order.count({
        where: { customerProfileId: profile_id },
      })) === 0;

    // get all coupons (no `is_valid` in schema, so we check validity by dates)
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const applicableCoupons = [];

    for (const coupon of coupons) {
      // convert string dates to Date
      const validFrom = new Date(coupon.validFrom);
      const validTill = new Date(coupon.ValidTill);

      // skip expired or not yet active coupons
      if (validFrom > now || validTill < now) continue;

      // check how many times this profile used this coupon
      const usageCount = await this.prisma.couponUsage.count({
        where: {
          customerProfileId: profile_id,
          couponId: coupon.id,
        },
      });

      if (usageCount < coupon.usageLimitPerPerson) {
        applicableCoupons.push({
          ...coupon,
          remaining_uses: coupon.usageLimitPerPerson - usageCount,
          isNewUserOnly: coupon.couponName.toLowerCase().includes('first'),
          isActive: true,
        });
      }
    }

    return applicableCoupons;
  }

  // 2. Apply a coupon
  async applyCoupon(
    profile_id: string,
    coupon_id: string,
    orderAmount?: number,
  ) {
    const now = new Date();

    // find coupon
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: coupon_id },
    });

    if (!coupon) {
      throw new Error('Invalid coupon');
    }

    // validate active period
    const validFrom = new Date(coupon.validFrom);
    const validTill = new Date(coupon.ValidTill);

    if (validFrom > now || validTill < now) {
      throw new Error('This coupon is not active');
    }

    // check usage count
    const usageCount = await this.prisma.couponUsage.count({
      where: {
        customerProfileId: profile_id,
        couponId: coupon.id,
      },
    });

    if (usageCount >= coupon.usageLimitPerPerson) {
      throw new Error(
        'You have reached the maximum usage limit for this coupon',
      );
    }

    // check minimum spent requirement
    if (orderAmount && orderAmount < Number(coupon.minimumSpent)) {
      throw new Error(
        `This coupon requires a minimum purchase of ${coupon.minimumSpent}`,
      );
    }

    // record usage
    await this.prisma.couponUsage.create({
      data: {
        customerProfileId: profile_id,
        couponId: coupon.id,
      },
    });

    // calculate discount
    let discount = 0;
    if (coupon.ValueType === 'amount') {
      discount = Number(coupon.Value);
    } else if (coupon.ValueType === 'percentage') {
      if (!orderAmount) {
        throw new Error('Order amount required for percentage coupons');
      }
      discount = (orderAmount * Number(coupon.Value)) / 100;
    }

    return {
      message: 'Coupon applied successfully',
      discount,
      status: HttpStatus.OK,
    };
  }


  async getCouponByName(couponName: string) {
    if (!couponName) {
      throw new BadRequestException('Coupon name is required');
    }

    const coupon = await this.prisma.coupon.findFirst({
      where: {
        couponName: {
          equals: couponName.trim(),
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon code');
    }

    return coupon;
  }

}
