import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppMessageHandler } from './whatsapp-message.handler';
// WebSocket Gateway not needed for order listing and booking
// import { WhatsAppGateway } from './whatsapp.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { S3Service } from '../s3/s3.service';
import { MailService } from '../mail/mail.service';
import { FirebaseSender } from '../firebase/firebase.sender';
import { EnquiryModule } from 'src/enquiry-forms/enquiry.module';
import { RazorpayModule } from 'src/razorpay/razorpay.module';
import { AddressModule } from 'src/address/address.module';

@Module({
  imports: [EnquiryModule, RazorpayModule, AddressModule],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    WhatsAppMessageHandler,
    // WhatsAppGateway, // Not needed for order functionality
    PrismaService,
    ProductsService,
    CartService,
    OrdersService,
    S3Service,
    MailService,
    FirebaseSender,
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule { }
