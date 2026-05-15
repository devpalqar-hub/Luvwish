// dto/create-mock-review.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, IsArray, IsUrl, Min, Max } from 'class-validator';

export class CreateMockReviewDto {
    @ApiProperty({ description: 'Rating from 1 to 5', example: 5 })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional({ description: 'Review comment', example: 'Great product!' })
    @IsOptional()
    @IsString()
    comment?: string;

    @ApiProperty({ description: 'Product ID to review' })
    @IsUUID()
    productId: string;

    @ApiProperty({ description: 'Display name for the mock reviewer', example: 'Aisha K.' })
    @IsString()
    reviewerName: string;

    @ApiPropertyOptional({ description: 'Array of image URLs', type: [String] })
    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    images?: string[];
}
