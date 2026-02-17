import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeliveryPartnerDto {
  @ApiProperty({ example: 'John Doe', description: 'Delivery partner name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'delivery@example.com', description: 'Delivery partner email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Delivery partner password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;


  @ApiProperty({ example: '123598239509', description: 'Delivery partner phone number' })
  @IsString()
  phone: string;
}
