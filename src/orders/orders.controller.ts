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
} from '@nestjs/common';
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
  findAll(@Query() pagination: PaginationDto, @Request() req) {
    const profile_id = req.user.id;
    return this.ordersService.findAll(pagination, profile_id);
  }

  @Get('user/:userId')
  findByUser(@Param('profile_id') profile_id: string) {
    return this.ordersService.findByUser(profile_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOneOrder(@Param('id') id: string, @Request() req) {
    const profile_id = req.user.id;
    return this.ordersService.findOneOrder(id, profile_id);
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
    return this.ordersService.adminFindAll(Object.assign(paginationDto, {
      search,
      status,
      startDate,
      endDate,
    }));
  }

}


// order post 
// ordres get
