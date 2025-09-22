// dto/create-review.dto.ts
import { IsInt, IsOptional, IsString, IsUUID, IsArray, IsUrl, Min, Max } from 'class-validator';

export class CreateReviewDto {
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsOptional()
    @IsString()
    comment?: string;

    @IsUUID()
    productId: string;

    @IsOptional()
    @IsUUID()
    customerProfileId?: string;

    @IsOptional()
    @IsArray()
    @IsUrl({}, { each: true })
    images?: string[];
}
