import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminCustomerFilterDto } from './dto/admin-customer-filter.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 🔹 Admin: Get all customers with order statistics
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/customers')
  getAdminCustomers(@Query() query: AdminCustomerFilterDto) {
    return this.usersService.getAdminCustomers(query);
  }
}
