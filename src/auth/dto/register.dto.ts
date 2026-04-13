import { Roles } from '@prisma/client';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'newuser@example.com',
    description: 'Unique email address for the user',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    example: 'SecurePassword123!',
    description: 'Password for the account (minimum 8 characters). If not provided, account is created without password.',
    minLength: 8,
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password: string;
}
