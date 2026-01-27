import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { LeadLogsService } from './lead-logs.service';
import { CreateLeadLogDto } from './dto/create-lead-log.dto';
import { UpdateLeadLogDto } from './dto/update-lead-log.dto';
import { LeadLogFilterDto } from './dto/lead-log-filter.dto';

@Controller('lead-logs')
export class LeadLogsController {
    constructor(private readonly leadLogsService: LeadLogsService) { }

    @Post()
    create(@Body() dto: CreateLeadLogDto) {
        return this.leadLogsService.create(dto);
    }

    @Get()
    findAll(@Query() filter: LeadLogFilterDto) {
        return this.leadLogsService.findAll(filter);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.leadLogsService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateLeadLogDto,
    ) {
        return this.leadLogsService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.leadLogsService.remove(id);
    }
}
