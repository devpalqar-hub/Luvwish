import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { UpdateTrackingStatusDto } from './dto/update-tracking-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  // Get tracking by order ID
  @Get('order/:orderId')
  getTrackingByOrderId(@Param('orderId') orderId: string) {
    return this.trackingService.getTrackingByOrderId(orderId);
  }

  // Get tracking by tracking number (public endpoint for customers)
  @Get(':trackingNumber')
  getTrackingByTrackingNumber(@Param('trackingNumber') trackingNumber: string) {
    return this.trackingService.getTrackingByTrackingNumber(trackingNumber);
  }

  // Update tracking status (Admin/Delivery only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY', 'ORDER_MANAGER')
  @Patch('order/:orderId/status')
  updateTrackingStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateTrackingStatusDto,
  ) {
    return this.trackingService.updateTrackingStatus(orderId, dto);
  }
}
