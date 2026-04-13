import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { UpdateTrackingStatusDto } from './dto/update-tracking-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) { }

  // Get tracking by order ID
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get tracking by order id' })
  @ApiParam({ name: 'orderId', description: 'Order id' })
  @ApiOkResponse({ description: 'Tracking data returned successfully' })
  getTrackingByOrderId(@Param('orderId') orderId: string) {
    return this.trackingService.getTrackingByOrderId(orderId);
  }

  // Get tracking by tracking number (public endpoint for customers)
  @Get(':trackingNumber')
  @ApiOperation({ summary: 'Get tracking by tracking number' })
  @ApiParam({ name: 'trackingNumber', description: 'Tracking number' })
  @ApiOkResponse({ description: 'Tracking data returned successfully' })
  getTrackingByTrackingNumber(@Param('trackingNumber') trackingNumber: string) {
    return this.trackingService.getTrackingByTrackingNumber(trackingNumber);
  }

  // Update tracking status (Admin/Delivery only)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY', 'ORDER_MANAGER')
  @Patch('order/:orderId/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tracking status by order id' })
  @ApiParam({ name: 'orderId', description: 'Order id' })
  @ApiBody({ type: UpdateTrackingStatusDto })
  @ApiOkResponse({ description: 'Tracking status updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN, SUPER_ADMIN, DELIVERY, or ORDER_MANAGER role' })
  updateTrackingStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateTrackingStatusDto,
  ) {
    return this.trackingService.updateTrackingStatus(orderId, dto);
  }
}
