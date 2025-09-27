// src/payment/payment.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Razorpay from 'razorpay';
import { CreatePaymentIntentDto } from './dto/checkout.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
  constructor(@Inject('RAZORPAY_CLIENT') private readonly razorpayClient: Razorpay, private prisma: PrismaService) { }

  async createOrder(dto: CreatePaymentIntentDto, customerProfileId: string) {
    const { productId, quantity, cartId, currency } = dto;

    let amount = 0;
    let orderItemsData = []; // for creating order_items

    // 1️⃣ Calculate total amount
    if (productId) {
      const pdt = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!pdt) throw new Error('Product not found');
      if (quantity > pdt.stockCount) throw new Error('Insufficient stock');

      amount = Number(pdt.discountedPrice) * quantity;

      orderItemsData.push({
        productId: pdt.id,
        quantity,
        discountedPrice: pdt.discountedPrice,
        actualPrice: pdt.actualPrice,
      });
    }
    else if (cartId) {
      // Get all cart items for the customer
      const cartItems = await this.prisma.cartItem.findMany({
        where: { customerProfileId: customerProfileId },
        include: { product: true },
      });

      if (!cartItems || cartItems.length === 0)
        throw new Error('Cart is empty');

      cartItems.forEach((item) => {
        if (!item.product) return;
        amount += Number(item.product.discountedPrice) * (item.quantity ?? 1);

        orderItemsData.push({
          productId: item.product.id,
          quantity: item.quantity ?? 1,
          discountedPrice: item.product.discountedPrice,
          actualPrice: item.product.actualPrice,
        });
      });
    }
    else {
      throw new Error('Either productId or cartId must be provided');
    }

    // 2️⃣ Create Order in DB with pending status
    const order = await this.prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}`, // simple unique number
        status: 'pending',
        paymentStatus: 'pending',
        totalAmount: amount,
        customerProfileId,
        items: {
          create: orderItemsData.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            discountedPrice: item.discountedPrice,
            actualPrice: item.actualPrice,
            paymentId: 'razorpay_temp', // placeholder, will update after Razorpay order creation
          })),
        },
      },
      include: { items: true },
    });

    // 3️⃣ Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // in paisa
      currency: currency ?? 'INR',
      receipt: order.orderNumber,
    };

    try {
      const razorpayOrder = await this.razorpayClient.orders.create(options);

      // Optional: store Razorpay order id in DB (trackingID)
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          trackingID: razorpayOrder.id, // can store Razorpay order id here
        },
      });

      return {
        message: 'Order created successfully',
        order,
        razorpayOrder,
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      // roll back the order if Razorpay order fails
      await this.prisma.order.delete({ where: { id: order.id } });
      throw error;
    }
  }

  async verifyPaymentSignature(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpayOrderId + '|' + razorpayPaymentId)
      .digest('hex');

    if (generatedSignature === razorpaySignature) {
      // Payment verified
      const existingOrder = await this.prisma.order.findUnique({
        where: { trackingID: razorpayOrderId },
      });
      if (!existingOrder) {
        return { success: false, message: 'Order not found for verification' };
      }
      const order = await this.prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          paymentStatus: 'completed',
          status: 'confirmed',
        },
      });
      return { success: true, order };
    } else {
      // Signature mismatch
      return { success: false, message: 'Payment verification failed' };
    }
  }



  // Add more methods for payment verification, refunds, etc.
}