import { Module } from '@nestjs/common';
import { TrackingDetailService } from './tracking-detail.service';
import { TrackingDetailController } from './tracking-detail.controller';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingModule } from './tracking.module';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { MailModule } from 'src/mail/mail.module';
import { FirebaseModule } from 'src/firebase/firebase.module';

@Module({
    controllers: [TrackingDetailController, TrackingController],
    providers: [TrackingDetailService, PrismaService, TrackingService],
    exports: [TrackingDetailService],
    imports: [TrackingModule, MailModule, FirebaseModule], // export if other modules need it
})
export class TrackingDetailModule { }
