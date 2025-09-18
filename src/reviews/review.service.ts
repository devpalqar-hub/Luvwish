import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, productId: string, dto: CreateReviewDto) {
        // get customer profile
        const profile = await this.prisma.customerProfile.findUnique({
            where: { userId },
        });
        if (!profile) throw new NotFoundException('Customer profile not found');

        // check product exists
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new NotFoundException('Product not found');

        // check if user already reviewed this product
        const existing = await this.prisma.review.findUnique({
            where: { customerProfileId_productId: { customerProfileId: profile.id, productId } },
        });
        if (existing) {
            throw new ForbiddenException('You already reviewed this product');
        }

        const { images, ...reviewData } = dto;
        
        return this.prisma.review.create({
            data: {
                ...reviewData,
                productId,
                customerProfileId: profile.id,
                ...(images && images.length > 0 && {
                    images: {
                        create: images.map(url => ({ url }))
                    }
                })
            },
        });
    }

    async findAll(productId: string) {
        return this.prisma.review.findMany({
            where: { productId },
            include: {
                CustomerProfile: {
                    select: { id: true, name: true, profilePicture: true },
                },
                images: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
        const profile = await this.prisma.customerProfile.findUnique({
            where: { userId },
        });
        if (!profile) throw new NotFoundException('Customer profile not found');

        const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
        if (!review) throw new NotFoundException('Review not found');
        if (review.customerProfileId !== profile.id) {
            throw new ForbiddenException('Not allowed');
        }

        const { images, ...reviewData } = dto;
        
        return this.prisma.review.update({
            where: { id: reviewId },
            data: {
                ...reviewData,
                ...(images !== undefined && {
                    images: {
                        deleteMany: {}, // Delete existing images
                        ...(images.length > 0 && {
                            create: images.map(url => ({ url }))
                        })
                    }
                })
            },
        });
    }

    async remove(userId: string, reviewId: string) {
        const profile = await this.prisma.customerProfile.findUnique({
            where: { userId },
        });
        if (!profile) throw new NotFoundException('Customer profile not found');

        const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
        if (!review) throw new NotFoundException('Review not found');
        if (review.customerProfileId !== profile.id) {
            throw new ForbiddenException('Not allowed');
        }

        await this.prisma.review.delete({ where: { id: reviewId } });

        return { message: 'Review deleted successfully' };
    }
}
