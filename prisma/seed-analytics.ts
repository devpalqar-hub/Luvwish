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

    console.log('🌱 Running conflict-safe delivery analytics seed...');

    const password = await bcrypt.hash('123456', 10);

    // Unique suffix for every seed run
    const seedTag = Date.now();

    /*
    --------------------------------------------------
    USERS
    --------------------------------------------------
    */

    const admin = await prisma.user.create({
        data: {
            email: `admin-${seedTag}@test.com`,
            role: Roles.ADMIN,
            password
        }
    });

    const delivery1 = await prisma.user.create({
        data: {
            email: `delivery-a-${seedTag}@test.com`,
            role: Roles.DELIVERY,
            password
        }
    });

    const delivery2 = await prisma.user.create({
        data: {
            email: `delivery-b-${seedTag}@test.com`,
            role: Roles.DELIVERY,
            password
        }
    });

    /*
    --------------------------------------------------
    CUSTOMER
    --------------------------------------------------
    */

    const customer = await prisma.user.create({
        data: {
            email: `customer-${seedTag}@test.com`,
            role: Roles.CUSTOMER,
            password,
            CustomerProfile: {
                create: {
                    name: 'Ajay Kumar',
                    phone: '9998887770',
                    city: 'Kochi',
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
            address: 'Marine Drive',
            city: 'Kochi',
            state: 'Kerala',
            postalCode: '682031',
            country: 'India',
            customerProfileId: customer.CustomerProfile!.id
        }
    });

    /*
    --------------------------------------------------
    CATEGORY / SUBCATEGORY
    --------------------------------------------------
    */

    const category = await prisma.category.create({
        data: {
            name: `Clothing-${seedTag}`,
            slug: `clothing-${seedTag}`
        }
    });

    const subCategory = await prisma.subCategory.create({
        data: {
            name: `Menswear-${seedTag}`,
            slug: `menswear-${seedTag}`,
            categoryId: category.id
        }
    });

    /*
    --------------------------------------------------
    PRODUCTS
    --------------------------------------------------
    */

    const tshirt = await prisma.product.create({
        data: {
            name: `Cotton T-Shirt ${seedTag}`,
            actualPrice: 899,
            discountedPrice: 699,
            stockCount: 100,
            subCategoryId: subCategory.id
        }
    });

    const hoodie = await prisma.product.create({
        data: {
            name: `Winter Hoodie ${seedTag}`,
            actualPrice: 1999,
            discountedPrice: 1499,
            stockCount: 80,
            subCategoryId: subCategory.id
        }
    });

    /*
    --------------------------------------------------
    ORDER HELPER
    --------------------------------------------------
    */

    async function createOrder(
        index: number,
        partnerId: string,
        productId: string,
        orderStatus: OrderStatus,
        trackingStatus: TrackingStatus,
        daysAgo: number
    ) {

        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - daysAgo);

        const orderNumber = `ORD-${seedTag}-${index}`;

        const order = await prisma.order.create({
            data: {
                orderNumber,
                status: orderStatus,
                paymentStatus: PaymentStatus.completed,
                paymentMethod: PaymentMethod.cash_on_delivery,
                totalAmount: 699,
                customerProfileId: customer.CustomerProfile!.id,
                shippingAddressId: address.id,
                deliveryPartnerId: partnerId,
                createdAt: createdDate,

                items: {
                    create: [{
                        productId,
                        quantity: 1,
                        actualPrice: 899,
                        discountedPrice: 699
                    }]
                },

                Payment: {
                    create: [{
                        amount: 699,
                        method: PaymentMethod.cash_on_delivery,
                        status: PaymentStatus.completed
                    }]
                }
            }
        });

        await prisma.trackingDetail.create({
            data: {
                orderId: order.id,
                carrier: 'Internal Logistics',
                trackingNumber: `TRK-${orderNumber}`,
                status: trackingStatus,
                lastUpdatedAt: new Date()
            }
        });

        return order;
    }

    /*
    --------------------------------------------------
    ORDERS
    --------------------------------------------------
    */

    const deliveredOrder = await createOrder(
        1,
        delivery1.id,
        tshirt.id,
        OrderStatus.delivered,
        TrackingStatus.delivered,
        2
    );

    await createOrder(
        2,
        delivery1.id,
        hoodie.id,
        OrderStatus.shipped,
        TrackingStatus.in_transit,
        1
    );

    await createOrder(
        3,
        delivery2.id,
        tshirt.id,
        OrderStatus.processing,
        TrackingStatus.out_for_delivery,
        0
    );

    /*
    --------------------------------------------------
    RETURN
    --------------------------------------------------
    */

    await prisma.return.create({
        data: {
            orderId: deliveredOrder.id,
            customerProfileId: customer.CustomerProfile!.id,
            deliveryPartnerId: delivery1.id,
            status: ReturnStatus.picked_up,
            reason: 'Size issue',
            refundAmount: 699
        }
    });

    console.log('✅ Conflict-safe seed completed successfully');
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
