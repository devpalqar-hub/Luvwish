import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterWithOtpDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
