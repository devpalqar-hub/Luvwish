import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { RecentOrdersFilterDto } from './dto/recent-orders-filter.dto';
import { TopProductsFilterDto } from './dto/top-products-filter.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  // 🔹 Admin: Get dashboard analytics with optional date filters
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin')
  getAdminDashboard(@Query() filters: DashboardFilterDto) {
    return this.dashboardService.getAdminDashboard(filters);
  }

  // 🔹 Admin: Get recent orders (latest to old)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('recent-orders')
  getRecentOrders(@Query() filters: RecentOrdersFilterDto) {
    return this.dashboardService.getRecentOrders(filters);
  }

  // 🔹 Admin: Get top products by sales
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('top-products')
  getTopProducts(@Query() filters: TopProductsFilterDto) {
    return this.dashboardService.getTopProducts(filters);
  }

  @Get('total')
  async getTotalRevenue() {
    return await this.dashboardService.getTotalRevenue();
  }
}
