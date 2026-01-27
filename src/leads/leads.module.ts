import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadLogsModule } from 'src/lead-log/lead-logs.module';

@Module({
    imports: [LeadLogsModule],
    controllers: [LeadsController],
    providers: [LeadsService],
    exports: [LeadsService], // 👈 important for importing into other modules
})
export class LeadsModule { }
