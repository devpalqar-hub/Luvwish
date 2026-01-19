import { PrismaClient, PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding analytics data...')

    /* ---------------------------
       Ensure one customer exists
    ---------------------------- */
    const user = await prisma.user.upsert({
        where: { email: 'analytics@test.com' },
        update: {},
        create: {
            email: 'analytics@test.com',
            password: 'hashed',
            CustomerProfile: {
                create: { name: 'Analytics User', country: 'India' }
            }
        }
    })

    const customerProfile = await prisma.customerProfile.findUnique({
        where: { userId: user.id }
    })

    if (!customerProfile) {
        throw new Error('CustomerProfile missing')
    }

    /* ---------------------------
       Helper to create order
    ---------------------------- */
    async function createOrder(date: Date, amount: number) {
        await prisma.order.create({
            data: {
                orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                createdAt: date,
                updatedAt: date,
                status: OrderStatus.delivered,
                paymentStatus: PaymentStatus.completed,
                paymentMethod: PaymentMethod.cash_on_delivery,
                totalAmount: amount,
                customerProfileId: customerProfile.id,
                Payment: {
                    create: {
                        amount,
                        method: PaymentMethod.cash_on_delivery,
                        status: PaymentStatus.completed,
                        createdAt: date
                    }
                }
            }
        })
    }

    const now = new Date()

    /* ===========================
       LAST 24 HOURS (HOURLY)
    ============================ */
    for (let i = 0; i < 24; i++) {
        const date = new Date(now.getTime() - i * 60 * 60 * 1000)
        await createOrder(date, 500 + i * 20)
    }

    /* ===========================
       LAST 7 DAYS (DAILY)
    ============================ */
    for (let d = 1; d <= 7; d++) {
        for (let i = 0; i < 2; i++) {
            const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
            date.setHours(10 + i * 4)
            await createOrder(date, 1000 + d * 100)
        }
    }

    /* ===========================
       LAST 30 DAYS (DAILY)
    ============================ */
    for (let d = 8; d <= 30; d++) {
        const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000)
        await createOrder(date, 1500 + d * 50)
    }

    /* ===========================
       LAST 12 MONTHS (MONTHLY)
    ============================ */
    for (let m = 1; m <= 12; m++) {
        for (let i = 0; i < 2; i++) {
            const date = new Date(
                now.getFullYear(),
                now.getMonth() - m,
                10 + i * 5
            )
            await createOrder(date, 5000 + m * 500)
        }
    }

    console.log('✅ Analytics seed completed')
}

main()
    .catch(err => {
        console.error(err)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
