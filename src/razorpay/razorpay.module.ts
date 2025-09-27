// src/razorpay/razorpay.module.ts
import { Module, DynamicModule } from '@nestjs/common';
import Razorpay from 'razorpay';
import { PrismaModule } from '../prisma/prisma.module';

export interface RazorpayModuleOptions {
  key_id: string;
  key_secret: string;
}

@Module({})
export class RazorpayModule {
  static forRoot(options: RazorpayModuleOptions): DynamicModule {
    return {
      module: RazorpayModule,
      providers: [
        {
          provide: 'RAZORPAY_CLIENT', // Token to inject Razorpay instance
          useValue: new Razorpay(options),
        },
      ],
      exports: ['RAZORPAY_CLIENT'], // Export for injection in other modules
      imports: [PrismaModule]
    };
  }
}