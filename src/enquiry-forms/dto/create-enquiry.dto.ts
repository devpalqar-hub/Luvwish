import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { EnquiryPurpose } from '@prisma/client';

export class CreateEnquiryDto {
    @IsString()
    @Length(2, 100)
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @Length(7, 15)
    phone: string;

    @IsOptional()
    @IsEnum(EnquiryPurpose)
    purpose?: EnquiryPurpose;

    @IsOptional()
    @IsString()
    @Length(0, 1000)
    additionalNotes?: string;
}
