import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SalesProgressQueryDto, SalesPeriod } from './dto/sales-progress-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';


@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  // Admin - Get sales progress graph data
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'STORE_MANAGER')
  @Get('sales-progress')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get sales progress data',
    description: 'Returns sales trend data grouped by requested period for dashboard charting.',
  })
  @ApiQuery({ name: 'period', required: false, enum: SalesPeriod, description: 'Analytics period' })
  @ApiOkResponse({ description: 'Sales progress data returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN, SUPER_ADMIN, or STORE_MANAGER role' })
  async getSalesProgress(@Query() query: SalesProgressQueryDto) {
    const period = query.period || SalesPeriod.LAST_MONTH;
    return this.analyticsService.getSalesProgress(period);
  }
}

