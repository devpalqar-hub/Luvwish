import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class VerifyRegistrationOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}
