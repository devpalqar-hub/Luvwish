import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminCustomerFilterDto } from './dto/admin-customer-filter.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // 🔹 Admin: Get all customers with order statistics
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/customers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated customer list for admin' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({ description: 'Customers returned successfully' })
  getAdminCustomers(@Query() query: AdminCustomerFilterDto) {
    return this.usersService.getAdminCustomers(query);
  }

  // 🔹 Get customer count (with optional status filter)
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/customers/count')
  @ApiOperation({ summary: 'Get user role counts with optional active filter' })
  @ApiQuery({ name: 'isActive', required: false, description: 'true or false' })
  @ApiOkResponse({ description: 'Role counts returned successfully' })
  async getRoleCounts(
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.getUserRoleCounts(isActive);
  }


  /* ==========================
    GET ALL USERS
  =========================== */
  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({ description: 'Users returned successfully' })
  getUsers() {
    return this.usersService.getUsers();
  }

  /* ==========================
     GET USER BY ID
  =========================== */
  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id', description: 'User id' })
  @ApiOkResponse({ description: 'User returned successfully' })
  getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user status' })
  @ApiParam({ name: 'id', description: 'User id' })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiOkResponse({ description: 'User status updated successfully' })
  updateUserStatus(
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(userId, dto);
  }
  @Post('fcm-token/users/')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save customer FCM token' })
  @ApiBody({ schema: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] } })
  @ApiOkResponse({ description: 'Customer FCM token saved successfully' })
  async saveCustomerFcmToken(
    @Req() req,
    @Body('token') token: string,
  ) {
    return this.usersService.saveCustomerFcmToken(
      req.user.id || req.user.sub,
      token,
    );
  }

  @Post('fcm-token/admin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save admin FCM token' })
  @ApiBody({ schema: { type: 'object', properties: { token: { type: 'string' } }, required: ['token'] } })
  @ApiOkResponse({ description: 'Admin FCM token saved successfully' })
  async saveAdminFcmToken(
    @Req() req,
    @Body('token') token: string,
  ) {
    return this.usersService.saveAdminFcmToken(
      req.user.id || req.user.sub,
      token,
    );
  }
}
