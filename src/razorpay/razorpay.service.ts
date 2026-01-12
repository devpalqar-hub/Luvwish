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
    const { productId, quantity, useCart, currency, ShippingAddressId, paymentMethod } = dto;
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId: customerProfileId },
    });
    if (!customerProfile) throw new Error('Customer profile not found');

    const shippingAddrs = await this.prisma.address.findUnique({
      where: { id: ShippingAddressId, customerProfileId: customerProfile.id },
    });
    if (!shippingAddrs) throw new Error('Shipping address is required');

    let amount = 0;
    let orderItemsData = [];

    // 1️⃣ Calculate total amount
    if (productId) {
      if (!quantity || quantity < 1) throw new Error('Quantity must be at least 1');
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
    else if (useCart) {
      const cartItems = await this.prisma.cartItem.findMany({
        where: { customerProfileId: customerProfile.id },
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
      throw new Error('Either productId or useCart must be provided');
    }

    // 2️⃣ Create Order
    const isCOD = paymentMethod === 'cash_on_delivery';
    const order = await this.prisma.order.create({
      data: {
        customerProfileId: customerProfile.id,
        orderNumber: `ORD-${Date.now()}`,
        status: isCOD ? 'confirmed' : 'pending',
        paymentStatus: 'pending',
        paymentMethod: paymentMethod || 'cash_on_delivery',
        totalAmount: amount,
        shippingAddressId: shippingAddrs.id,
        items: {
          create: orderItemsData.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            discountedPrice: item.discountedPrice,
            actualPrice: item.actualPrice,
          })),
        },
      },
    });

    // 3️⃣ Clear cart if useCart was true
    if (useCart) {
      await this.prisma.cartItem.deleteMany({
        where: { customerProfileId: customerProfile.id },
      });
    }

    // 4️⃣ Handle payment method
    if (paymentMethod === 'cash_on_delivery') {
      // For COD, create tracking details
      await this.prisma.trackingDetail.create({
        data: {
          orderId: order.id,
          carrier: 'Internal',
          trackingNumber: order.orderNumber,
          trackingUrl: null,
          lastUpdatedAt: new Date(),
        },
      });

      // Fetch the complete order with tracking and items
      const completeOrder = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: true,
                },
              },
            },
          },
          shippingAddress: true,
          tracking: true,
        },
      });

      return {
        message: 'Order created successfully with Cash on Delivery',
        order: completeOrder,
        paymentMethod: 'cash_on_delivery',
      };
    }

    // 5️⃣ Create Razorpay order for online payments
    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: order.orderNumber,
    };

    try {
      const razorpayOrder = await this.razorpayClient.orders.create(options);
      console.log('Razorpay Order:', razorpayOrder.id);
      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: { razorpay_id: razorpayOrder.id },
      });

      return {
        message: 'Order created successfully',
        updatedOrder,
        razorpayOrder,
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      await this.prisma.order.delete({ where: { id: order.id } });
      throw error;
    }
  }


  async verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    // Step 1: Generate expected signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return { success: false, message: 'Payment verification failed' };
    }

    // Step 2: Find your DB order by razorpayOrderId (trackingID) or orderNumber (receipt)
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        razorpay_id: razorpayOrderId, // if you stored it here
        // OR
        // orderNumber: yourReceipt
      },
    });

    if (!existingOrder) {
      return { success: false, message: 'Order not found for verification' };
    }

    // Step 3: Update payment status
    const order = await this.prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        paymentStatus: 'completed',
        status: 'confirmed',
      },
    });

    return { success: true, order };
  }


  // Add more methods for payment verification, refunds, etc.
}