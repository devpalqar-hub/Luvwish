import { Module } from '@nestjs/common';
import { DeliveryChargesService } from './delivery-charges.service';
import { DeliveryChargesController } from './delivery-charges.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [DeliveryChargesController],
    providers: [DeliveryChargesService, PrismaService],
    exports: [DeliveryChargesService],
})
export class DeliveryChargesModule { }
