import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { RecentOrdersFilterDto } from './dto/recent-orders-filter.dto';
import { TopProductsFilterDto } from './dto/top-products-filter.dto';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  // 🔹 Admin: Get dashboard analytics with optional date filters
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin dashboard analytics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOkResponse({ description: 'Admin dashboard metrics returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN or SUPER_ADMIN role' })
  getAdminDashboard(@Query() filters: DashboardFilterDto) {
    return this.dashboardService.getAdminDashboard(filters);
  }

  // 🔹 Admin: Get recent orders (latest to old)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('recent-orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent orders for dashboard' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOkResponse({ description: 'Recent orders returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN or SUPER_ADMIN role' })
  getRecentOrders(@Query() filters: RecentOrdersFilterDto) {
    return this.dashboardService.getRecentOrders(filters);
  }

  // 🔹 Admin: Get top products by sales
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('top-products')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get top selling products for dashboard' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOkResponse({ description: 'Top products returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN or SUPER_ADMIN role' })
  getTopProducts(@Query() filters: TopProductsFilterDto) {
    return this.dashboardService.getTopProducts(filters);
  }

  @Get('total')
  @ApiOperation({ summary: 'Get total revenue summary' })
  @ApiOkResponse({ description: 'Total revenue returned successfully' })
  async getTotalRevenue() {
    return await this.dashboardService.getTotalRevenue();
  }
}
