// review.controller.ts
import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateMockReviewDto } from './dto/create-mock-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ListReviewsFilterDto } from './dto/list-reviews-filter.dto';
import { PaginationDto } from 'src/pagination/dto/pagination.dto';
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
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @Get('admin/all')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all reviews with filters (Admin only)' })
    @ApiQuery({ name: 'productId', required: false, description: 'Filter by product ID' })
    @ApiQuery({ name: 'customerProfileId', required: false, description: 'Filter by customer profile ID' })
    @ApiQuery({ name: 'rating', required: false, description: 'Filter by exact rating (1-5)' })
    @ApiQuery({ name: 'minRating', required: false, description: 'Filter by minimum rating' })
    @ApiQuery({ name: 'maxRating', required: false, description: 'Filter by maximum rating' })
    @ApiQuery({ name: 'isMock', required: false, description: 'Filter mock reviews (true/false)' })
    @ApiQuery({ name: 'search', required: false, description: 'Search in comment or reviewer name' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format, e.g. 2026-01-01)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format, e.g. 2026-12-31)' })
    @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'rating'], description: 'Sort field' })
    @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
    @ApiOkResponse({ description: 'Paginated list of reviews' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
    listAllReviews(@Query() filters: ListReviewsFilterDto) {
        return this.reviewService.listAllReviews(filters);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    @Post('mock')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a mock review for a product (Admin only)' })
    @ApiBody({ type: CreateMockReviewDto })
    @ApiOkResponse({ description: 'Mock review created successfully' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
    createMockReview(@Body() dto: CreateMockReviewDto) {
        return this.reviewService.createMockReview(dto);
    }

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
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiOkResponse({ description: 'Reviews returned successfully' })
    findByProduct(@Param('productId') productId: string, @Query() pagination: PaginationDto) {
        return this.reviewService.findByProduct(productId, pagination);
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
