import { PrismaClient, Roles, OrderStatus, PaymentStatus, TrackingStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

    /*
     ---------------------------------------
     USERS
     ---------------------------------------
    */

    const admin = await prisma.user.create({
        data: {
            email: 'admin@test.com',
            role: Roles.ADMIN,
            password: 'hashed'
        }
    });

    const delivery1 = await prisma.user.create({
        data: {
            email: 'delivery1@test.com',
            role: Roles.DELIVERY,
            password: 'hashed'
        }
    });

    const delivery2 = await prisma.user.create({
        data: {
            email: 'delivery2@test.com',
            role: Roles.DELIVERY,
            password: 'hashed'
        }
    });

    /*
     ---------------------------------------
     CUSTOMER + PROFILE
     ---------------------------------------
    */

    const customerUser = await prisma.user.create({
        data: {
            email: 'customer@test.com',
            role: Roles.CUSTOMER,
            password: 'hashed',
            CustomerProfile: {
                create: {
                    name: 'Test Customer',
                    phone: '9999999999',
                    city: 'Kollam',
                    state: 'Kerala',
                    country: 'India'
                }
            }
        },
        include: { CustomerProfile: true }
    });

    const address = await prisma.address.create({
        data: {
            name: 'Home',
            address: '123 Test Street',
            city: 'Kollam',
            state: 'Kerala',
            postalCode: '691001',
            country: 'India',
            customerProfileId: customerUser.CustomerProfile!.id
        }
    });

    /*
     ---------------------------------------
     PRODUCT DATA
     ---------------------------------------
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
     ---------------------------------------
     ORDERS
     ---------------------------------------
    */

    async function createOrder(
        orderNumber: string,
        partnerId: string,
        status: OrderStatus,
        trackingStatus: TrackingStatus
    ) {

        const order = await prisma.order.create({
            data: {
                orderNumber,
                totalAmount: 150,
                paymentStatus: PaymentStatus.completed,
                status,
                customerProfileId: customerUser.CustomerProfile!.id,
                shippingAddressId: address.id,
                deliveryPartnerId: partnerId,
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
                        method: 'cash_on_delivery',
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

    await createOrder(
        'ORD-1001',
        delivery1.id,
        OrderStatus.delivered,
        TrackingStatus.delivered
    );

    await createOrder(
        'ORD-1002',
        delivery1.id,
        OrderStatus.shipped,
        TrackingStatus.in_transit
    );

    await createOrder(
        'ORD-1003',
        delivery2.id,
        OrderStatus.processing,
        TrackingStatus.out_for_delivery
    );

    /*
     ---------------------------------------
     RETURNS
     ---------------------------------------
    */

    const orderForReturn = await prisma.order.findFirst();

    await prisma.return.create({
        data: {
            orderId: orderForReturn!.id,
            customerProfileId: customerUser.CustomerProfile!.id,
            deliveryPartnerId: delivery1.id,
            reason: 'Damaged product',
            refundAmount: 150
        }
    });

    console.log('✅ Delivery partner seed completed');
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
