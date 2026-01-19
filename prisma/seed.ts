import { PrismaClient, Roles, OrderStatus, PaymentStatus, PaymentMethod, CoupounValueType, TrackingStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {

    /* =========================
       USERS
    ========================== */

    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@store.com',
            role: Roles.ADMIN,
            password: 'hashed-password',
            AdminProfile: {
                create: { name: 'Admin One', phone: '9999999999' }
            }
        }
    })

    const customers = await Promise.all(
        ['alice', 'bob', 'charlie'].map(email =>
            prisma.user.create({
                data: {
                    email: `${email}@mail.com`,
                    password: 'hashed-password',
                    CustomerProfile: {
                        create: {
                            name: email.toUpperCase(),
                            phone: '8888888888',
                            city: 'Bangalore',
                            state: 'Karnataka',
                            country: 'India'
                        }
                    }
                }
            })
        )
    )

    const customerProfiles = await prisma.customerProfile.findMany()

    /* =========================
       CATEGORIES & PRODUCTS
    ========================== */

    const categories = await Promise.all(
        ['Electronics', 'Fashion', 'Home'].map(cat =>
            prisma.category.create({
                data: {
                    name: cat,
                    slug: cat.toLowerCase(),
                    subCategories: {
                        create: [
                            { name: `${cat} Sub 1`, slug: `${cat}-sub1`.toLowerCase() },
                            { name: `${cat} Sub 2`, slug: `${cat}-sub2`.toLowerCase() }
                        ]
                    }
                }
            })
        )
    )

    const subCategories = await prisma.subCategory.findMany()

    for (const sub of subCategories) {
        for (let i = 1; i <= 2; i++) {
            const product = await prisma.product.create({
                data: {
                    name: `${sub.name} Product ${i}`,
                    subCategoryId: sub.id,
                    actualPrice: 1000,
                    discountedPrice: 850,
                    stockCount: 50,
                    images: {
                        create: [
                            { url: 'https://img.com/1.jpg', isMain: true },
                            { url: 'https://img.com/2.jpg' }
                        ]
                    },
                    variations: {
                        create: [
                            {
                                variationName: 'Small',
                                sku: `${sub.slug}-S-${i}`,
                                actualPrice: 1000,
                                discountedPrice: 850,
                                stockCount: 20
                            },
                            {
                                variationName: 'Large',
                                sku: `${sub.slug}-L-${i}`,
                                actualPrice: 1200,
                                discountedPrice: 999,
                                stockCount: 30
                            }
                        ]
                    }
                }
            })
        }
    }

    const products = await prisma.product.findMany({
        include: { variations: true }
    })

    /* =========================
       COUPONS
    ========================== */

    const coupon = await prisma.coupon.create({
        data: {
            couponName: 'NEWUSER10',
            ValueType: CoupounValueType.percentage,
            Value: '10',
            minimumSpent: 500,
            validFrom: '2025-01-01',
            ValidTill: '2026-01-01'
        }
    })

    /* =========================
       ADDRESSES
    ========================== */

    for (const profile of customerProfiles) {
        await prisma.address.create({
            data: {
                name: profile.name ?? 'Customer',
                address: '123 Main Road',
                city: 'Bangalore',
                state: 'KA',
                postalCode: '560001',
                country: 'India',
                isDefault: true,

                CustomerProfile: {
                    connect: { id: profile.id }
                }
            }
        })

    }

    const addresses = await prisma.address.findMany()

    /* =========================
       ORDERS
    ========================== */

    const order = await prisma.order.create({
        data: {
            orderNumber: 'ORD-10001',
            status: OrderStatus.confirmed,
            paymentMethod: PaymentMethod.stripe,
            totalAmount: 1700,
            customerProfileId: customerProfiles[0].id,
            shippingAddressId: addresses[0].id,
            isCoupuonApplied: true,
            coupounId: coupon.id,
            items: {
                create: [
                    {
                        productId: products[0].id,
                        productVariationId: products[0].variations[0].id,
                        quantity: 2,
                        actualPrice: 1000,
                        discountedPrice: 850
                    }
                ]
            },
            Payment: {
                create: {
                    amount: 1700,
                    method: PaymentMethod.stripe,
                    status: PaymentStatus.completed,
                    transactionId: 'txn_123'
                }
            },
            tracking: {
                create: {
                    carrier: 'BlueDart',
                    trackingNumber: 'BD123',
                    status: TrackingStatus.shipped,
                    lastUpdatedAt: new Date()
                }
            }
        }
    })

    /* =========================
       REVIEW
    ========================== */

    const orderItem = await prisma.orderItem.findFirst()

    await prisma.review.create({
        data: {
            rating: 5,
            comment: 'Excellent product',
            productId: orderItem!.productId,
            customerProfileId: customerProfiles[0].id,
            orderItemId: orderItem!.id,
            images: {
                create: [{ url: 'https://img.com/rev1.jpg' }]
            }
        }
    })

    /* =========================
       CART & WISHLIST
    ========================== */

    await prisma.cartItem.create({
        data: {
            customerProfileId: customerProfiles[1].id,
            productId: products[1].id,
            quantity: 1
        }
    })

    await prisma.wishlist.create({
        data: {
            customerProfileId: customerProfiles[2].id,
            productId: products[2].id
        }
    })

    /* =========================
       BANNERS
    ========================== */

    await prisma.banner.createMany({
        data: [
            { image: 'https://img.com/banner1.jpg', title: 'Sale' },
            { image: 'https://img.com/banner2.jpg', title: 'New Arrivals' }
        ]
    })

    console.log('✅ Database seeded successfully')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
