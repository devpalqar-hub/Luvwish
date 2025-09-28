import { Module, DynamicModule } from '@nestjs/common';
const Razorpay = require('razorpay');

export interface RazorpayModuleOptions {
  key_id: string;
  key_secret: string;
}

@Module({})
export class RazorpayModule {
  static forRoot(options: RazorpayModuleOptions): DynamicModule {
    const razorpayProvider = {
      provide: 'RAZORPAY_CLIENT',
      useFactory: () => {
        return new Razorpay({
          key_id: options.key_id,
          key_secret: options.key_secret,
        });
      },
    };

    return {
      module: RazorpayModule,
      providers: [razorpayProvider],
      exports: [razorpayProvider],
    };
  }
}
