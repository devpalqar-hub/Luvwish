import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TrackingDetailService } from './tracking-detail.service';
import { CreateTrackingDetailDto } from './dto/create-tracking-detail.dto';
import { UpdateTrackingDetailDto } from './dto/update-tracking-detail.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
    ApiBearerAuth,
    ApiBody,
    ApiForbiddenResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Tracking Details')
@Controller('tracking-details')
export class TrackingDetailController {
    constructor(private readonly trackingDetailService: TrackingDetailService) { }

    // 🔹 Create
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('ADMIN')
    @Post()
    @ApiOperation({ summary: 'Create tracking detail record' })
    @ApiBody({ type: CreateTrackingDetailDto })
    @ApiOkResponse({ description: 'Tracking detail created successfully' })
    create(@Body() dto: CreateTrackingDetailDto) {
        return this.trackingDetailService.create(dto);
    }

    // 🔹 Get all
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get()
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all tracking detail records' })
    @ApiOkResponse({ description: 'Tracking details returned successfully' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
    @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN role' })
    findAll() {
        return this.trackingDetailService.findAll();
    }

    // 🔹 Get by ID
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get tracking detail by id' })
    @ApiParam({ name: 'id', description: 'Tracking detail id' })
    @ApiOkResponse({ description: 'Tracking detail returned successfully' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
    @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN role' })
    findOne(@Param('id') id: string) {
        return this.trackingDetailService.findOne(id);
    }

    // 🔹 Update
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update tracking detail by id' })
    @ApiParam({ name: 'id', description: 'Tracking detail id' })
    @ApiBody({ type: UpdateTrackingDetailDto })
    @ApiOkResponse({ description: 'Tracking detail updated successfully' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
    @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN role' })
    update(@Param('id') id: string, @Body() dto: UpdateTrackingDetailDto) {
        return this.trackingDetailService.update(id, dto);
    }

    // 🔹 Delete
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Delete(':id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete tracking detail by id' })
    @ApiParam({ name: 'id', description: 'Tracking detail id' })
    @ApiOkResponse({ description: 'Tracking detail deleted successfully' })
    @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
    @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN role' })
    remove(@Param('id') id: string) {
        return this.trackingDetailService.remove(id);
    }
}
