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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) { }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create coupon' })
  @ApiBody({ type: CreateCouponDto })
  @ApiOkResponse({ description: 'Coupon created successfully' })
  create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }


  @Get()
  @ApiOperation({ summary: 'List all coupons' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOkResponse({ description: 'Coupons returned successfully' })
  async findAllCoupons(
    @Query() query?: SearchFilterDto,
  ) {
    return this.couponService.findAllCoupons(query);
  }

  // GET /coupons/valid-coupons
  @Get('valid-coupons')
  @ApiOperation({ summary: 'List valid coupons' })
  @ApiOkResponse({ description: 'Valid coupons returned successfully' })
  async findAllValidCoupons(
    @Query() query?: SearchFilterDto,
  ) {
    return this.couponService.findAllValidCoupons(query);
  }


  // Get one
  @Get(':id')
  @ApiOperation({ summary: 'Get coupon by id' })
  @ApiParam({ name: 'id', description: 'Coupon id' })
  @ApiOkResponse({ description: 'Coupon returned successfully' })
  findOne(@Param('id') id: string) {
    return this.couponService.findOne(id);
  }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update coupon by id' })
  @ApiParam({ name: 'id', description: 'Coupon id' })
  @ApiBody({ type: UpdateCouponDto })
  @ApiOkResponse({ description: 'Coupon updated successfully' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.update(id, dto);
  }

  // Delete
  @Delete(':id')
  @ApiOperation({ summary: 'Delete coupon by id' })
  @ApiParam({ name: 'id', description: 'Coupon id' })
  @ApiOkResponse({ description: 'Coupon deleted successfully' })
  remove(@Param('id') id: string) {
    return this.couponService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('applicable-coupouns')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get applicable coupons for current user' })
  @ApiOkResponse({ description: 'Applicable coupons returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  findApplicableCoupons(@Request() req) {
    const profile_id = req.user.customerProfile.id;
    return this.couponService.findApplicableCoupons(profile_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('apply/coupon')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply coupon for current user' })
  @ApiBody({ type: ApplyCouponDto })
  @ApiOkResponse({ description: 'Coupon applied successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async applyCoupon(
    @Req() req,
    @Body() dto: ApplyCouponDto,
  ) {
    return this.couponService.applyCoupon(dto, req.user.id);
  }

  @Get('name/:name')
  @ApiOperation({ summary: 'Get coupon by name' })
  @ApiParam({ name: 'name', description: 'Coupon code/name' })
  @ApiOkResponse({ description: 'Coupon returned successfully' })
  async getCoupon(@Param('name') name: string) {
    return this.couponService.getCouponByName(name);
  }

  @Post('check/applicability')
  @ApiOperation({ summary: 'Check coupon applicability for customer' })
  @ApiBody({ type: CheckCouponDto })
  @ApiOkResponse({ description: 'Coupon applicability checked successfully' })
  async checkCoupon(@Body() dto: CheckCouponDto, @Request() req) {
    const customerProfileId = req.user.customerProfile.id;
    return this.couponService.checkApplicability(dto, customerProfileId);
  }
}


