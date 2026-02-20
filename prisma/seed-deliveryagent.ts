import { PrismaClient, OrderStatus, PaymentStatus, ReturnStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding delivery analytics test data...');

    // ------------------------------------------------------------------
    // 1. Find existing delivery partner
    // ------------------------------------------------------------------
    const deliveryPartner = await prisma.user.findUnique({
        where: { email: 'newemail@example.com' },
    });

    if (!deliveryPartner) {
        throw new Error('Delivery partner newemail@example.com not found');
    }

    // ------------------------------------------------------------------
    // 2. Get any existing customer profile
    // ------------------------------------------------------------------
    const customer = await prisma.customerProfile.findFirst();

    if (!customer) {
        throw new Error('No CustomerProfile found. Create one first.');
    }

    // ------------------------------------------------------------------
    // 3. Get any existing product
    // ------------------------------------------------------------------
    const product = await prisma.product.findFirst();

    if (!product) {
        throw new Error('No product found. Create at least one product.');
    }

    // ------------------------------------------------------------------
    // Helper function
    // ------------------------------------------------------------------
    const createOrder = async (
        status: OrderStatus,
        totalAmount: number,
    ) => {
        return prisma.order.create({
            data: {
                orderNumber: `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                status,
                paymentStatus: PaymentStatus.completed,
                totalAmount,
                deliveryPartnerId: deliveryPartner.id,
                customerProfileId: customer.id,
                items: {
                    create: [
                        {
                            productId: product.id,
                            quantity: Math.floor(Math.random() * 3) + 1,
                            actualPrice: totalAmount,
                            discountedPrice: totalAmount,
                        },
                    ],
                },
            },
            include: {
                items: true,
            },
        });
    };

    // ------------------------------------------------------------------
    // 4. Create orders with different statuses
    // ------------------------------------------------------------------
    const delivered1 = await createOrder('delivered', 250);
    const delivered2 = await createOrder('delivered', 180);
    const pending1 = await createOrder('pending', 120);
    const pending2 = await createOrder('pending', 90);
    const processing = await createOrder('processing', 300);
    const shipped = await createOrder('shipped', 210);
    const cancelled = await createOrder('cancelled', 150);

    console.log('Orders created');

    // ------------------------------------------------------------------
    // 5. Create returns
    // ------------------------------------------------------------------
    await prisma.return.createMany({
        data: [
            {
                orderId: delivered1.id,
                customerProfileId: customer.id,
                deliveryPartnerId: deliveryPartner.id,
                status: ReturnStatus.pending,
                reason: 'Damaged product',
                refundAmount: 250,
            },
            {
                orderId: delivered2.id,
                customerProfileId: customer.id,
                deliveryPartnerId: deliveryPartner.id,
                status: ReturnStatus.returned,
                reason: 'Wrong item',
                refundAmount: 180,
            },
        ],
    });

    console.log('Returns created');

    console.log('✅ Delivery analytics seed completed');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
