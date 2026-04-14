// review.controller.ts
import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, Request } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { MarkHelpfulDto } from './dto/mark-helpful.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/decorators/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a product review' })
    @ApiBody({ type: CreateReviewDto })
    @ApiOkResponse({ description: 'Review created successfully' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
    create(@Body() dto: CreateReviewDto, @Request() req) {
        const user = req.user.id || req.user.sub;
        return this.reviewService.create(dto, user);
    }

    // 🔹 Get products user can review from their delivered orders
    @UseGuards(JwtAuthGuard)
    @Get('my-reviewable-products')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get products eligible for review by current user' })
    @ApiOkResponse({ description: 'Reviewable products returned successfully' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
    getReviewableProducts(@Request() req) {
        const user = req.user.id || req.user.sub;
        return this.reviewService.getReviewableProducts(user);
    }

    @Get('product/:productId')
    @ApiOperation({ summary: 'Get reviews for a product' })
    @ApiParam({ name: 'productId', description: 'Product id' })
    @ApiOkResponse({ description: 'Reviews returned successfully' })
    findByProduct(@Param('productId') productId: string) {
        return this.reviewService.findByProduct(productId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get review by id' })
    @ApiParam({ name: 'id', description: 'Review id' })
    @ApiOkResponse({ description: 'Review returned successfully' })
    findOne(@Param('id') id: string) {
        return this.reviewService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update review by id' })
    @ApiParam({ name: 'id', description: 'Review id' })
    @ApiBody({ type: UpdateReviewDto })
    @ApiOkResponse({ description: 'Review updated successfully' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
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
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete review by id' })
    @ApiParam({ name: 'id', description: 'Review id' })
    @ApiOkResponse({ description: 'Review deleted successfully' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
    remove(@Param('id') id: string, @Request() req) {
        const user = req.user.id;
        return this.reviewService.remove(id, user);
    }

    // @Post('helpful')
    // markHelpful(@Body() dto: MarkHelpfulDto) {
    //     return this.reviewService.markHelpful(dto.reviewId);
    // }

    @Get('product/:productId/average')
    @ApiOperation({ summary: 'Get average rating for a product' })
    @ApiParam({ name: 'productId', description: 'Product id' })
    @ApiOkResponse({ description: 'Average rating returned successfully' })
    getAverageRating(@Param('productId') productId: string) {
        return this.reviewService.getAverageRating(productId);
    }
}
