import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLeadLogDto {
    @IsString()
    action: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    additionalNotes?: string;

    @IsUUID()
    leadId: string;
}
