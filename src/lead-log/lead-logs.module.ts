import { Module } from '@nestjs/common';
import { LeadLogsService } from './lead-logs.service';
import { LeadLogsController } from './lead-logs.controller';

@Module({
    controllers: [LeadLogsController],
    providers: [LeadLogsService],
    exports: [LeadLogsService], // ✅ Exported for use in other modules
})
export class LeadLogsModule { }
