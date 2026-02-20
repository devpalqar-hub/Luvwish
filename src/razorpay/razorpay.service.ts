// src/payment/payment.service.ts
import { Injectable, Inject, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import Razorpay from 'razorpay';
import { CreatePaymentIntentDto } from './dto/checkout.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { CoupounValueType, OrderStatus, PaymentMethod, PaymentStatus, Roles } from '@prisma/client';
import { MailService } from 'src/mail/mail.service';
import { FirebaseSender } from 'src/firebase/firebase.sender';
import { MyFatoorahService } from './myfatoorah.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class RazorpayService {
  private readonly baseUrl = 'https://apitest.myfatoorah.com/v3/payments';
  constructor(
    @Inject('RAZORPAY_CLIENT') private readonly razorpayClient: Razorpay,
    private prisma: PrismaService,
    private readonly emailService: MailService,
    private readonly firebaseSender: FirebaseSender,
    private readonly myFatoorahService: MyFatoorahService,
    private readonly httpService: HttpService,
  ) { }

  // async createOrder(dto: CreatePaymentIntentDto, customerProfileId: string) {
  //   const {
  //     productId,
  //     quantity,
  //     useCart,
  //     currency,
  //     ShippingAddressId,
  //     paymentMethod,
  //     couponName,
  //   } = dto;

  //   // 1️⃣ Get customer profile
  //   const customerProfile = await this.prisma.customerProfile.findUnique({
  //     where: { userId: customerProfileId },
  //   });

  //   if (!customerProfile) {
  //     throw new Error('Customer profile not found');
  //   }

  //   // 2️⃣ Get shipping address
  //   if (!ShippingAddressId) {
  //     throw new Error('Shipping address is required');
  //   }

  //   const shippingAddrs = await this.prisma.address.findUnique({
  //     where: {
  //       id: ShippingAddressId,
  //       customerProfileId: customerProfile.id,
  //     },
  //   });

  //   if (!shippingAddrs) {
  //     throw new Error('Shipping address not found');
  //   }

  //   const deliverCharge = await this.prisma.deliveryCharges.findUnique({
  //     where: { postalCode: shippingAddrs.postalCode },
  //   });

  //   if (!deliverCharge) {
  //     throw new Error('Sorry. We are not delivering at your location currently.');
  //   }

  //   let coupuon: {
  //     id: string;
  //     Value: string;
  //     ValueType: CoupounValueType;
  //   } | null = null;

  //   if (couponName) {
  //     coupuon = await this.prisma.coupon.findUnique({
  //       where: { couponName },
  //       select: {
  //         id: true,
  //         Value: true,
  //         ValueType: true,
  //       },
  //     });

  //     if (!coupuon) {
  //       throw new Error('Coupon not found');
  //     }
  //   }

  //   let amount = 0;
  //   const orderItemsData: any[] = [];

  //   // 4️⃣ Calculate order amount
  //   if (productId) {
  //     if (!quantity || quantity < 1) {
  //       throw new Error('Quantity must be at least 1');
  //     }

  //     const product = await this.prisma.product.findUnique({
  //       where: { id: productId },
  //     });

  //     if (!product) {
  //       throw new Error('Product not found');
  //     }

  //     if (quantity > product.stockCount) {
  //       throw new Error('Insufficient stock');
  //     }

  //     amount = Number(product.discountedPrice) * quantity;

  //     orderItemsData.push({
  //       productId: product.id,
  //       quantity,
  //       discountedPrice: product.discountedPrice,
  //       actualPrice: product.actualPrice,
  //     });
  //   } else if (useCart) {
  //     const cartItems = await this.prisma.cartItem.findMany({
  //       where: { customerProfileId: customerProfile.id },
  //       include: {
  //         product: true,
  //         productVariation: true,
  //       },
  //     });

  //     if (!cartItems.length) {
  //       throw new Error('Cart is empty');
  //     }

  //     for (const item of cartItems) {
  //       const quantity = item.quantity ?? 1;

  //       // 🔹 CASE 1: Product Variation exists
  //       if (item.productVariation) {

  //         console.log("ehloooooooo")
  //         if (quantity > item.productVariation.stockCount) {
  //           throw new Error(
  //             `Insufficient stock for variation ${item.productVariation.variationName}`,
  //           );
  //         }

  //         const price = Number(item.productVariation.discountedPrice);

  //         amount += price * quantity;

  //         orderItemsData.push({
  //           productId: item.productVariation.productId,
  //           productVariationId: item.productVariation.id,
  //           quantity,
  //           discountedPrice: item.productVariation.discountedPrice,
  //           actualPrice: item.productVariation.actualPrice,
  //         });

  //         continue;
  //       }

  //       // 🔹 CASE 2: Normal product
  //       if (!item.product) continue;

  //       if (quantity > item.product.stockCount) {
  //         throw new Error(`Insufficient stock for product ${item.product.name}`);
  //       }

  //       const price = Number(item.product.discountedPrice);

  //       amount += price * quantity;

  //       orderItemsData.push({
  //         productId: item.product.id,
  //         quantity,
  //         discountedPrice: item.product.discountedPrice,
  //         actualPrice: item.product.actualPrice,
  //       });
  //     }
  //   }
  //   else {
  //     throw new Error('Either productId or useCart must be provided');
  //   }

  //   // 5️⃣ Apply coupon
  //   if (coupuon) {
  //     if (coupuon.ValueType === CoupounValueType.amount) {
  //       amount -= Number(coupuon.Value);
  //     } else if (coupuon.ValueType === CoupounValueType.percentage) {
  //       amount -= (amount * Number(coupuon.Value)) / 100;
  //     }

  //     if (amount < 0) amount = 0;
  //   }

  //   const isCOD = paymentMethod === 'cash_on_delivery';
  //   const orderAmount = amount;
  //   const shippingCost = Number(deliverCharge.deliveryCharge);
  //   const totalOrderAmount = orderAmount + shippingCost;


  //   // 6️⃣ CREATE ORDER + REDUCE STOCK (TRANSACTION)
  //   const order = await this.prisma.$transaction(async (tx) => {
  //     // Reduce stock
  //     for (const item of orderItemsData) {
  //       if (item.productVariationId) {
  //         const updated = await tx.productVariation.updateMany({
  //           where: {
  //             id: item.productVariationId,
  //             stockCount: { gte: item.quantity },
  //           },
  //           data: {
  //             stockCount: { decrement: item.quantity },
  //           },
  //         });

  //         if (updated.count === 0) {
  //           throw new Error('Insufficient variation stock during checkout');
  //         }
  //       } else {
  //         const updated = await tx.product.updateMany({
  //           where: {
  //             id: item.productId,
  //             stockCount: { gte: item.quantity },
  //           },
  //           data: {
  //             stockCount: { decrement: item.quantity },
  //           },
  //         });

  //         if (updated.count === 0) {
  //           throw new Error('Insufficient product stock during checkout');
  //         }
  //       }
  //     }

  //     console.log("hi devanand", shippingCost)

  //     const createdOrder = await tx.order.create({
  //       data: {
  //         customerProfileId: customerProfile.id,
  //         orderNumber: `ORD-${Date.now()}`,
  //         status: isCOD ? OrderStatus.confirmed : OrderStatus.pending,
  //         paymentStatus: isCOD
  //           ? PaymentStatus.pending
  //           : PaymentStatus.pending, // will be completed after gateway verification
  //         paymentMethod: paymentMethod ?? PaymentMethod.cash_on_delivery,
  //         totalAmount: totalOrderAmount,
  //         shippingAddressId: shippingAddrs.id,
  //         coupounId: coupuon?.id ?? null,
  //         isCoupuonApplied: !!coupuon,
  //         shippingCost,
  //         items: { create: orderItemsData },
  //       },
  //     });


  //     if (useCart) {
  //       await tx.cartItem.deleteMany({
  //         where: { customerProfileId: customerProfile.id },
  //       });
  //     }
  //     console.log("created createdOrder", createdOrder)
  //     return createdOrder;
  //   });


  //   // 8️⃣ COD flow
  //   if (isCOD) {
  //     await this.prisma.trackingDetail.create({
  //       data: {
  //         orderId: order.id,
  //         carrier: 'Internal',
  //         trackingNumber: order.orderNumber,
  //         trackingUrl: null,
  //         status: 'order_placed',
  //         statusHistory: [
  //           {
  //             status: 'order_placed',
  //             timestamp: new Date().toISOString(),
  //             notes: 'Order placed with Cash on Delivery',
  //           },
  //         ],
  //         lastUpdatedAt: new Date(),
  //       },
  //     });

  //     const completeOrder = await this.prisma.order.findUnique({
  //       where: { id: order.id },
  //       include: {
  //         items: {
  //           include: {
  //             product: { include: { images: true } },
  //           },
  //         },
  //         shippingAddress: true,
  //         tracking: true,
  //       },
  //     });

  //     return {
  //       message: 'Order created successfully with Cash on Delivery',
  //       order: completeOrder,
  //       paymentMethod: 'cash_on_delivery',
  //       orderAmount,
  //       shippingCost,
  //       totalOrderAmount,
  //     };
  //   }

  //   // 🔔 EMAIL & PUSH (NON-BLOCKING)
  //   (async () => {
  //     try {
  //       const orderForMail = await this.prisma.order.findUnique({
  //         where: { id: order.id },
  //         select: {
  //           orderNumber: true,
  //           totalAmount: true,
  //           paymentMethod: true,
  //           shippingCost: true,
  //           createdAt: true,
  //           CustomerProfile: {
  //             select: {
  //               name: true,
  //               phone: true,
  //               user: { select: { email: true } },
  //             },
  //           },
  //           items: {
  //             select: {
  //               quantity: true,
  //               discountedPrice: true,
  //               product: { select: { name: true } },
  //             },
  //           },
  //         },
  //       });

  //       await this.emailService.sendMail({
  //         to: process.env.ADMIN_EMAIL!,
  //         subject: `🛒 New Order Placed – ${orderForMail.orderNumber}`,
  //         template: 'admin-order-placed',
  //         context: {
  //           orderNumber: orderForMail.orderNumber,
  //           totalAmount: orderForMail.totalAmount,
  //           paymentMethod: orderForMail.paymentMethod,
  //           createdAt: orderForMail.createdAt,
  //           customer: {
  //             name: orderForMail.CustomerProfile?.name,
  //             email: orderForMail.CustomerProfile?.user?.email,
  //             phone: orderForMail.CustomerProfile?.phone,
  //           },
  //           items: orderForMail.items.map(item => ({
  //             name: item.product.name,
  //             quantity: item.quantity,
  //             price: item.discountedPrice,
  //           })),
  //         },
  //       });

  //       const adminTokens = await this.prisma.adminProfile.findMany({
  //         where: { fcmToken: { not: null } },
  //         select: { fcmToken: true },
  //       });

  //       await this.firebaseSender.sendPushMultiple(
  //         adminTokens.map(a => a.fcmToken),
  //         'New Order Placed',
  //         `Order ${order.orderNumber} placed for ₹${totalOrderAmount}`,
  //       );
  //     } catch (err) {
  //       console.error('Notification failed:', err);
  //     }
  //   })();

  //   // 9️⃣ Razorpay flow
  //   const options = {
  //     amount: Math.round(totalOrderAmount * 100),
  //     currency: currency || 'INR',
  //     receipt: order.orderNumber,
  //   };

  //   try {
  //     const razorpayOrder = await this.razorpayClient.orders.create(options);

  //     await this.prisma.order.update({
  //       where: { id: order.id },
  //       data: { razorpay_id: razorpayOrder.id },
  //     });

  //     return {
  //       message: 'Order created successfully',
  //       orderId: order.id,
  //       razorpayOrder,
  //     };
  //   } catch (error) {
  //     await this.prisma.order.delete({
  //       where: { id: order.id },
  //     });
  //     throw error;
  //   }
  // }



  // async createOrder(dto: CreatePaymentIntentDto, customerProfileId: string) {
  //   const {
  //     productId,
  //     quantity,
  //     useCart,
  //     currency,
  //     ShippingAddressId,
  //     paymentMethod,
  //     couponName,
  //     fatoorahPaymentId
  //   } = dto;

  //   // 1️⃣ Get customer profile
  //   const customerProfile = await this.prisma.customerProfile.findUnique({
  //     where: { userId: customerProfileId },
  //   });

  //   if (!customerProfile) {
  //     throw new Error('Customer profile not found');
  //   }

  //   // 2️⃣ Get shipping address
  //   if (!ShippingAddressId) {
  //     throw new Error('Shipping address is required');
  //   }

  //   const shippingAddrs = await this.prisma.address.findUnique({
  //     where: {
  //       id: ShippingAddressId,
  //       customerProfileId: customerProfile.id,
  //     },
  //   });

  //   if (!shippingAddrs) {
  //     throw new Error('Shipping address not found');
  //   }

  //   const deliverCharge = await this.prisma.deliveryCharges.findUnique({
  //     where: { postalCode: shippingAddrs.postalCode },
  //   });

  //   if (!deliverCharge) {
  //     throw new Error('Sorry. We are not delivering at your location currently.');
  //   }

  //   let coupuon: {
  //     id: string;
  //     Value: string;
  //     ValueType: CoupounValueType;
  //   } | null = null;

  //   if (couponName) {
  //     coupuon = await this.prisma.coupon.findUnique({
  //       where: { couponName },
  //       select: {
  //         id: true,
  //         Value: true,
  //         ValueType: true,
  //       },
  //     });

  //     if (!coupuon) {
  //       throw new Error('Coupon not found');
  //     }
  //   }

  //   let amount = 0;
  //   const orderItemsData: any[] = [];

  //   // 4️⃣ Calculate order amount
  //   if (productId) {
  //     if (!quantity || quantity < 1) {
  //       throw new Error('Quantity must be at least 1');
  //     }

  //     const product = await this.prisma.product.findUnique({
  //       where: { id: productId },
  //     });

  //     if (!product) {
  //       throw new Error('Product not found');
  //     }

  //     if (quantity > product.stockCount) {
  //       throw new Error('Insufficient stock');
  //     }

  //     amount = Number(product.discountedPrice) * quantity;

  //     orderItemsData.push({
  //       productId: product.id,
  //       quantity,
  //       discountedPrice: product.discountedPrice,
  //       actualPrice: product.actualPrice,
  //     });
  //   } else if (useCart) {
  //     const cartItems = await this.prisma.cartItem.findMany({
  //       where: { customerProfileId: customerProfile.id },
  //       include: {
  //         product: true,
  //         productVariation: true,
  //       },
  //     });

  //     if (!cartItems.length) {
  //       throw new Error('Cart is empty');
  //     }

  //     for (const item of cartItems) {
  //       const quantity = item.quantity ?? 1;

  //       // 🔹 CASE 1: Product Variation exists
  //       if (item.productVariation) {

  //         console.log("ehloooooooo")
  //         if (quantity > item.productVariation.stockCount) {
  //           throw new Error(
  //             `Insufficient stock for variation ${item.productVariation.variationName}`,
  //           );
  //         }

  //         const price = Number(item.productVariation.discountedPrice);

  //         amount += price * quantity;

  //         orderItemsData.push({
  //           productId: item.productVariation.productId,
  //           productVariationId: item.productVariation.id,
  //           quantity,
  //           discountedPrice: item.productVariation.discountedPrice,
  //           actualPrice: item.productVariation.actualPrice,
  //         });

  //         continue;
  //       }

  //       // 🔹 CASE 2: Normal product
  //       if (!item.product) continue;

  //       if (quantity > item.product.stockCount) {
  //         throw new Error(`Insufficient stock for product ${item.product.name}`);
  //       }

  //       const price = Number(item.product.discountedPrice);

  //       amount += price * quantity;

  //       orderItemsData.push({
  //         productId: item.product.id,
  //         quantity,
  //         discountedPrice: item.product.discountedPrice,
  //         actualPrice: item.product.actualPrice,
  //       });
  //     }
  //   } else {
  //     throw new Error('Either productId or useCart must be provided');
  //   }

  //   // 5️⃣ Apply coupon
  //   if (coupuon) {
  //     if (coupuon.ValueType === CoupounValueType.amount) {
  //       amount -= Number(coupuon.Value);
  //     } else if (coupuon.ValueType === CoupounValueType.percentage) {
  //       amount -= (amount * Number(coupuon.Value)) / 100;
  //     }

  //     if (amount < 0) amount = 0;
  //   }

  //   const isCOD = paymentMethod === 'cash_on_delivery';
  //   const orderAmount = amount;
  //   const shippingCost = Number(deliverCharge.deliveryCharge);
  //   const totalOrderAmount = orderAmount + shippingCost;

  //   // 🔐 VERIFY MYFATOORAH PAYMENT (NON-COD)
  //   if (!isCOD) {
  //     if (!fatoorahPaymentId) {
  //       throw new Error('Payment ID is required for online payment');
  //     }
  //     const paymentResult = await this.myFatoorahService.verifyPayment(
  //       fatoorahPaymentId,
  //     );

  //     const paymentData = paymentResult.Data;

  //     console.log(
  //       'MyFatoorah verification response:',
  //       JSON.stringify(paymentData, null, 2),
  //     );

  //     // ✅ 1. Verify payment status
  //     if (
  //       paymentData?.Invoice?.Status !== 'PAID' ||
  //       paymentData?.Transaction?.Status !== 'SUCCESS'
  //     ) {
  //       throw new Error('Payment not completed');
  //     }

  //     // ✅ 2. Verify amount
  //     const paidAmount = Number(paymentData.Amount.ValueInPayCurrency);
  //     const paidCurrency = paymentData.Amount.PayCurrency;

  //     // if (paidAmount !== totalOrderAmount) {
  //     //   throw new Error(
  //     //     `Paid amount mismatch: expected ${totalOrderAmount}, got ${paidAmount}`,
  //     //   );
  //     // }

  //     // // ✅ 3. Verify currency
  //     // if (paidCurrency !== currency) {
  //     //   throw new Error(
  //     //     `Currency mismatch: expected ${currency}, got ${paidCurrency}`,
  //     //   );
  //     // }

  //     console.log(
  //       'MyFatoorah verification response:',
  //       JSON.stringify(paymentResult, null, 2),
  //     );

  //   }


  //   // 6️⃣ CREATE ORDER + REDUCE STOCK (TRANSACTION)
  //   const order = await this.prisma.$transaction(async (tx) => {
  //     // Reduce stock
  //     for (const item of orderItemsData) {
  //       const updated = await tx.product.updateMany({
  //         where: {
  //           id: item.productId,
  //           stockCount: { gte: item.quantity },
  //         },
  //         data: {
  //           stockCount: { decrement: item.quantity },
  //         },
  //       });

  //       if (updated.count === 0) {
  //         throw new Error('Insufficient stock during checkout');
  //       }
  //     }
  //     console.log("hi devanand", shippingCost)

  //     const createdOrder = await tx.order.create({
  //       data: {
  //         customerProfileId: customerProfile.id,
  //         orderNumber: `ORD-${Date.now()}`,
  //         status: OrderStatus.confirmed,
  //         paymentStatus: isCOD
  //           ? PaymentStatus.pending
  //           : PaymentStatus.completed,
  //         paymentMethod: paymentMethod ?? PaymentMethod.cash_on_delivery,
  //         totalAmount: totalOrderAmount,
  //         shippingAddressId: shippingAddrs.id,
  //         coupounId: coupuon?.id ?? null,
  //         isCoupuonApplied: !!coupuon,
  //         shippingCost: shippingCost,
  //         razorpay_id: fatoorahPaymentId ?? null,
  //         items: {
  //           create: orderItemsData,
  //         },
  //       },
  //     });


  //     if (useCart) {
  //       await tx.cartItem.deleteMany({
  //         where: { customerProfileId: customerProfile.id },
  //       });
  //     }
  //     console.log("created createdOrder", createdOrder)
  //     return createdOrder;
  //   });


  //   // 8️⃣ COD flow
  //   if (isCOD) {
  //     await this.prisma.trackingDetail.create({
  //       data: {
  //         orderId: order.id,
  //         carrier: 'Internal',
  //         trackingNumber: order.orderNumber,
  //         trackingUrl: null,
  //         status: 'order_placed',
  //         statusHistory: [
  //           {
  //             status: 'order_placed',
  //             timestamp: new Date().toISOString(),
  //             notes: 'Order placed with Cash on Delivery',
  //           },
  //         ],
  //         lastUpdatedAt: new Date(),
  //       },
  //     });

  //     const completeOrder = await this.prisma.order.findUnique({
  //       where: { id: order.id },
  //       include: {
  //         items: {
  //           include: {
  //             product: { include: { images: true } },
  //           },
  //         },
  //         shippingAddress: true,
  //         tracking: true,
  //       },
  //     });

  //     return {
  //       message: 'Order created successfully with Cash on Delivery',
  //       order: completeOrder,
  //       paymentMethod: 'cash_on_delivery',
  //       orderAmount,
  //       shippingCost,
  //       totalOrderAmount,
  //     };
  //   }

  //   // 🔔 EMAIL & PUSH (NON-BLOCKING)
  //   (async () => {
  //     try {
  //       const orderForMail = await this.prisma.order.findUnique({
  //         where: { id: order.id },
  //         select: {
  //           orderNumber: true,
  //           totalAmount: true,
  //           paymentMethod: true,
  //           shippingCost: true,
  //           createdAt: true,
  //           CustomerProfile: {
  //             select: {
  //               name: true,
  //               phone: true,
  //               user: { select: { email: true } },
  //             },
  //           },
  //           items: {
  //             select: {
  //               quantity: true,
  //               discountedPrice: true,
  //               product: { select: { name: true } },
  //             },
  //           },
  //         },
  //       });

  //       await this.emailService.sendMail({
  //         to: process.env.ADMIN_EMAIL!,
  //         subject: `🛒 New Order Placed – ${orderForMail.orderNumber}`,
  //         template: 'admin-order-placed',
  //         context: {
  //           orderNumber: orderForMail.orderNumber,
  //           totalAmount: orderForMail.totalAmount,
  //           paymentMethod: orderForMail.paymentMethod,
  //           createdAt: orderForMail.createdAt,
  //           customer: {
  //             name: orderForMail.CustomerProfile?.name,
  //             email: orderForMail.CustomerProfile?.user?.email,
  //             phone: orderForMail.CustomerProfile?.phone,
  //           },
  //           items: orderForMail.items.map(item => ({
  //             name: item.product.name,
  //             quantity: item.quantity,
  //             price: item.discountedPrice,
  //           })),
  //         },
  //       });

  //       const adminTokens = await this.prisma.adminProfile.findMany({
  //         where: { fcmToken: { not: null } },
  //         select: { fcmToken: true },
  //       });

  //       await this.firebaseSender.sendPushMultiple(
  //         adminTokens.map(a => a.fcmToken),
  //         'New Order Placed',
  //         `Order ${order.orderNumber} placed for ₹${totalOrderAmount}`,
  //       );
  //     } catch (err) {
  //       console.error('Notification failed:', err);
  //     }
  //   })();

  //   // // 9️⃣ Razorpay flow
  //   // const options = {
  //   //   amount: Math.round(totalOrderAmount * 100),
  //   //   currency: currency || 'INR',
  //   //   receipt: order.orderNumber,
  //   // };

  //   // try {
  //   //   const razorpayOrder = await this.razorpayClient.orders.create(options);

  //   //   await this.prisma.order.update({
  //   //     where: { id: order.id },
  //   //     data: { razorpay_id: razorpayOrder.id },
  //   //   });

  //   //   return {
  //   //     message: 'Order created successfully',
  //   //     orderId: order.id,
  //   //     razorpayOrder,
  //   //   };
  //   // } catch (error) {
  //   //   await this.prisma.order.delete({
  //   //     where: { id: order.id },
  //   //   });
  //   //   throw error;
  //   // }
  // }



  async createOrder(dto: CreatePaymentIntentDto, customerProfileId: string) {
    const {
      productId,
      quantity,
      useCart,
      currency,
      ShippingAddressId,
      paymentMethod,
      couponName,
      fatoorahPaymentId,
    } = dto;

    // --------------------------------------------------
    // 1️⃣ CUSTOMER PROFILE
    // --------------------------------------------------
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId: customerProfileId },
      include: { user: true },
    });

    if (!customerProfile) {
      throw new Error('Customer profile not found');
    }

    if (customerProfile.user.isActive === false) {
      throw new HttpException('User account is deactivated', HttpStatus.FORBIDDEN);
    }

    // --------------------------------------------------
    // 2️⃣ SHIPPING ADDRESS
    // --------------------------------------------------
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
      throw new NotFoundException('Shipping address not found');
    }

    const deliverCharge = await this.prisma.deliveryCharges.findUnique({
      where: { postalCode: shippingAddrs.postalCode },
    });

    if (!deliverCharge) {
      throw new Error('Sorry. We are not delivering at your location currently.');
    }

    // --------------------------------------------------
    // 3️⃣ COUPON
    // --------------------------------------------------
    let coupuon: {
      id: string;
      Value: string;
      ValueType: CoupounValueType;
      usageLimitPerPerson: number;
    } | null = null;

    if (couponName) {
      coupuon = await this.prisma.coupon.findUnique({
        where: { couponName },
        select: {
          id: true,
          Value: true,
          ValueType: true,
          usageLimitPerPerson: true,
        },
      });

      if (!coupuon) {
        throw new Error('Coupon not found');
      }

      // ✅ COUNT HOW MANY TIMES USER USED THIS COUPON
      const usageCount = await this.prisma.couponUsage.count({
        where: {
          couponId: coupuon.id,
          customerProfileId: customerProfile.id,
        },
      });

      // ❌ LIMIT EXCEEDED
      if (usageCount >= coupuon.usageLimitPerPerson) {
        throw new HttpException(
          `Coupon usage exceeded. You can use this coupon only ${coupuon.usageLimitPerPerson} time(s).`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // --------------------------------------------------
    // 4️⃣ CALCULATE AMOUNT
    // --------------------------------------------------
    let amount = 0;
    const orderItemsData: any[] = [];

    if (productId) {
      if (!quantity || quantity < 1) {
        throw new Error('Quantity must be at least 1');
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) throw new Error('Product not found');
      if (quantity > product.stockCount)
        throw new Error('Insufficient stock');

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
        include: { product: true, productVariation: true },
      });

      if (!cartItems.length) {
        throw new Error('Cart is empty');
      }

      for (const item of cartItems) {
        const qty = item.quantity ?? 1;

        if (item.productVariation) {
          if (qty > item.productVariation.stockCount) {
            throw new Error(
              `Insufficient stock for variation ${item.productVariation.variationName}`,
            );
          }

          const price = Number(item.productVariation.discountedPrice);
          amount += price * qty;

          orderItemsData.push({
            productId: item.productVariation.productId,
            productVariationId: item.productVariation.id,
            quantity: qty,
            discountedPrice: item.productVariation.discountedPrice,
            actualPrice: item.productVariation.actualPrice,
          });
          continue;
        }

        if (!item.product) continue;

        if (qty > item.product.stockCount) {
          throw new Error(`Insufficient stock for product ${item.product.name}`);
        }

        const price = Number(item.product.discountedPrice);
        amount += price * qty;

        orderItemsData.push({
          productId: item.product.id,
          quantity: qty,
          discountedPrice: item.product.discountedPrice,
          actualPrice: item.product.actualPrice,
        });
      }
    } else {
      throw new Error('Either productId or useCart must be provided');
    }

    // --------------------------------------------------
    // 5️⃣ APPLY COUPON
    // --------------------------------------------------
    if (coupuon) {
      if (coupuon.ValueType === CoupounValueType.amount) {
        amount -= Number(coupuon.Value);
      } else {
        amount -= (amount * Number(coupuon.Value)) / 100;
      }
      if (amount < 0) amount = 0;
    }

    const isCOD = paymentMethod === 'cash_on_delivery';
    const orderAmount = amount;
    const shippingCost = Number(deliverCharge.deliveryCharge);
    const totalOrderAmount = orderAmount + shippingCost;

    // --------------------------------------------------
    // 6️⃣ VERIFY MYFATOORAH (NON-COD)
    // --------------------------------------------------
    if (!isCOD) {
      if (!fatoorahPaymentId) {
        throw new Error('Payment ID is required for online payment');
      }
      const paymentResult = await this.myFatoorahService.verifyPayment(
        fatoorahPaymentId,
      );

      const paymentData = paymentResult.Data;

      console.log(
        'MyFatoorah verification response:',
        JSON.stringify(paymentData, null, 2),
      );

      // ✅ 1. Verify payment status
      if (
        paymentData?.Invoice?.Status !== 'PAID' ||
        paymentData?.Transaction?.Status !== 'SUCCESS'
      ) {
        throw new Error('Payment not completed');
      }

      // ✅ 2. Verify amount
      const paidAmount = Number(paymentData.Amount.ValueInPayCurrency);
      const paidCurrency = paymentData.Amount.PayCurrency;

      // if (paidAmount !== totalOrderAmount) {
      //   throw new Error(
      //     `Paid amount mismatch: expected ${totalOrderAmount}, got ${paidAmount}`,
      //   );
      // }

      // // ✅ 3. Verify currency
      // if (paidCurrency !== currency) {
      //   throw new Error(
      //     `Currency mismatch: expected ${currency}, got ${paidCurrency}`,
      //   );
      // }

      console.log(
        'MyFatoorah verification response:',
        JSON.stringify(paymentResult, null, 2),
      );
    }

    // --------------------------------------------------
    // 7️⃣ CREATE ORDER (TRANSACTION)
    // --------------------------------------------------
    const order = await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Reduce stock
      for (const item of orderItemsData) {

        // -----------------------------------------
        // 🔹 CASE 1 : VARIATION ORDER ITEM
        // -----------------------------------------
        if (item.productVariationId) {

          // 1️⃣ Reduce variation stock
          const variationUpdated = await tx.productVariation.updateMany({
            where: {
              id: item.productVariationId,
              stockCount: { gte: item.quantity },
            },
            data: {
              stockCount: { decrement: item.quantity },
            },
          });

          if (!variationUpdated.count) {
            throw new Error('Variation stock update failed');
          }

          // 2️⃣ Reduce parent product stock also
          const productUpdated = await tx.product.updateMany({
            where: {
              id: item.productId,
              stockCount: { gte: item.quantity },
            },
            data: {
              stockCount: { decrement: item.quantity },
            },
          });

          if (!productUpdated.count) {
            throw new Error('Product stock update failed');
          }

          continue;
        }

        // -----------------------------------------
        // 🔹 CASE 2 : SIMPLE PRODUCT ORDER ITEM
        // -----------------------------------------
        const productUpdated = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockCount: { gte: item.quantity },
          },
          data: {
            stockCount: { decrement: item.quantity },
          },
        });

        if (!productUpdated.count) {
          throw new Error('Product stock update failed');
        }
      }

      // --------------------------------------------------
      // 🚚 AUTO ASSIGN DELIVERY PARTNER
      // --------------------------------------------------

      // 1️⃣ Check if any delivery partner has null assignment time
      const deliveryPartnerWithNull = await tx.user.findFirst({
        where: {
          role: Roles.DELIVERY,
          isActive: true,
          lastAssignedDeliveryTime: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: { id: true },
      });

      let selectedDeliveryPartnerId: string | null = null;

      if (deliveryPartnerWithNull) {
        // First round
        selectedDeliveryPartnerId = deliveryPartnerWithNull.id;
      } else {
        // Normal circular assignment
        const deliveryPartner = await tx.user.findFirst({
          where: {
            role: Roles.DELIVERY,
            isActive: true,
          },
          orderBy: {
            lastAssignedDeliveryTime: 'asc',
          },
          select: { id: true },
        });

        selectedDeliveryPartnerId = deliveryPartner?.id ?? null;
      }


      // 2️⃣ Create order
      const order = await tx.order.create({
        data: {
          customerProfileId: customerProfile.id,
          orderNumber: `ORD-${Date.now()}`,
          status: OrderStatus.confirmed,
          paymentStatus: PaymentStatus.completed,
          paymentMethod: paymentMethod ?? PaymentMethod.cash_on_delivery,
          totalAmount: totalOrderAmount,
          shippingAddressId: shippingAddrs.id,
          coupounId: coupuon?.id ?? null,
          isCoupuonApplied: !!coupuon,
          shippingCost,
          razorpay_id: fatoorahPaymentId ?? null,
          deliveryPartnerId: selectedDeliveryPartnerId,
          items: { create: orderItemsData },
        },
      });

      // --------------------------------------------------
      // 🧾 RECORD COUPON USAGE
      // --------------------------------------------------
      if (coupuon?.id) {
        await tx.couponUsage.create({
          data: {
            couponId: coupuon.id,
            customerProfileId: customerProfile.id,
          },
        });
      }

      if (selectedDeliveryPartnerId) {
        await tx.user.update({
          where: { id: selectedDeliveryPartnerId },
          data: {
            lastAssignedDeliveryTime: new Date(),
          },
        });
      }

      // 3️⃣ Clear cart AFTER successful order creation
      if (useCart) {
        await tx.cartItem.deleteMany({
          where: { customerProfileId: customerProfile.id },
        });
      }

      return order;
    });

    // --------------------------------------------------
    // 8️⃣ TRACKING (COD ONLY)
    // --------------------------------------------------
    if (isCOD) {
      await this.prisma.trackingDetail.create({
        data: {
          orderId: order.id,
          carrier: 'Internal',
          trackingNumber: order.orderNumber,
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
    }

    // --------------------------------------------------
    // 9️⃣ LOAD FULL ORDER (RESPONSE CONTRACT)
    // --------------------------------------------------
    const completeOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: { include: { product: { include: { images: true } } } },
        shippingAddress: true,
        tracking: true,
      },
    });

    // --------------------------------------------------
    // 🔔 EMAIL + ADMIN PUSH (NON-BLOCKING)
    // --------------------------------------------------
    (async () => {
      try {
        const orderForMail = await this.prisma.order.findUnique({
          where: { id: order.id },
          select: {
            orderNumber: true,
            totalAmount: true,
            paymentMethod: true,
            shippingCost: true,
            createdAt: true,
            CustomerProfile: {
              select: {
                name: true,
                phone: true,
                user: { select: { email: true } },
              },
            },
            items: {
              select: {
                quantity: true,
                discountedPrice: true,
                product: { select: { name: true } },
              },
            },
          },
        });
        const adminsEmail = await this.prisma.adminProfile.findMany({
          select: { fcmToken: true, user: { select: { email: true } } },
        });

        // 🔹 Collect & dedupe admin emails
        const adminEmails = [
          ...new Set(
            adminsEmail
              .map((a) => a.user?.email)
              .filter((email): email is string => Boolean(email)),
          ),
        ];

        // 🔹 Fallback (optional but safe)
        if (!adminEmails.length && process.env.ADMIN_EMAIL) {
          adminEmails.push(process.env.ADMIN_EMAIL);
        }

        const PaymentMethodLabel: Record<PaymentMethod, string> = {
          credit_card: 'Credit Card',
          debit_card: 'Debit Card',
          paypal: 'PayPal',
          stripe: 'Stripe',
          bank_transfer: 'Bank Transfer',
          myfatoorah: 'MyFatoorah',
          cash_on_delivery: 'Cash on Delivery',
        };



        console.log(adminEmails)
        await this.emailService.sendMail({
          to: adminEmails,
          subject: `🛒 New Order Placed – ${orderForMail.orderNumber}`,
          template: 'admin-order-placed',
          context: {
            orderNumber: orderForMail.orderNumber,
            totalAmount: orderForMail.totalAmount,
            paymentMethod: PaymentMethodLabel[orderForMail.paymentMethod],
            createdAt: orderForMail.createdAt,
            customer: {
              name: orderForMail.CustomerProfile?.name,
              email: orderForMail.CustomerProfile?.user?.email,
              phone: orderForMail.CustomerProfile?.phone,
            },
            items: orderForMail.items.map(item => ({
              name: item.product.name,
              quantity: item.quantity,
              price: item.discountedPrice,
            })),
          },
        });


        const admins = await this.prisma.adminProfile.findMany({
          where: { fcmToken: { not: null } },
          select: { fcmToken: true, user: { select: { email: true } } },
        });
        const itemSummary = orderForMail.items
          .map(item => `${item.quantity}× ${item.product.name}`)
          .join(', ');

        const customerName = orderForMail.CustomerProfile?.name ?? 'Customer';

        const MAX_LENGTH = 180;

        let body = `${customerName} ordered ${itemSummary} (Order #${orderForMail.orderNumber})`;

        if (body.length > MAX_LENGTH) {
          const shortItems = orderForMail.items
            .slice(0, 2)
            .map(item => `${item.quantity}× ${item.product.name}`)
            .join(', ');

          const moreCount = orderForMail.items.length - 2;

          body = `${customerName} ordered ${shortItems}${moreCount > 0 ? ` +${moreCount} more` : ''} (Order #${orderForMail.orderNumber})`;
        }

        await this.firebaseSender.sendPushMultiple(
          admins.map(a => a.fcmToken),
          '🛒 New Order Received!',
          body,
        );
      } catch (e) {
        console.error('Notification failed', e);
      }
    })();

    // --------------------------------------------------
    // 🔟 FINAL RESPONSE (UNCHANGED STRUCTURE)
    // --------------------------------------------------
    return {
      message: isCOD
        ? 'Order created successfully with Cash on Delivery'
        : 'Order created successfully',

      order: completeOrder,
      paymentMethod: completeOrder.paymentMethod,
      orderAmount,
      shippingCost,
      totalOrderAmount,

      ...(isCOD
        ? {}
        : {
          paymentGateway: 'myfatoorah',
          paymentReference: fatoorahPaymentId,
        }),
    };

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

  async createPayment(data: CreatePaymentDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.baseUrl, data, {
          headers: {
            Authorization: `Bearer ${process.env.MYFATOORAH_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data || 'Payment gateway error',
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Add more methods for payment verification, refunds, etc.
}
