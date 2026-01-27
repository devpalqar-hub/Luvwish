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
import { EnquiryService } from './enquiry.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { UpdateEnquiryDto } from './dto/update-enquiry.dto';
import { EnquiryQueryDto } from './dto/enquiry-query.dto';

@Controller('enquiries')
export class EnquiryController {
    constructor(private readonly enquiryService: EnquiryService) { }

    /**
     * Public endpoint
     * Used by client-side contact form
     */
    @Post()
    create(@Body() dto: CreateEnquiryDto) {
        return this.enquiryService.create(dto);
    }

    /**
     * Admin endpoints
     */
    @Get()
    findAll(@Query() query: EnquiryQueryDto) {
        return this.enquiryService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.enquiryService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateEnquiryDto,
    ) {
        return this.enquiryService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.enquiryService.remove(id);
    }
}
