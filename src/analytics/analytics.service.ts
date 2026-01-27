import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesPeriod } from './dto/sales-progress-query.dto';
import { SalesProgressResponseDto } from './dto/sales-progress-response.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) { }

  async getSalesProgress(period: SalesPeriod): Promise<SalesProgressResponseDto> {
    const now = new Date();
    let startDate: Date;
    let groupBy: 'hour' | 'day' | 'month';

    // Determine the date range and grouping based on period
    switch (period) {
      case SalesPeriod.LAST_DAY:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupBy = 'hour';
        break;
      case SalesPeriod.LAST_WEEK:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case SalesPeriod.LAST_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        groupBy = 'day';
        break;
      case SalesPeriod.LAST_YEAR:
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        groupBy = 'month';
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        groupBy = 'day';
    }

    // Fetch orders in the date range with completed payment
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group sales data by time period
    const salesMap = new Map<string, number>();

    orders.forEach((order) => {
      let key: string;
      const date = new Date(order.createdAt);

      switch (groupBy) {
        case 'hour':
          key = `${date.getHours()}:00`;
          break;
        case 'day':
          key = `${date.getDate()}/${date.getMonth() + 1}`;
          break;
        case 'month':
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          key = monthNames[date.getMonth()];
          break;
      }

      const currentAmount = salesMap.get(key) || 0;
      salesMap.set(key, currentAmount + Number(order.totalAmount));
    });

    // Generate complete xAxis labels
    const xAxis: string[] = [];
    const data: number[] = [];

    if (groupBy === 'hour') {
      for (let i = 0; i < 24; i++) {
        const label = `${i}:00`;
        xAxis.push(label);
        data.push(salesMap.get(label) || 0);
      }
    } else if (groupBy === 'day' && period === SalesPeriod.LAST_WEEK) {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = `${date.getDate()}/${date.getMonth() + 1}`;
        xAxis.push(label);
        data.push(salesMap.get(label) || 0);
      }
    } else if (groupBy === 'day' && period === SalesPeriod.LAST_MONTH) {
      const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      for (let i = daysInPeriod; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = `${date.getDate()}/${date.getMonth() + 1}`;
        xAxis.push(label);
        data.push(salesMap.get(label) || 0);
      }
    } else if (groupBy === 'month') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 0; i < 12; i++) {
        const monthIndex = (now.getMonth() - 11 + i + 12) % 12;
        const label = monthNames[monthIndex];
        xAxis.push(label);
        data.push(salesMap.get(label) || 0);
      }
    }

    // Generate yAxis labels (value ranges)
    const maxValue = Math.max(...data, 0);
    const step = maxValue > 0 ? Math.ceil(maxValue / 5) : 1000;
    const yAxis: string[] = [];
    for (let i = 0; i <= 5; i++) {
      yAxis.push(`${i * step}`);
    }

    return new SalesProgressResponseDto(xAxis, yAxis, data);
  }
}
