import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrackingDetailDto } from './dto/create-tracking-detail.dto';
import { UpdateTrackingDetailDto } from './dto/update-tracking-detail.dto';


@Injectable()
export class TrackingDetailService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateTrackingDetailDto) {
        return this.prisma.trackingDetail.create({
            data: {
                ...dto,
                lastUpdatedAt: new Date(),
            },
        });
    }

    async findAll() {
        return this.prisma.trackingDetail.findMany({
            include: { order: true }, // include order if needed
        });
    }

    async findOne(id: string) {
        const tracking = await this.prisma.trackingDetail.findUnique({
            where: { id },
            include: { order: true },
        });
        if (!tracking) throw new NotFoundException(`Tracking detail not found`);
        return tracking;
    }

    async update(id: string, dto: UpdateTrackingDetailDto) {
        return this.prisma.trackingDetail.update({
            where: { id },
            data: {
                ...dto,
                lastUpdatedAt: new Date(), // auto update timestamp
            },
        });
    }

    async remove(id: string) {
        return this.prisma.trackingDetail.delete({
            where: { id },
        });
    }
}
