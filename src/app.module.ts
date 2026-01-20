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
import { MailerModule } from '@nestjs-modules/mailer';
import { AddressModule } from './address/address.module';
import { RazorpayService } from './razorpay/razorpay.service';
import { RazorpayController } from './razorpay/razorpay.controller';
import { OrdersModule } from './orders/orders.module';
import { TrackingDetailModule } from './tracking/tracking-detail.module';
import { TrackingModule } from './tracking/tracking.module';
import { ReviewModule } from './reviews/review.module';
import { ProductVariationsModule } from './product-variations/product-variations.module';
import { CategoriesModule } from './categories/categories.module';
import { SubCategoriesModule } from './subcategories/subcategories.module';
import { S3Module } from './s3/s3.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BannersModule } from './banners/banners.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { join } from 'path';

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
    // NotificationsModule,
    WishlistModule,
    AddressModule,
    ProductVariationsModule,
    OrdersModule,
    TrackingDetailModule,
    TrackingModule,
    CategoriesModule,
    SubCategoriesModule,
    ReviewModule,
    S3Module,
    DashboardModule,
    RazorpayModule.forRoot({
      key_id: process.env.RAZORPAY_KEY_ID, // Use environment variables for keys
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    }),
    BannersModule,
    AnalyticsModule,
  ],
  providers: [RazorpayService],
  controllers: [RazorpayController],
})
export class AppModule { }
