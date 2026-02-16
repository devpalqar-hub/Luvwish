import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DeliveryPartnersService } from './delivery-partners.service';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto';
import { UpdateDeliveryPartnerDto } from './dto/update-delivery-partner.dto';
import { DeliveryPartnerAnalyticsQueryDto } from './dto/delivery-partner-analytics-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Delivery Partners')
@ApiBearerAuth()
@Controller('delivery-partners')
export class DeliveryPartnersController {
  constructor(private readonly deliveryPartnersService: DeliveryPartnersService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a delivery partner' })
  create(@Body() dto: CreateDeliveryPartnerDto) {
    return this.deliveryPartnersService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get()
  @ApiOperation({ summary: 'List delivery partners' })
  findAll() {
    return this.deliveryPartnersService.findAll();
  }


  @ApiOperation({
    summary: 'Get delivery partner analytics (Admin: pass partnerId, Delivery Partner: uses auth token)'
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY')
  @Get('analytics/stats')
  async getAnalytics(
    @Request() req,
    @Query() query: DeliveryPartnerAnalyticsQueryDto,
  ) {
    // If user is delivery partner, use their ID; if admin, use query partnerId
    const partnerId = req.user.role === 'DELIVERY'
      ? req.user.id || req.user.sub
      : query.partnerId;

    if (!partnerId) {
      throw new Error('Partner ID is required for admin users');
    }

    return this.deliveryPartnersService.getAnalytics(
      partnerId,
      query.startDate,
      query.endDate,
    );
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('analytics/orders')
  @ApiOperation({
    summary: 'Get all assigned orders for a delivery partner (Admin only - requires partnerId)'
  })
  async getAssignedOrders(@Query() query: DeliveryPartnerAnalyticsQueryDto) {
    if (!query.partnerId) {
      throw new Error('Partner ID is required');
    }

    return this.deliveryPartnersService.getAssignedOrders(
      query.partnerId,
      query.startDate,
      query.endDate,
    );
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get(':id')
  @ApiOperation({ summary: 'Get delivery partner by id' })
  findOne(@Param('id') id: string) {
    return this.deliveryPartnersService.findOne(id);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery partner' })
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryPartnerDto) {
    return this.deliveryPartnersService.update(id, dto);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete delivery partner' })
  remove(@Param('id') id: string) {
    return this.deliveryPartnersService.remove(id);
  }
}
