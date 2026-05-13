// dto/list-reviews-filter.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsInt, Min, Max, IsBoolean, IsPositive } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ListReviewsFilterDto {
    @ApiPropertyOptional({ description: 'Filter by product ID' })
    @IsOptional()
    @IsUUID()
    productId?: string;

    @ApiPropertyOptional({ description: 'Filter by customer profile ID' })
    @IsOptional()
    @IsUUID()
    customerProfileId?: string;

    @ApiPropertyOptional({ description: 'Filter by minimum rating (1-5)', example: 3 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    minRating?: number;

    @ApiPropertyOptional({ description: 'Filter by maximum rating (1-5)', example: 5 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    maxRating?: number;

    @ApiPropertyOptional({ description: 'Filter by exact rating (1-5)', example: 5 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;

    @ApiPropertyOptional({ description: 'Filter mock reviews only (true/false)' })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isMock?: boolean;

    @ApiPropertyOptional({ description: 'Search in comment or reviewer name' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Sort by field', enum: ['createdAt', 'rating'], default: 'createdAt' })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';

    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsPositive()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsPositive()
    @Min(1)
    limit?: number = 10;

    get skip(): number {
        return (this.page - 1) * this.limit;
    }
}
