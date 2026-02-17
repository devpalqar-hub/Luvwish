import { PrismaClient, TrackingStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding tracking details...');

    // get orders that don't have tracking yet
    const ordersWithoutTracking = await prisma.order.findMany({
        where: {
            tracking: null,
        },
        select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            paymentMethod: true,
        },
    });

    console.log(`Found ${ordersWithoutTracking.length} orders without tracking`);

    for (const order of ordersWithoutTracking) {
        const now = new Date();

        await prisma.trackingDetail.create({
            data: {
                order: {
                    connect: { id: order.id },
                },
                carrier: 'Internal',
                trackingNumber: order.orderNumber,
                trackingUrl: null,
                status: TrackingStatus.order_placed,
                statusHistory: [
                    {
                        status: 'order_placed',
                        notes: `Order placed with ${order.paymentMethod.replaceAll('_', ' ')}`,
                        timestamp: now,
                    },
                ],
                lastUpdatedAt: now,
            },
        });

        console.log(`Tracking created for order ${order.orderNumber}`);
    }

    console.log('Tracking seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
