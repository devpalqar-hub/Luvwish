// review.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateReviewDto) {
        return this.prisma.review.create({
            data: {
                rating: dto.rating,
                comment: dto.comment,
                productId: dto.productId,
                customerProfileId: dto.customerProfileId,
                images: {
                    create: dto.images?.map(url => ({ url })) || [],
                },
            },
            include: { images: true },
        });
    }

    async findByProduct(productId: string) {
        return this.prisma.review.findMany({
            where: { productId },
            include: { images: true, CustomerProfile: true },
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

    async update(id: string, dto: UpdateReviewDto, customerProfileId: string) {
        const review = await this.prisma.review.findUnique({ where: { id } });
        if (!review) throw new NotFoundException('Review not found');
        if (review.customerProfileId !== customerProfileId)
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

    async remove(id: string, customerProfileId: string) {
        const review = await this.prisma.review.findUnique({ where: { id } });
        if (!review) throw new NotFoundException('Review not found');
        if (review.customerProfileId !== customerProfileId)
            throw new ForbiddenException('You cannot delete this review');

        return this.prisma.review.delete({ where: { id } });
    }

    async markHelpful(id: string) {
        return this.prisma.review.update({
            where: { id },
            data: { helpfulCount: { increment: 1 } },
        });
    }

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
