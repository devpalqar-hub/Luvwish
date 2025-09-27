// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ResponseModule } from './response/response.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { RazorpayModule } from './razorpay/razorpay.module';
import { CouponModule } from './coupouns/coupouns.module';
import { NotificationsModule } from './firebase/notifications.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { BankDetailsModule } from './bank-details/bank-details.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env${process.env.NODE_ENV === 'test' ? '.test' : ''}`,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ResponseModule,
    ScheduleModule.forRoot(),
    ProductsModule,
    CartModule,
    CouponModule,
    NotificationsModule,
    WishlistModule,
    BankDetailsModule,

    RazorpayModule.forRoot({
      key_id: process.env.RAZORPAY_KEY_ID, // Use environment variables for keys
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    }),
  ],
})
export class AppModule { }
