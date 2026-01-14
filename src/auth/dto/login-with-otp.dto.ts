import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginWithOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
