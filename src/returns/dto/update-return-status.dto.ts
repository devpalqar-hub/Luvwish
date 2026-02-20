import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnPaymentMethod, ReturnStatus } from '@prisma/client';

export class UpdateReturnStatusDto {
  @ApiProperty({
    enum: ReturnStatus,
    example: 'picked_up',
    description: 'New return status'
  })
  @IsEnum(ReturnStatus)
  status: ReturnStatus;

  @ApiPropertyOptional({ example: 'Items collected successfully', description: 'Optional notes' })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiProperty({
    enum: ReturnPaymentMethod,
    example: 'cash',
    description: 'How the customer will be refunded (e.g., cash or online)'
  })
  @IsEnum(ReturnPaymentMethod)
  @IsOptional()
  returnPaymentMethod: ReturnPaymentMethod;
}
