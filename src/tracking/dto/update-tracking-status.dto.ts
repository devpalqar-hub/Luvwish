import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TrackingStatus } from '@prisma/client';

export class UpdateTrackingStatusDto {
  @IsEnum(TrackingStatus)
  status: TrackingStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
