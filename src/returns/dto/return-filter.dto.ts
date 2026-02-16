import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnStatus } from '@prisma/client';

export class ReturnFilterDto {
  @ApiPropertyOptional({ example: 'uuid-of-order', description: 'Filter by order ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-delivery-partner', description: 'Filter by delivery partner' })
  @IsOptional()
  @IsString()
  deliveryPartnerId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-customer', description: 'Filter by customer profile ID' })
  @IsOptional()
  @IsString()
  customerProfileId?: string;

  @ApiPropertyOptional({ enum: ReturnStatus, example: 'pending', description: 'Filter by return status' })
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Start date (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-02-16', description: 'End date (ISO format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '1', description: 'Page number' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '10', description: 'Items per page' })
  @IsOptional()
  @IsString()
  limit?: string;
}
