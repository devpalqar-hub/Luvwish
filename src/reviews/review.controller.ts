// review.controller.ts
import { Controller, Post, Body, Get, Param, Patch, Delete } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { MarkHelpfulDto } from './dto/mark-helpful.dto';

@Controller('reviews')
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) { }

    @Post()
    create(@Body() dto: CreateReviewDto) {
        return this.reviewService.create(dto);
    }

    @Get('product/:productId')
    findByProduct(@Param('productId') productId: string) {
        return this.reviewService.findByProduct(productId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.reviewService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateReviewDto,
    ) {
        // In real app, get `customerProfileId` from auth token
        const customerProfileId = dto['customerProfileId'] || '';
        return this.reviewService.update(id, dto, customerProfileId);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Body('customerProfileId') customerProfileId: string) {
        return this.reviewService.remove(id, customerProfileId);
    }

    @Post('helpful')
    markHelpful(@Body() dto: MarkHelpfulDto) {
        return this.reviewService.markHelpful(dto.reviewId);
    }

    @Get('product/:productId/average')
    getAverageRating(@Param('productId') productId: string) {
        return this.reviewService.getAverageRating(productId);
    }
}
