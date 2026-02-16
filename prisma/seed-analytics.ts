import {
    PrismaClient,
    Roles,
    OrderStatus,
    PaymentStatus,
    PaymentMethod,
    TrackingStatus,
    ReturnStatus
} from '@prisma/client';

import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {

    console.log('🌱 Seeding delivery partner test data...');

    const password = await bcrypt.hash('123456', 10);

    /*
    --------------------------------------------------
    USERS
    --------------------------------------------------
    */

    const admin = await prisma.user.create({
        data: {
            email: 'admin@test.com',
            role: Roles.ADMIN,
            password
        }
    });

    const delivery1 = await prisma.user.create({
        data: {
            email: 'delivery1@test.com',
            role: Roles.DELIVERY,
            password
        }
    });

    const delivery2 = await prisma.user.create({
        data: {
            email: 'delivery2@test.com',
            role: Roles.DELIVERY,
            password
        }
    });

    /*
    --------------------------------------------------
    CUSTOMERS
    --------------------------------------------------
    */

    const customer1 = await prisma.user.create({
        data: {
            email: 'customer1@test.com',
            role: Roles.CUSTOMER,
            password,
            CustomerProfile: {
                create: {
                    name: 'Customer One',
                    phone: '9999999991',
                    city: 'Kollam',
                    state: 'Kerala',
                    country: 'India'
                }
            }
        },
        include: { CustomerProfile: true }
    });

    const address1 = await prisma.address.create({
        data: {
            name: 'Home',
            address: 'Beach Road',
            city: 'Kollam',
            state: 'Kerala',
            postalCode: '691001',
            country: 'India',
            customerProfileId: customer1.CustomerProfile!.id
        }
    });

    /*
    --------------------------------------------------
    PRODUCT DATA
    --------------------------------------------------
    */

    const category = await prisma.category.create({
        data: {
            name: 'Groceries',
            slug: 'groceries'
        }
    });

    const subCategory = await prisma.subCategory.create({
        data: {
            name: 'Snacks',
            slug: 'snacks',
            categoryId: category.id
        }
    });

    const product = await prisma.product.create({
        data: {
            name: 'Chocolate Cookies',
            actualPrice: 200,
            discountedPrice: 150,
            stockCount: 100,
            subCategoryId: subCategory.id
        }
    });

    /*
    --------------------------------------------------
    ORDER CREATION HELPER
    --------------------------------------------------
    */

    async function createOrder(
        orderNumber: string,
        deliveryPartnerId: string,
        orderStatus: OrderStatus,
        trackingStatus: TrackingStatus,
        daysAgo: number
    ) {

        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - daysAgo);

        const order = await prisma.order.create({
            data: {
                orderNumber,
                status: orderStatus,
                paymentStatus: PaymentStatus.completed,
                paymentMethod: PaymentMethod.cash_on_delivery,
                totalAmount: 150,
                customerProfileId: customer1.CustomerProfile!.id,
                shippingAddressId: address1.id,
                deliveryPartnerId,
                createdAt: createdDate,

                items: {
                    create: [{
                        productId: product.id,
                        quantity: 1,
                        actualPrice: 200,
                        discountedPrice: 150
                    }]
                },

                Payment: {
                    create: [{
                        amount: 150,
                        method: PaymentMethod.cash_on_delivery,
                        status: PaymentStatus.completed
                    }]
                }
            }
        });

        await prisma.trackingDetail.create({
            data: {
                orderId: order.id,
                carrier: 'Internal',
                trackingNumber: `TRK-${orderNumber}`,
                status: trackingStatus,
                lastUpdatedAt: new Date()
            }
        });

        return order;
    }

    /*
    --------------------------------------------------
    ORDERS FOR DELIVERY PARTNER 1
    --------------------------------------------------
    */

    const deliveredOrder = await createOrder(
        'ORD-1001',
        delivery1.id,
        OrderStatus.delivered,
        TrackingStatus.delivered,
        2
    );

    await createOrder(
        'ORD-1002',
        delivery1.id,
        OrderStatus.shipped,
        TrackingStatus.in_transit,
        1
    );

    await createOrder(
        'ORD-1003',
        delivery1.id,
        OrderStatus.processing,
        TrackingStatus.out_for_delivery,
        0
    );

    /*
    --------------------------------------------------
    ORDERS FOR DELIVERY PARTNER 2
    --------------------------------------------------
    */

    await createOrder(
        'ORD-2001',
        delivery2.id,
        OrderStatus.delivered,
        TrackingStatus.delivered,
        3
    );

    await createOrder(
        'ORD-2002',
        delivery2.id,
        OrderStatus.shipped,
        TrackingStatus.in_transit,
        0
    );

    /*
    --------------------------------------------------
    RETURNS
    --------------------------------------------------
    */

    await prisma.return.create({
        data: {
            orderId: deliveredOrder.id,
            customerProfileId: customer1.CustomerProfile!.id,
            deliveryPartnerId: delivery1.id,
            status: ReturnStatus.picked_up,
            reason: 'Damaged product',
            refundAmount: 150
        }
    });

    console.log('✅ Delivery partner seed completed successfully');
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
