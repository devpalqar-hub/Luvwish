import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryPartnerAnalyticsQueryDto {
  @ApiPropertyOptional({ 
    example: 'uuid-of-delivery-partner', 
    description: 'Delivery partner ID (required for admin, ignored for delivery partner role)' 
  })
  @IsOptional()
  @IsString()
  partnerId?: string;

  @ApiPropertyOptional({ 
    example: '2026-01-01', 
    description: 'Start date for analytics (ISO format)' 
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    example: '2026-02-16', 
    description: 'End date for analytics (ISO format)' 
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
