import { Module } from '@nestjs/common';
import { EnquiryService } from './enquiry.service';
import { EnquiryController } from './enquiry.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LeadsModule } from 'src/leads/leads.module';

@Module({
    imports: [PrismaModule, LeadsModule],
    controllers: [EnquiryController],
    providers: [EnquiryService],
    exports: [EnquiryService],
})
export class EnquiryModule { }
