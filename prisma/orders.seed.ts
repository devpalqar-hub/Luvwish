import {
    PrismaClient,
    TrackingStatus,
    OrderStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

function buildStatusHistory(finalStatus: TrackingStatus) {
    const now = Date.now();

    const flow: TrackingStatus[] = [
        TrackingStatus.order_placed,
        TrackingStatus.processing,
        TrackingStatus.ready_to_ship,
        TrackingStatus.shipped,
        TrackingStatus.in_transit,
        TrackingStatus.out_for_delivery,
        TrackingStatus.delivered,
    ];

    // statuses not part of forward delivery lifecycle
    if (!flow.includes(finalStatus)) {
        return [
            {
                status: finalStatus,
                timestamp: new Date(now),
            },
        ];
    }

    const index = flow.indexOf(finalStatus);

    return flow.slice(0, index + 1).map((status, i) => ({
        status,
        timestamp: new Date(
            now - (index - i) * 3 * 60 * 60 * 1000
        ),
    }));
}


function mapOrderStatusToTracking(
    status: OrderStatus
): TrackingStatus {
    switch (status) {
        case OrderStatus.pending:
            return TrackingStatus.order_placed;
        case OrderStatus.confirmed:
            return TrackingStatus.processing;
        case OrderStatus.processing:
            return TrackingStatus.ready_to_ship;
        case OrderStatus.shipped:
            return TrackingStatus.in_transit;
        case OrderStatus.delivered:
            return TrackingStatus.delivered;
        case OrderStatus.cancelled:
            return TrackingStatus.failed_delivery;
        default:
            return TrackingStatus.order_placed;
    }
}

async function main() {
    console.log('Adding tracking details to orders...');

    const ordersWithoutTracking = await prisma.order.findMany({
        where: {
            tracking: null,
        },
    });

    console.log(
        `Found ${ordersWithoutTracking.length} orders without tracking`
    );

    for (const order of ordersWithoutTracking) {
        const trackingStatus = mapOrderStatusToTracking(order.status);

        await prisma.trackingDetail.create({
            data: {
                orderId: order.id,
                carrier: 'Internal Logistics',
                trackingNumber: `TRK-${order.orderNumber}`,
                trackingUrl: null,
                status: trackingStatus,
                statusHistory: buildStatusHistory(trackingStatus),
                lastUpdatedAt: new Date(),
            },
        });

        console.log(`Tracking added for order ${order.orderNumber}`);
    }

    console.log('Tracking seeding completed');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
