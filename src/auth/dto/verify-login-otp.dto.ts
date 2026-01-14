import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class VerifyLoginOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}
