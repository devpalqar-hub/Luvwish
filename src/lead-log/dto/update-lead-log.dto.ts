import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadLogDto } from './create-lead-log.dto';

export class UpdateLeadLogDto extends PartialType(CreateLeadLogDto) { }
