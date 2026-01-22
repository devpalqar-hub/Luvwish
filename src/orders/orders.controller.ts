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
import { get } from 'http';
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  //user
  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  //user
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: PaginationDto, @Request() req) {
    return this.ordersService.findAll(
      query,
      req.user.id,
      query.status, // ✅ FIX: use query.status
    );
  }

  @Get('user/:userId')
  findByUser(@Param('profile_id') profile_id: string) {
    return this.ordersService.findByUser(profile_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOneOrder(@Param('id') id: string) {
    return this.ordersService.findOneOrder(id);
  }

  //user - cancel order
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @Patch(':id/cancel')
  cancelOrder(@Param('id') id: string, @Request() req) {
    const userId = req.user.id || req.user.sub;
    return this.ordersService.cancelOrder(id, userId, false);
  }

  //admin - cancel any order
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'ORDER_MANAGER')
  @Patch('admin/:id/cancel')
  adminCancelOrder(@Param('id') id: string) {
    return this.ordersService.cancelOrder(id, null, true);
  }

  //admin
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  //admin
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'DELIVERY')
  @Patch(':id/status')
  updateOrderStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto);
  }

  @Get('admin/get-all')
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
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=orders.xlsx',
    );

    res.send(fileBuffer);
  }

  @Get('notification/test-push')
  async testPush(@Query('token') token: string) {
    if (!token) {
      return { message: 'FCM token is required' };
    }

    await this.ordersService.testPush(token);
    return { message: 'Push sent' };
  }
}
