import { PrismaClient, Roles, PaymentMethod, OrderStatus, PaymentStatus, CoupounValueType } from '@prisma/client';
import { faker } from '@faker-js/faker';


const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ----- USERS -----
    for (let i = 0; i < 5; i++) {
        const user = await prisma.user.create({
            data: {
                email: faker.internet.email(),
                password: faker.internet.password(),
                role: Roles.CUSTOMER,
                CustomerProfile: {
                    create: {
                        name: faker.person.fullName(),
                        phone: faker.phone.number(),
                        address: faker.location.streetAddress(),
                        city: faker.location.city(),
                        state: faker.location.state(),
                        postalCode: faker.location.zipCode(),
                        country: faker.location.country(),
                        profilePicture: faker.image.avatar(),
                    },
                },
            },
        });

        console.log(`Created user: ${user.email}`);
    }

    // ----- ADMIN -----
    const admin = await prisma.user.create({
        data: {
            email: 'admin@example.com',
            password: 'admin123',
            role: Roles.SUPER_ADMIN,
            AdminProfile: {
                create: {
                    name: 'Super Admin',
                    phone: faker.phone.number(),
                },
            },
        },
    });

    console.log(`Created admin: ${admin.email}`);

    // ----- FIXED PRODUCTS -----
    const productsData = [
        {
            name: "Organic Cotton Sanitary Pads - Ultra Thin",
            discountedPrice: 149,
            actualPrice: 199,
            stockCount: 500,
            description: "Ultra-thin sanitary pads made from 100% organic cotton...",
            isStock: true,
            images: {
                create: [
                    { url: "https://example.com/images/sanitary-pad-front.jpg", altText: "Front view", isMain: true },
                    { url: "https://example.com/images/sanitary-pad-packaging.jpg", altText: "Packaging", isMain: false },
                ],
            },
        },
        {
            name: "Herbal Pantyliners - Daily Fresh",
            discountedPrice: 79,
            actualPrice: 99,
            stockCount: 300,
            description: "Pantyliners infused with natural herbal extracts...",
            isStock: true,
            images: {
                create: [
                    { url: "https://example.com/images/pantyliner-pack.jpg", altText: "Herbal pantyliner pack", isMain: true },
                ],
            },
        },
        {
            name: "Overnight Sanitary Pads - XL",
            discountedPrice: 199,
            actualPrice: 249,
            stockCount: 450,
            description: "Extra-long sanitary pads for overnight protection...",
            isStock: true,
            images: {
                create: [
                    { url: "https://example.com/images/overnight-pad.jpg", altText: "Overnight pad pack", isMain: true },
                ],
            },
        },
        {
            name: "Reusable Menstrual Cup - Medium",
            discountedPrice: 499,
            actualPrice: 699,
            stockCount: 200,
            description: "Eco-friendly menstrual cup made from medical-grade silicone...",
            isStock: true,
            images: {
                create: [
                    { url: "https://example.com/images/menstrual-cup.jpg", altText: "Menstrual cup", isMain: true },
                ],
            },
        },
        {
            name: "Period Pain Relief Heat Patch",
            discountedPrice: 199,
            actualPrice: 249,
            stockCount: 600,
            description: "Self-heating patch for soothing period cramps...",
            isStock: true,
            images: {
                create: [
                    { url: "https://example.com/images/heat-patch.jpg", altText: "Heat patch pack", isMain: true },
                ],
            },
        },
    ];

    for (const p of productsData) {
        const product = await prisma.product.create({ data: p });
        console.log(`Created fixed product: ${product.name}`);
    }

    // ----- RANDOM PRODUCTS -----
    for (let i = 0; i < 5; i++) {
        const product = await prisma.product.create({
            data: {
                name: faker.commerce.productName(),
                discountedPrice: faker.number.float({ min: 100, max: 500, fractionDigits: 2 }),
                actualPrice: faker.number.float({ min: 500, max: 1000, fractionDigits: 2 }),
                description: faker.commerce.productDescription(),
                stockCount: faker.number.int({ min: 10, max: 100 }),
                isStock: true,
                images: {
                    create: [
                        {
                            url: faker.image.url(),
                            altText: faker.commerce.productAdjective(),
                            isMain: true,
                        },
                    ],
                },
            },
        });

        console.log(`Created random product: ${product.name}`);
    }

    // ----- COUPONS -----
    // ----- COUPONS -----
    const couponsData = [
        { couponName: "WELCOME10", ValueType: CoupounValueType.percentage, Value: "10", minimumSpent: 500, usageLimitPerPerson: 1, validFrom: new Date("2025-01-01"), ValidTill: new Date("2025-12-31") },
        { couponName: "SAVE200", ValueType: CoupounValueType.amount, Value: "200", minimumSpent: 1000, usageLimitPerPerson: 2, validFrom: new Date("2025-01-01"), ValidTill: new Date("2025-12-31") },
        { couponName: "FREESHIP", ValueType: CoupounValueType.amount, Value: "50", minimumSpent: 300, usageLimitPerPerson: 5, validFrom: new Date("2025-01-01"), ValidTill: new Date("2025-12-31") },
    ];


    // ----- SAMPLE ORDER -----
    const customer = await prisma.customerProfile.findFirst();
    const product = await prisma.product.findFirst();

    if (customer && product) {
        const order = await prisma.order.create({
            data: {
                orderNumber: `ORD-${Date.now()}`,
                status: OrderStatus.confirmed,
                paymentStatus: PaymentStatus.completed,
                totalAmount: product.discountedPrice,
                shippingCost: 50,
                taxAmount: 18,
                discountAmount: 0,
                CustomerProfile: { connect: { id: customer.id } },
                items: {
                    create: [
                        {
                            product: { connect: { id: product.id } },
                            quantity: 2,
                            discountedPrice: product.discountedPrice,
                            actualPrice: product.actualPrice,
                        },
                    ],
                },
                Payment: {
                    create: {
                        amount: product.discountedPrice,
                        method: PaymentMethod.credit_card,
                        status: PaymentStatus.completed,
                        transactionId: faker.string.uuid(),
                    },
                },
            },
        });

        console.log(`Created sample order: ${order.orderNumber}`);
    }

    console.log('✅ Seeding completed!');
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
