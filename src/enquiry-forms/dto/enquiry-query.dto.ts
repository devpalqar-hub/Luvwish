import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EnquiryPurpose } from '@prisma/client';

export class EnquiryQueryDto {
    @IsOptional()
    @IsEnum(EnquiryPurpose)
    purpose?: EnquiryPurpose;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;
}
