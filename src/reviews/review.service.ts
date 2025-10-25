// review.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateReviewDto, user) {
        const customerProfile = await this.prisma.customerProfile.findUnique({
            where: { userId: user },
        });

        // 1️⃣ Validate order item ownership
        const orderItem = await this.prisma.orderItem.findFirst({
            where: {
                id: dto.orderItemId, // ✅ ensure review is tied to this specific purchase
                productId: dto.productId,
                order: {
                    customerProfileId: customerProfile.id,
                    status: 'delivered', // ✅ or your chosen completed status
                },
            },
        });

        if (!orderItem) {
            throw new ForbiddenException('You can only review products you purchased and received.');
        }

        // 2️⃣ Check if review already exists for this order item
        const existingReview = await this.prisma.review.findFirst({
            where: { orderItemId: dto.orderItemId },
        });

        if (existingReview) {
            throw new ForbiddenException('You already reviewed this purchase.');
        }

        // 3️⃣ Create the review
        return this.prisma.review.create({
            data: {
                rating: dto.rating,
                comment: dto.comment,
                productId: dto.productId,
                customerProfileId: customerProfile.id,
                orderItemId: dto.orderItemId, // ✅ link review to specific order item
                images: {
                    create: dto.images?.map((url) => ({ url })) || [],
                },
            },
            include: { images: true },
        });
    }


    async findByProduct(productId: string) {
        return this.prisma.review.findMany({
            where: { productId },
            include: { images: true, customerProfile: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const review = await this.prisma.review.findUnique({
            where: { id },
            include: { images: true },
        });
        if (!review) throw new NotFoundException('Review not found');
        return review;
    }

    async update(id: string, dto: UpdateReviewDto, userId: string) {
        const customerProfile = await this.prisma.customerProfile.findUnique({
            where: { userId: userId },
        });
        const review = await this.prisma.review.findUnique({ where: { id } });
        if (!review) throw new NotFoundException('Review not found');
        if (review.customerProfileId !== customerProfile.id)
            throw new ForbiddenException('You cannot edit this review');

        return this.prisma.review.update({
            where: { id },
            data: {
                ...dto,
                images: dto.images
                    ? {
                        deleteMany: {}, // remove old images
                        create: dto.images.map(url => ({ url })),
                    }
                    : undefined,
            },
            include: { images: true },
        });
    }

    async remove(id: string, userId: string) {
        const customerProfile = await this.prisma.customerProfile.findUnique({
            where: { userId: userId },
        });
        const review = await this.prisma.review.findUnique({ where: { id } });
        if (!review) throw new NotFoundException('Review not found');
        if (review.customerProfileId !== customerProfile.id)
            throw new ForbiddenException('You cannot delete this review');

        return this.prisma.review.delete({ where: { id } });
    }

    // async markHelpful(id: string) {
    //     return this.prisma.review.update({
    //         where: { id },
    //         data: { helpfulCount: { increment: 1 } },
    //     });
    // }

    async getAverageRating(productId: string) {
        const result = await this.prisma.review.aggregate({
            where: { productId },
            _avg: { rating: true },
            _count: { rating: true },
        });
        return {
            averageRating: result._avg.rating,
            totalReviews: result._count.rating,
        };
    }
}
