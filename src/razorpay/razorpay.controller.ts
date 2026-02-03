// src/payment/payment.controller.ts
import { Controller, Post, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { CreatePaymentIntentDto } from './dto/checkout.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class RazorpayController {
  constructor(private readonly razorpayService: RazorpayService) { }

  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  async createOrder(@Request() req, @Body() dto: CreatePaymentIntentDto) {
    const user = req.user.id;
    return this.razorpayService.createOrder(dto, user);
  }

  // @Post('webhook/myfatoorah')
  // @HttpCode(200) // MUST return 200
  // async handleMyFatoorahWebhook(@Body() payload: any) {
  //   // Never trust payload alone – verify using API
  //   await this.razorpayService.processMyFatoorahWebhook(payload);
  //   return { received: true };
  // }

  @Post('verify-payment')
  async verifyPayment(@Body() body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    return this.razorpayService.verifyPaymentSignature(
      body.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature
    );
  }


  @Post('myfatoorah')
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.razorpayService.createPayment(dto);
  }
}