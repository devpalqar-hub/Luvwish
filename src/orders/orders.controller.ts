import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Query,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
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
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-orders.dto';
import { UpdateOrderDto } from './dto/update-orders.dto';
import { OrderStatus } from '@prisma/client';
import { PaginationDto } from 'src/pagination/dto/pagination.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { BulkUpdateOrderStatusDto } from './dto/update-bulk-orders.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  //user
  @Post()
  @ApiOperation({ summary: 'Create order' })
  @ApiBody({ type: CreateOrderDto })
  @ApiOkResponse({ description: 'Order created successfully' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  //user
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get orders for logged-in user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiOkResponse({ description: 'Orders returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  findAll(@Query() query: PaginationDto, @Request() req) {
    return this.ordersService.findAll(
      query,
      req.user.id,
      query.status, // ✅ FIX: use query.status
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get orders by user profile id' })
  @ApiParam({ name: 'userId', description: 'User profile id' })
  @ApiOkResponse({ description: 'Orders returned successfully' })
  findByUser(@Param('profile_id') profile_id: string) {
    return this.ordersService.findByUser(profile_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single order by id' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiOkResponse({ description: 'Order returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  findOneOrder(@Param('id') id: string) {
    return this.ordersService.findOneOrder(id);
  }

  //user - cancel order
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @Patch(':id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel own order' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiOkResponse({ description: 'Order cancelled successfully' })
  cancelOrder(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.sub;
    return this.ordersService.cancelOrder(id, userId, false);
  }

  //admin - cancel any order
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @Patch('admin/:id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin cancel any order' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiOkResponse({ description: 'Order cancelled successfully' })
  adminCancelOrder(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id, null, true);
  }

  //admin
  @Patch(':id')
  @ApiOperation({ summary: 'Update order by id' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiOkResponse({ description: 'Order updated successfully' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  //admin
  @Delete(':id')
  @ApiOperation({ summary: 'Delete order by id' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiOkResponse({ description: 'Order deleted successfully' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Order id (UUID)' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiOkResponse({ description: 'Order status updated successfully' })
  @Patch(':id/status')
  updateOrderStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto);
  }


  @Get('admin/get-all')
  @ApiOperation({ summary: 'Admin list all orders with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiOkResponse({ description: 'Orders returned successfully' })
  async findAllbyAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const paginationDto = new PaginationDto();
    if (page !== undefined) paginationDto.page = Number(page);
    if (limit !== undefined) paginationDto.limit = Number(limit);
    return this.ordersService.adminFindAll(
      Object.assign(paginationDto, {
        search,
        status,
        startDate,
        endDate,
      }),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @Get('admin/aggregates')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order aggregate analytics' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'subCategoryId', required: false })
  @ApiQuery({ name: 'paymentMethod', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'customerProfileId', required: false })
  @ApiOkResponse({ description: 'Order aggregates returned successfully' })
  async getOrderAggregates(
    @Query('categoryId') categoryId?: string,
    @Query('subCategoryId') subCategoryId?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerProfileId') customerProfileId?: string,
  ) {
    return this.ordersService.getOrderAggregates({
      categoryId,
      subCategoryId,
      paymentMethod: paymentMethod as any,
      paymentStatus: paymentStatus as any,
      startDate,
      endDate,
      customerProfileId,
    });
  }

  @Get('export/data')
  @ApiOperation({ summary: 'Export orders as Excel file' })
  @ApiOkResponse({ description: 'Excel export generated successfully' })
  async exportOrders(@Res() res: Response) {
    const fileBuffer =
      await this.ordersService.exportOrdersToExcel();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DELIVERY')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get orders assigned to logged-in delivery partner' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiOkResponse({ description: 'Assigned orders returned successfully' })
  @Get('delivery-partner/my-orders')
  async getMyDeliveryOrders(@Request() req, @Query() query: PaginationDto) {
    const deliveryPartnerId = req.user.id || req.user.sub;
    return this.ordersService.findOrdersByDeliveryPartner(
      deliveryPartnerId,
      Object.assign(query, {
        status: query.status,
        orderId: query.orderId,
      }),
    );

  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER', 'DELIVERY')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually assign or reassign a delivery partner to an order' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deliveryPartnerId: {
          type: 'string',
          example: 'clx9a2k3f0001abc123xyz',
          description: 'Delivery partner ID to assign to the order',
        },
        notes: {
          type: 'string',
          example: 'delivery partner changed due to traffic issues',
          description: 'Optional notes for the delivery partner',
        },
      },
      required: ['deliveryPartnerId'],
    },
  })
  @Patch(':orderId/assign-delivery-partner')
  @ApiParam({ name: 'orderId', description: 'Order id' })
  @ApiOkResponse({ description: 'Delivery partner assigned successfully' })
  async assignDeliveryPartner(
    @Param('orderId') orderId: string,
    @Body('deliveryPartnerId') deliveryPartnerId: string,
    @Body('notes') notes: string
  ) {
    return this.ordersService.assignDeliveryPartner(orderId, deliveryPartnerId, notes);
  }

  @Get('check/delivery')
  @ApiOperation({ summary: 'Check delivery availability by postal code and amount' })
  @ApiQuery({ name: 'postalCode', required: true })
  @ApiQuery({ name: 'orderAmount', required: false })
  @ApiOkResponse({ description: 'Deliverability check completed' })
  async checkDeliverable(
    @Query('postalCode') postalCode: string,
    @Query('orderAmount') orderAmount?: string,
  ) {
    const parsedOrderAmount =
      orderAmount !== undefined && orderAmount !== ''
        ? Number(orderAmount)
        : undefined;

    return this.ordersService.checkDeliverable(
      postalCode,
      parsedOrderAmount !== undefined && !Number.isNaN(parsedOrderAmount)
        ? parsedOrderAmount
        : undefined,
    );
  }


  @Get('notification/test-push')
  @ApiOperation({ summary: 'Send test push notification' })
  @ApiQuery({ name: 'token', required: true, description: 'FCM token' })
  @ApiOkResponse({ description: 'Push notification test completed' })
  async testPush(@Query('token') token: string) {
    if (!token) {
      return { message: 'FCM token is required' };
    }

    await this.ordersService.testPush(token);
    return { message: 'Push sent' };
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DELIVERY')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Bulk update order status (Delivery Partner)',
  })
  @ApiBody({ type: BulkUpdateOrderStatusDto })
  @ApiOkResponse({ description: 'Bulk order status update completed' })
  @Patch('delivery/bulk/status')
  bulkUpdateOrderStatusByDeliveryPartner(
    @Request() req,
    @Body() dto: BulkUpdateOrderStatusDto,
  ) {
    console.log("hieee")
    console.log(dto, "Received bulk update request from delivery partner");
    const deliveryPartnerId = req.user.id || req.user.sub;

    return this.ordersService.bulkUpdateOrderStatusByDeliveryPartner(
      deliveryPartnerId,
      dto,
    );
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DELIVERY')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (Delivery Partner - only assigned orders)' })
  @ApiParam({ name: 'orderId', description: 'Order id (UUID)' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiOkResponse({ description: 'Order status updated successfully' })
  @Patch('delivery/:orderId/status')
  updateOrderStatusByDeliveryPartner(
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Request() req,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const deliveryPartnerId = req.user.id || req.user.sub;
    return this.ordersService.updateOrderStatusByDeliveryPartner(
      orderId,
      deliveryPartnerId,
      dto,
    );
  }



}

