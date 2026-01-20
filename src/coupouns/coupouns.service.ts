import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { HttpStatus } from '@nestjs/common';
import { SearchFilterDto } from 'src/pagination/dto/search-filter.dto';
import { PaginationResponseDto } from 'src/pagination/pagination-response.dto';
import { CheckCouponDto } from './dto/check-coupon.dto';
import { CoupounValueType } from '@prisma/client';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

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
  async applyCoupon(
    dto: ApplyCouponDto,
    profile_id: string,
  ) {
    const now = new Date();
    const { couponName, orderAmount } = dto;

    const coupon = await this.prisma.coupon.findUnique({
      where: { couponName: couponName },
    });

    if (!coupon) {
      throw new NotFoundException('Invalid coupon');
    }

    const validFrom = new Date(coupon.validFrom);
    const validTill = new Date(coupon.ValidTill);

    if (validFrom > now || validTill < now) {
      throw new BadRequestException('This coupon is not active');
    }

    const usageCount = await this.prisma.couponUsage.count({
      where: {
        customerProfileId: profile_id,
        couponId: coupon.id,
      },
    });

    if (usageCount >= coupon.usageLimitPerPerson) {
      throw new BadRequestException(
        'You have reached the maximum usage limit for this coupon',
      );
    }

    if (
      orderAmount !== undefined &&
      orderAmount < Number(coupon.minimumSpent)
    ) {
      throw new BadRequestException(
        `This coupon requires a minimum purchase of ${coupon.minimumSpent}`,
      );
    }

    let discount = 0;

    if (coupon.ValueType === CoupounValueType.amount) {
      discount = Number(coupon.Value);
    } else {
      if (orderAmount === undefined) {
        throw new BadRequestException(
          'Order amount required for percentage coupons',
        );
      }
      discount = (orderAmount * Number(coupon.Value)) / 100;
    }

    const finalAmount =
      orderAmount !== undefined
        ? Math.max(orderAmount - discount, 0)
        : undefined;

    return {
      message: 'Coupon applied successfully',
      discount,
      finalAmount,
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


  async checkApplicability(dto: CheckCouponDto, customerProfileId: string) {
    const { couponName, cartAmount } = dto;

    const coupon = await this.prisma.coupon.findFirst({
      where: { couponName: couponName },
      include: { usages: true },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    const now = new Date();

    // Date validation
    if (
      now < new Date(coupon.validFrom) ||
      now > new Date(coupon.ValidTill)
    ) {
      throw new BadRequestException('Coupon is expired or not active yet');
    }

    // Minimum spend check
    if (cartAmount < Number(coupon.minimumSpent)) {
      throw new BadRequestException(
        `Minimum cart value should be ${coupon.minimumSpent}`,
      );
    }

    // Global usage limit
    if (coupon.usages.length >= coupon.usedByCount) {
      throw new BadRequestException('Coupon usage limit exceeded');
    }

    // Per-user usage limit
    if (customerProfileId) {
      const userUsageCount = coupon.usages.filter(
        (u) => u.customerProfileId === customerProfileId,
      ).length;

      if (userUsageCount >= coupon.usageLimitPerPerson) {
        throw new BadRequestException(
          'Coupon usage limit exceeded for this user',
        );
      }
    }

    // Calculate discount
    let discountAmount = 0;

    if (coupon.ValueType === 'percentage') {
      discountAmount =
        (cartAmount * Number(coupon.Value)) / 100;
    } else {
      discountAmount = Number(coupon.Value);
    }

    const finalPayableAmount = Math.max(
      cartAmount - discountAmount,
      0,
    );

    return {
      isApplicable: true,
      discountType: coupon.ValueType,
      discountValue: discountAmount,
      finalPayableAmount,
      message: 'Coupon is applicable',
    };
  }


}
