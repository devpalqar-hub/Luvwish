import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppMessageHandler } from './whatsapp-message.handler';
import { WhatsAppGateway } from './whatsapp.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { S3Service } from '../s3/s3.service';
import { MailService } from '../mail/mail.service';
import { FirebaseSender } from '../firebase/firebase.sender';

@Module({
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    WhatsAppMessageHandler,
    WhatsAppGateway,
    PrismaService,
    ProductsService,
    CartService,
    OrdersService,
    S3Service,
    MailService,
    FirebaseSender,
  ],
  exports: [WhatsAppService, WhatsAppGateway],
})
export class WhatsAppModule {}
