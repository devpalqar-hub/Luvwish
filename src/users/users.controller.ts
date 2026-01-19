import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminCustomerFilterDto } from './dto/admin-customer-filter.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // 🔹 Admin: Get all customers with order statistics
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/customers')
  getAdminCustomers(@Query() query: AdminCustomerFilterDto) {
    return this.usersService.getAdminCustomers(query);
  }

  /* ==========================
    GET ALL USERS
 =========================== */
  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  getUsers() {
    return this.usersService.getUsers();
  }

  /* ==========================
     GET USER BY ID
  =========================== */
  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateUserStatus(
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(userId, dto);
  }
}
