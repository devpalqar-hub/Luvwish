// review.controller.ts
import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, Request } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { MarkHelpfulDto } from './dto/mark-helpful.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/decorators/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('reviews')
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() dto: CreateReviewDto, @Request() req) {
        const user = req.user.id || req.user.sub;
        return this.reviewService.create(dto, user);
    }

    // 🔹 Get products user can review from their delivered orders
    @UseGuards(JwtAuthGuard)
    @Get('my-reviewable-products')
    getReviewableProducts(@Request() req) {
        const user = req.user.id || req.user.sub;
        return this.reviewService.getReviewableProducts(user);
    }

    @Get('product/:productId')
    findByProduct(@Param('productId') productId: string) {
        return this.reviewService.findByProduct(productId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.reviewService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateReviewDto,
        @Request() req
    ) {
        const user = req.user.id;
        return this.reviewService.update(id, dto, user);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Param('id') id: string, @Request() req) {
        const user = req.user.id;
        return this.reviewService.remove(id, user);
    }

    // @Post('helpful')
    // markHelpful(@Body() dto: MarkHelpfulDto) {
    //     return this.reviewService.markHelpful(dto.reviewId);
    // }

    @Get('product/:productId/average')
    getAverageRating(@Param('productId') productId: string) {
        return this.reviewService.getAverageRating(productId);
    }
}
