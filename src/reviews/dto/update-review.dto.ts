// dto/update-review.dto.ts
import { IsInt, IsOptional, IsString, IsArray, IsUrl, Min, Max } from 'class-validator';

export class UpdateReviewDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    images?: string[];
}
