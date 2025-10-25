import { PartialType } from '@nestjs/mapped-types';
import { CreateTrackingDetailDto } from './create-tracking-detail.dto';

export class UpdateTrackingDetailDto extends PartialType(CreateTrackingDetailDto) { }
