// src/payment/payment.controller.ts
import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { CreatePaymentIntentDto } from './dto/checkout.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('payments')
export class RazorpayController {
  constructor(private readonly razorpayService: RazorpayService) { }

  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  async createOrder(@Request() req, @Body() dto: CreatePaymentIntentDto) {
    const user = req.user.id;
    return this.razorpayService.createOrder(dto, user);
  }

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

  // Add endpoints for verifying payments, handling webhooks, etc.
}