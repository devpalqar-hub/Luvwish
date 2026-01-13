import { Module } from '@nestjs/common';
import { TrackingDetailService } from './tracking-detail.service';
import { TrackingDetailController } from './tracking-detail.controller';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingModule } from './tracking.module';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';

@Module({
    controllers: [TrackingDetailController, TrackingController],
    providers: [TrackingDetailService, PrismaService, TrackingService],
    exports: [TrackingDetailService],
    imports: [TrackingModule], // export if other modules need it
})
export class TrackingDetailModule { }
