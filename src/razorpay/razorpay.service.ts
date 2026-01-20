// src/payment/payment.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Razorpay from 'razorpay';
import { CreatePaymentIntentDto } from './dto/checkout.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { CoupounValueType } from '@prisma/client';

@Injectable()
export class RazorpayService {
  constructor(
    @Inject('RAZORPAY_CLIENT') private readonly razorpayClient: Razorpay,
    private prisma: PrismaService,
  ) { }

  async createOrder(dto: CreatePaymentIntentDto, customerProfileId: string) {
    const {
      productId,
      quantity,
      useCart,
      currency,
      ShippingAddressId,
      paymentMethod,
      couponName,
    } = dto;

    // 1️⃣ Get customer profile
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId: customerProfileId },
    });

    if (!customerProfile) {
      throw new Error('Customer profile not found');
    }

    // 2️⃣ Get shipping address
    if (!ShippingAddressId) {
      throw new Error('Shipping address is required');
    }

    const shippingAddrs = await this.prisma.address.findUnique({
      where: {
        id: ShippingAddressId,
        customerProfileId: customerProfile.id,
      },
    });

    if (!shippingAddrs) {
      throw new Error('Shipping address not found');
    }

    let coupuon: {
      id: string;
      Value: string;
      ValueType: CoupounValueType;
    } | null = null;

    if (couponName) {
      coupuon = await this.prisma.coupon.findUnique({
        where: { couponName },
        select: {
          id: true,
          Value: true,
          ValueType: true,
        },
      });

      if (!coupuon) {
        throw new Error('Coupon not found');
      }
    }

    let amount = 0;
    const orderItemsData: any[] = [];

    // 4️⃣ Calculate order amount
    if (productId) {
      if (!quantity || quantity < 1) {
        throw new Error('Quantity must be at least 1');
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      if (quantity > product.stockCount) {
        throw new Error('Insufficient stock');
      }

      amount = Number(product.discountedPrice) * quantity;

      orderItemsData.push({
        productId: product.id,
        quantity,
        discountedPrice: product.discountedPrice,
        actualPrice: product.actualPrice,
      });
    } else if (useCart) {
      const cartItems = await this.prisma.cartItem.findMany({
        where: { customerProfileId: customerProfile.id },
        include: { product: true },
      });

      if (!cartItems.length) {
        throw new Error('Cart is empty');
      }

      for (const item of cartItems) {
        if (!item.product) continue;

        amount += Number(item.product.discountedPrice) * (item.quantity ?? 1);

        orderItemsData.push({
          productId: item.product.id,
          quantity: item.quantity ?? 1,
          discountedPrice: item.product.discountedPrice,
          actualPrice: item.product.actualPrice,
        });
      }
    } else {
      throw new Error('Either productId or useCart must be provided');
    }

    // 5️⃣ Apply coupon ONCE (after total calculation)
    if (coupuon) {
      if (coupuon.ValueType === CoupounValueType.amount) {
        amount -= Number(coupuon.Value);
      } else if (coupuon.ValueType === CoupounValueType.percentage) {
        amount -= (amount * Number(coupuon.Value)) / 100;
      }

      if (amount < 0) amount = 0;
    }

    // 6️⃣ Create order
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
        coupounId: coupuon?.id ?? null,
        isCoupuonApplied: !!coupuon,
        items: {
          create: orderItemsData,
        },
      },
    });

    // 7️⃣ Clear cart if checkout via cart
    if (useCart) {
      await this.prisma.cartItem.deleteMany({
        where: { customerProfileId: customerProfile.id },
      });
    }

    // 8️⃣ COD flow
    if (isCOD) {
      await this.prisma.trackingDetail.create({
        data: {
          orderId: order.id,
          carrier: 'Internal',
          trackingNumber: order.orderNumber,
          trackingUrl: null,
          status: 'order_placed',
          statusHistory: [
            {
              status: 'order_placed',
              timestamp: new Date().toISOString(),
              notes: 'Order placed with Cash on Delivery',
            },
          ],
          lastUpdatedAt: new Date(),
        },
      });

      const completeOrder = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              product: {
                include: { images: true },
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

    // 9️⃣ Razorpay flow
    const options = {
      amount: Math.round(amount * 100),
      currency: currency || 'INR',
      receipt: order.orderNumber,
    };

    try {
      const razorpayOrder = await this.razorpayClient.orders.create(options);

      await this.prisma.order.update({
        where: { id: order.id },
        data: { razorpay_id: razorpayOrder.id },
      });

      return {
        message: 'Order created successfully',
        orderId: order.id,
        razorpayOrder,
      };
    } catch (error) {
      await this.prisma.order.delete({
        where: { id: order.id },
      });
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
    if (existingOrder.coupounId) {
      const coupuon = await this.prisma.coupon.findUnique({
        where: { couponName: existingOrder.coupounId },
      });
      if (!coupuon) throw new Error('Coupoun Not Found');
    }

    // Step 3: Update payment status
    const order = await this.prisma.order.update({
      where: { id: existingOrder.id },
      data: {
        paymentStatus: 'completed',
        status: 'confirmed',
        isCoupuonApplied: true,
      },
    });

    await this.prisma.couponUsage.create({
      data: {
        couponId: existingOrder.coupounId,
        customerProfileId: existingOrder.customerProfileId,
      },
    });

    // Step 4: Create tracking details for online payment
    const existingTracking = await this.prisma.trackingDetail.findUnique({
      where: { orderId: existingOrder.id },
    });

    if (!existingTracking) {
      const initialHistory = [
        {
          status: 'order_placed',
          timestamp: new Date().toISOString(),
          notes: 'Order placed and payment verified successfully',
        },
      ];

      await this.prisma.trackingDetail.create({
        data: {
          orderId: order.id,
          carrier: 'Internal',
          trackingNumber: order.orderNumber,
          trackingUrl: null,
          status: 'order_placed',
          statusHistory: initialHistory,
          lastUpdatedAt: new Date(),
        },
      });
    }

    return { success: true, order };
  }

  // Add more methods for payment verification, refunds, etc.
}
