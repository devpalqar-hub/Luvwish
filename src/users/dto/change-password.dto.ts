import { IsString, MinLength, Matches } from 'class-validator';
import { Match } from '../decorator/match.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword123!',
    description: 'Current password for verification',
  })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    example: 'NewPassword456!',
    description: 'New password (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;

  @ApiProperty({
    example: 'NewPassword456!',
    description: 'Confirm new password (must match newPassword)',
  })
  @IsString()
  @Match('newPassword', { message: 'Confirm password must match new password' })
  confirmPassword: string;
}
