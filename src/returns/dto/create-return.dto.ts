import { IsString, IsEnum, IsArray, ValidateNested, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundMethod } from '@prisma/client';

export class ReturnItemDto {
  @ApiProperty({ example: 'uuid-of-order-item', description: 'Order item ID to return' })
  @IsString()
  orderItemId: string;

  @ApiProperty({ example: 1, description: 'Quantity to return' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Product defective', description: 'Specific reason for this item' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateReturnDto {
  @ApiProperty({ example: 'uuid-of-order', description: 'Order ID to create return for' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'full', enum: ['full', 'partial'], description: 'Return type: full order or specific items' })
  @IsEnum(['full', 'partial'])
  returnType: 'full' | 'partial';

  @ApiProperty({ example: 'Product not as described', description: 'Reason for return' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ type: [ReturnItemDto], description: 'Items to return (required for partial returns)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items?: ReturnItemDto[];

  @ApiProperty({ 
    example: 'original_payment', 
    enum: RefundMethod,
    description: 'Preferred refund method' 
  })
  @IsEnum(RefundMethod)
  refundMethod: RefundMethod;
}
