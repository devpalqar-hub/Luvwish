import { IsString, MinLength, Matches } from 'class-validator';
import { Match } from '../decorator/match.decorator';

export class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;

  @IsString()
  @Match('newPassword', { message: 'Confirm password must match new password' })
  confirmPassword: string;
}
