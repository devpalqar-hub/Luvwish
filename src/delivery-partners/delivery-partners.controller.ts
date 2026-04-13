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
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
  @ApiBody({ type: CreateDeliveryPartnerDto })
  @ApiOkResponse({ description: 'Delivery partner created successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN or SUPER_ADMIN role' })
  create(@Body() dto: CreateDeliveryPartnerDto) {
    return this.deliveryPartnersService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY')
  @Get()
  @ApiOperation({ summary: 'List delivery partners' })
  @ApiOkResponse({ description: 'Delivery partners returned successfully' })
  findAll() {
    return this.deliveryPartnersService.findAll();
  }


  @ApiOperation({
    summary: 'Get delivery partner analytics (Admin: pass partnerId, Delivery Partner: uses auth token)'
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY')
  @Get('analytics/stats')
  @ApiQuery({ name: 'partnerId', required: false, description: 'Required for admin role' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOkResponse({ description: 'Analytics returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN, SUPER_ADMIN, or DELIVERY role' })
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
  @ApiQuery({ name: 'partnerId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOkResponse({ description: 'Assigned orders returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN or SUPER_ADMIN role' })
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
  @Roles('DELIVERY')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get delivery agent actions' })
  @Get('my/actions')
  @ApiOkResponse({ description: 'Delivery actions returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires DELIVERY role' })
  async getDeliveryActions(@Request() req) {
    const deliveryPartnerId = req.user.id || req.user.sub;
    return this.deliveryPartnersService.getDeliveryPartnerActions(deliveryPartnerId);
  }



  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get(':id')
  @ApiOperation({ summary: 'Get delivery partner by id' })
  @ApiParam({ name: 'id', description: 'Delivery partner id' })
  @ApiOkResponse({ description: 'Delivery partner returned successfully' })
  findOne(@Param('id') id: string) {
    return this.deliveryPartnersService.findOne(id);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery partner' })
  @ApiParam({ name: 'id', description: 'Delivery partner id' })
  @ApiBody({ type: UpdateDeliveryPartnerDto })
  @ApiOkResponse({ description: 'Delivery partner updated successfully' })
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryPartnerDto) {
    return this.deliveryPartnersService.update(id, dto);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete delivery partner' })
  @ApiParam({ name: 'id', description: 'Delivery partner id' })
  @ApiOkResponse({ description: 'Delivery partner deleted successfully' })
  remove(@Param('id') id: string) {
    return this.deliveryPartnersService.remove(id);
  }
}
