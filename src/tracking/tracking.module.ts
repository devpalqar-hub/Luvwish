import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [PrismaModule, FirebaseModule, MailModule],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule { }
