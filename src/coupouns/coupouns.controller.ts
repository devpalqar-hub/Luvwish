import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { CouponService } from './coupouns.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { query } from 'express';
import { SearchFilterDto } from 'src/pagination/dto/search-filter.dto';
import { CheckCouponDto } from './dto/check-coupon.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) { }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }


  @Get()
  async findAllCoupons(
    @Query() query?: SearchFilterDto,
  ) {
    return this.couponService.findAllCoupons(query);
  }

  // GET /coupons/valid-coupons
  @Get('valid-coupons')
  async findAllValidCoupons(
    @Query() query?: SearchFilterDto,
  ) {
    return this.couponService.findAllValidCoupons(query);
  }


  // Get one
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponService.findOne(id);
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.update(id, dto);
  }

  // Delete
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('applicable-coupouns')
  findApplicableCoupons(@Request() req) {
    const profile_id = req.user.customerProfile.id;
    return this.couponService.findApplicableCoupons(profile_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('apply/coupon')
  async applyCoupon(
    @Req() req,
    @Body() dto: ApplyCouponDto,
  ) {
    return this.couponService.applyCoupon(dto, req.user.id);
  }

  @Get('name/:name')
  async getCoupon(@Param('name') name: string) {
    return this.couponService.getCouponByName(name);
  }

  @Post('check/applicability')
  async checkCoupon(@Body() dto: CheckCouponDto, @Request() req) {
    const customerProfileId = req.user.customerProfile.id;
    return this.couponService.checkApplicability(dto, customerProfileId);
  }
}


