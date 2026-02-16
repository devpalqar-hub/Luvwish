import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignDeliveryPartnerDto {
  @ApiProperty({ example: 'uuid-of-delivery-partner', description: 'ID of the delivery partner to assign' })
  @IsString()
  deliveryPartnerId: string;
}
