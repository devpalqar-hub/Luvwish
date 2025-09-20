// dto/mark-helpful.dto.ts
import { IsUUID } from 'class-validator';

export class MarkHelpfulDto {
    @IsUUID()
    reviewId: string;
}
