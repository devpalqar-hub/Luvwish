import { Module } from '@nestjs/common';
import { TrackingDetailService } from './tracking-detail.service';
import { TrackingDetailController } from './tracking-detail.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [TrackingDetailController],
    providers: [TrackingDetailService, PrismaService],
    exports: [TrackingDetailService], // export if other modules need it
})
export class TrackingDetailModule { }
