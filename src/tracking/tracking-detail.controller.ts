import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TrackingDetailService } from './tracking-detail.service';
import { CreateTrackingDetailDto } from './dto/create-tracking-detail.dto';
import { UpdateTrackingDetailDto } from './dto/update-tracking-detail.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Tracking Details')
@Controller('tracking-details')
export class TrackingDetailController {
    constructor(private readonly trackingDetailService: TrackingDetailService) { }

    // 🔹 Create
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('ADMIN')
    @Post()
    create(@Body() dto: CreateTrackingDetailDto) {
        return this.trackingDetailService.create(dto);
    }

    // 🔹 Get all
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get()
    findAll() {
        return this.trackingDetailService.findAll();
    }

    // 🔹 Get by ID
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.trackingDetailService.findOne(id);
    }

    // 🔹 Update
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateTrackingDetailDto) {
        return this.trackingDetailService.update(id, dto);
    }

    // 🔹 Delete
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.trackingDetailService.remove(id);
    }
}
