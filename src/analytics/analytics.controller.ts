import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SalesProgressQueryDto, SalesPeriod } from './dto/sales-progress-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Admin - Get sales progress graph data
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER')
  @Get('sales-progress')
  async getSalesProgress(@Query() query: SalesProgressQueryDto) {
    const period = query.period || SalesPeriod.LAST_MONTH;
    return this.analyticsService.getSalesProgress(period);
  }
}

