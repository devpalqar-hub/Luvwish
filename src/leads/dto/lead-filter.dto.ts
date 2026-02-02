import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { LeadStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class LeadFilterDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(LeadStatus)
    status?: LeadStatus;

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
