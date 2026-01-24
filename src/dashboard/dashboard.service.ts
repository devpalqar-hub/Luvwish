import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import {
    DashboardResponseDto,
    CategoryOrderAnalytics,
} from './dto/dashboard-response.dto';
import { RecentOrdersFilterDto } from './dto/recent-orders-filter.dto';
import {
    RecentOrdersResponseDto,
    RecentOrderItemDto,
} from './dto/recent-orders-response.dto';
import { TopProductsFilterDto } from './dto/top-products-filter.dto';
import {
    TopProductsResponseDto,
    TopProductItemDto,
} from './dto/top-products-response.dto';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) { }

    async getAdminDashboard(
        filters: DashboardFilterDto,
    ): Promise<DashboardResponseDto> {
        const { startDate, endDate } = filters;

        // 1️⃣ Date filter (orders & users only)
        const createdAtFilter: any = {};
        if (startDate) createdAtFilter.gte = new Date(startDate);
        if (endDate) createdAtFilter.lte = new Date(endDate);

        const hasDateFilter = Object.keys(createdAtFilter).length > 0;

        // 2️⃣ Total Orders
        const totalOrders = await this.prisma.order.count({
            where: hasDateFilter ? { createdAt: createdAtFilter } : undefined,
        });

        // 3️⃣ Total Active Customers
        const totalCustomers = await this.prisma.user.count({
            where: {
                role: 'CUSTOMER',
                isActive: true,
                ...(hasDateFilter && { createdAt: createdAtFilter }),
            },
        });

        // 4️⃣ Total Products (only via active category & subcategory)
        const totalProducts = await this.prisma.product.count({
            where: {
                subCategory: {
                    isActive: true,
                    category: {
                        isActive: true,
                    },
                },
            },
        });

        // 5️⃣ Total Revenue
        const revenueResult = await this.prisma.order.aggregate({
            where: hasDateFilter ? { createdAt: createdAtFilter } : undefined,
            _sum: {
                totalAmount: true,
            },
        });

        const totalRevenue = Number(revenueResult._sum.totalAmount ?? 0);

        // 6️⃣ Category-wise analytics
        const categoryWiseAnalytics = await this.getCategoryWiseAnalytics(
            hasDateFilter ? { createdAt: createdAtFilter } : {},
        );

        return {
            totalOrders,
            totalCustomers,
            totalProducts,
            totalRevenue,
            categoryWiseAnalytics,
            dateRange: {
                startDate: startDate ?? null,
                endDate: endDate ?? null,
            },
        };
    }



    private async getCategoryWiseAnalytics(
        dateFilter: any,
    ): Promise<CategoryOrderAnalytics[]> {
        // Get all orders with their items, products, and categories
        const orders = await this.prisma.order.findMany({
            where: dateFilter,
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                subCategory: {
                                    include: {
                                        category: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        // Aggregate data by category
        const categoryMap = new Map<
            string,
            {
                categoryId: string;
                categoryName: string;
                totalOrders: Set<string>;
                totalRevenue: number;
                productsSold: number;
            }
        >();

        for (const order of orders) {
            for (const item of order.items) {
                const category = item.product?.subCategory?.category;

                if (category) {
                    const categoryId = category.id;
                    const categoryName = category.name;

                    if (!categoryMap.has(categoryId)) {
                        categoryMap.set(categoryId, {
                            categoryId,
                            categoryName,
                            totalOrders: new Set<string>(),
                            totalRevenue: 0,
                            productsSold: 0,
                        });
                    }

                    const categoryData = categoryMap.get(categoryId)!;
                    categoryData.totalOrders.add(order.id);
                    categoryData.totalRevenue += Number(item.discountedPrice) * item.quantity;
                    categoryData.productsSold += item.quantity;
                }
            }
        }

        // Convert map to array
        const analytics: CategoryOrderAnalytics[] = Array.from(
            categoryMap.values(),
        ).map((data) => ({
            categoryId: data.categoryId,
            categoryName: data.categoryName,
            totalOrders: data.totalOrders.size,
            totalRevenue: data.totalRevenue,
            productsSold: data.productsSold,
        }));

        // Sort by total revenue descending
        analytics.sort((a, b) => b.totalRevenue - a.totalRevenue);

        return analytics;
    }

    // 🔹 Get recent orders (latest to old)
    async getRecentOrders(
        filters: RecentOrdersFilterDto,
    ): Promise<RecentOrdersResponseDto> {
        const { limit = 10 } = filters;

        const orders = await this.prisma.order.findMany({
            take: limit,
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                CustomerProfile: {
                    include: {
                        user: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
                items: true,
            },
        });

        const data: RecentOrderItemDto[] = orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.CustomerProfile?.name || null,
            customerEmail: order.CustomerProfile?.user?.email || '',
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            totalAmount: Number(order.totalAmount),
            itemsCount: order.items.length,
            createdAt: order.createdAt,
        }));

        return {
            data,
            total: data.length,
        };
    }

    // 🔹 Get top products by total sold
    async getTopProducts(
        filters: TopProductsFilterDto,
    ): Promise<TopProductsResponseDto> {
        const { count = 5 } = filters;

        // Get all order items with product details
        const orderItems = await this.prisma.orderItem.findMany({
            include: {
                product: {
                    include: {
                        images: {
                            orderBy: {
                                sortOrder: 'asc',
                            },
                            take: 1,
                        },
                        subCategory: {
                            include: {
                                category: true,
                            },
                        },
                    },
                },
            },
        });

        // Aggregate by product
        const productMap = new Map<
            string,
            {
                id: string;
                productName: string;
                categoryName: string | null;
                subCategoryName: string | null;
                totalSold: number;
                totalRevenue: number;
                stockCount: number;
                discountedPrice: number;
                actualPrice: number;
                image: string | null;
            }
        >();

        for (const item of orderItems) {
            const product = item.product;
            if (!product) continue;

            const productId = product.id;

            if (!productMap.has(productId)) {
                productMap.set(productId, {
                    id: product.id,
                    productName: product.name,
                    categoryName: product.subCategory?.category?.name || null,
                    subCategoryName: product.subCategory?.name || null,
                    totalSold: 0,
                    totalRevenue: 0,
                    stockCount: product.stockCount,
                    discountedPrice: Number(product.discountedPrice),
                    actualPrice: Number(product.actualPrice),
                    image: product.images[0]?.url || null,
                });
            }

            const productData = productMap.get(productId)!;
            productData.totalSold += item.quantity;
            productData.totalRevenue += Number(item.discountedPrice) * item.quantity;
        }

        // Convert to array and sort by total sold
        const topProducts = Array.from(productMap.values())
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, count);

        return {
            data: topProducts,
            count: topProducts.length,
        };
    }


    async getTotalRevenueFromPayments() {
        const result = await this.prisma.payment.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                status: 'completed',
            },
        });

        return {
            totalRevenue: result._sum.amount ?? 0,
        };
    }
}
}
