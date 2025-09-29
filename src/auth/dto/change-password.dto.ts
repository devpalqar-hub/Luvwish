import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
    @IsString()
    oldPassword: string;

    @IsString()
    @MinLength(8)
    @MaxLength(32)
    @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).*$/, {
        message: 'New password must contain uppercase, lowercase, and number',
    })
    newPassword: string;

    @IsString()
    confirmPassword: string;
}
