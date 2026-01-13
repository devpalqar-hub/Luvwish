import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTrackingStatusDto } from './dto/update-tracking-status.dto';
import { TrackingStatus } from '@prisma/client';

@Injectable()
export class TrackingService {
  constructor(private prisma: PrismaService) {}

  // Get tracking details by order ID
  async getTrackingByOrderId(orderId: string) {
    const tracking = await this.prisma.trackingDetail.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
            CustomerProfile: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!tracking) {
      throw new NotFoundException(`Tracking details for order ${orderId} not found`);
    }

    return tracking;
  }

  // Get tracking details by tracking number
  async getTrackingByTrackingNumber(trackingNumber: string) {
    const tracking = await this.prisma.trackingDetail.findFirst({
      where: { trackingNumber },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
            CustomerProfile: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!tracking) {
      throw new NotFoundException(`Tracking number ${trackingNumber} not found`);
    }

    return tracking;
  }

  // Update tracking status (mock/manual)
  async updateTrackingStatus(orderId: string, dto: UpdateTrackingStatusDto) {
    const tracking = await this.prisma.trackingDetail.findUnique({
      where: { orderId },
    });

    if (!tracking) {
      throw new NotFoundException(`Tracking details for order ${orderId} not found`);
    }

    // Get existing status history or initialize
    const statusHistory = (tracking.statusHistory as any[]) || [];

    // Add new status to history
    const newHistoryEntry = {
      status: dto.status,
      timestamp: new Date().toISOString(),
      notes: dto.notes || null,
    };
    statusHistory.push(newHistoryEntry);

    // Update tracking detail
    const updatedTracking = await this.prisma.trackingDetail.update({
      where: { orderId },
      data: {
        status: dto.status,
        statusHistory,
        lastUpdatedAt: new Date(),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
      },
    });

    // Auto-update order status based on tracking status
    await this.syncOrderStatus(orderId, dto.status);

    return {
      message: 'Tracking status updated successfully',
      tracking: updatedTracking,
    };
  }

  // Sync order status with tracking status
  private async syncOrderStatus(orderId: string, trackingStatus: TrackingStatus) {
    const statusMap: Record<TrackingStatus, string> = {
      order_placed: 'confirmed',
      processing: 'processing',
      ready_to_ship: 'processing',
      shipped: 'shipped',
      in_transit: 'shipped',
      out_for_delivery: 'shipped',
      delivered: 'delivered',
      failed_delivery: 'shipped',
      returned: 'cancelled',
    };

    const orderStatus = statusMap[trackingStatus];
    if (orderStatus) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: orderStatus as any },
      });
    }
  }
}
