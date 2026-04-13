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
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
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

  @Post()
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Create a new order with items from cart. Cart items are cleared after order creation.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    schema: {
      example: {
        id: 'uuid',
        orderNumber: 'ORD-2026-001',
        customerId: 'uuid',
        items: [],
        totalAmount: 4999.99,
        status: 'pending',
        createdAt: '2026-02-16T10:30:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid order data or cart items unavailable' })
  @ApiConflictResponse({ description: 'Product out of stock' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get user orders',
    description: 'Retrieve all orders of the authenticated user with optional filtering by status.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    description: 'Filter by order status',
  })
  @ApiResponse({
    status: 200,
    description: 'User orders retrieved',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findAll(@Query() query: PaginationDto, @Request() req) {
    return this.ordersService.findAll(
      query,
      req.user.id,
      query.status,
    );
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get orders by user ID',
    description: 'Retrieve all orders for a specific user (Admin endpoint).',
  })
  @ApiParam({ name: 'userId', type: 'string', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User orders' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findByUser(@Param('profile_id') profile_id: string) {
    return this.ordersService.findByUser(profile_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get order details',
    description: 'Retrieve detailed information about a specific order.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Order details',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Forbidden - Customers can only view their own orders' })
  findOneOrder(@Param('id') id: string) {
    return this.ordersService.findOneOrder(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @Patch(':id/cancel')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Cancel order',
    description: 'Cancel an order. Only possible if order is in pending or confirmed status.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Cannot cancel this order' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  cancelOrder(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.sub;
    return this.ordersService.cancelOrder(id, userId, false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @Patch('admin/:id/cancel')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Cancel order (Admin)',
    description: 'Admin can cancel any order regardless of status.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  adminCancelOrder(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id, null, true);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update order details',
    description: 'Update order information (Admin endpoint).',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID (UUID)' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order updated',
  })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete order',
    description: 'Delete an order (Admin endpoint). Soft delete is performed.',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Order deleted',
  })
  @ApiNotFoundResponse({ description: 'Order not found' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @Patch(':id/status')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update order status',
    description: 'Update the status of an order. Triggers notifications to customer.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Order ID (UUID)',
  })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  updateOrderStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @Get('admin/dashboard')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get all orders (Admin)',
    description: 'Retrieve all orders with advanced filtering options. Admin endpoint.',
  })
  @ApiQuery({ name: 'page', required: false, type: 'number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiQuery({ name: 'search', required: false, type: 'string', description: 'Search by order number or customer name' })
  @ApiQuery({ name: 'status', required: false, type: 'string', description: 'Filter by order status' })
  @ApiQuery({ name: 'startDate', required: false, type: 'string', description: 'Filter by start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: 'string', description: 'Filter by end date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'All orders with pagination',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
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
  @Get('admin/analytics')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get order analytics and aggregates',
    description: 'Get order statistics, revenue, and aggregates with filters.',
  })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'subCategoryId', required: false, description: 'Filter by subcategory' })
  @ApiQuery({ name: 'paymentMethod', required: false, description: 'Filter by payment method' })
  @ApiQuery({ name: 'paymentStatus', required: false, description: 'Filter by payment status' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'customerProfileId', required: false, description: 'Filter by customer' })
  @ApiResponse({
    status: 200,
    description: 'Order analytics and statistics',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
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
  async assignDeliveryPartner(
    @Param('orderId') orderId: string,
    @Body('deliveryPartnerId') deliveryPartnerId: string,
    @Body('notes') notes: string
  ) {
    return this.ordersService.assignDeliveryPartner(orderId, deliveryPartnerId, notes);
  }

  @Get('check/delivery')
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

