import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDeliveryPartnerDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Delivery partner name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'newemail@example.com', description: 'Delivery partner email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'newpassword123', description: 'New password (min 6 characters)' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;


  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg', description: 'Delivery partner profile picture URL' })
  @IsOptional()
  @IsString()
  profilePicture?: string;
}
