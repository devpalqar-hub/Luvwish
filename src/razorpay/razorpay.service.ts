// src/payment/payment.service.ts
import { Injectable, Inject } from '@nestjs/common';
import Razorpay from 'razorpay';
import { CreatePaymentIntentDto } from './dto/checkout.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { CoupounValueType, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { MailService } from 'src/mail/mail.service';
import { FirebaseSender } from 'src/firebase/firebase.sender';
import { MyFatoorahService } from './myfatoorah.service';

@Injectable()
export class RazorpayService {
  constructor(
    @Inject('RAZORPAY_CLIENT') private readonly razorpayClient: Razorpay,
    private prisma: PrismaService,
    private readonly emailService: MailService,
    private readonly firebaseSender: FirebaseSender,
    private readonly myFatoorahService: MyFatoorahService
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
    });

    if (!customerProfile) {
      throw new Error('Customer profile not found');
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
      throw new Error('Shipping address not found');
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
    } | null = null;

    if (couponName) {
      coupuon = await this.prisma.coupon.findUnique({
        where: { couponName },
        select: { id: true, Value: true, ValueType: true },
      });

      if (!coupuon) {
        throw new Error('Coupon not found');
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
      for (const item of orderItemsData) {
        await tx.product.updateMany({
          where: { id: item.productId, stockCount: { gte: item.quantity } },
          data: { stockCount: { decrement: item.quantity } },
        });
      }

      return tx.order.create({
        data: {
          customerProfileId: customerProfile.id,
          orderNumber: `ORD-${Date.now()}`,
          status: OrderStatus.confirmed,
          paymentStatus: isCOD
            ? PaymentStatus.pending
            : PaymentStatus.completed,
          paymentMethod: paymentMethod ?? PaymentMethod.cash_on_delivery,
          totalAmount: totalOrderAmount,
          shippingAddressId: shippingAddrs.id,
          coupounId: coupuon?.id ?? null,
          isCoupuonApplied: !!coupuon,
          shippingCost,
          razorpay_id: fatoorahPaymentId ?? null,
          items: { create: orderItemsData },
        },
      });
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
        const admins = await this.prisma.adminProfile.findMany({
          where: { fcmToken: { not: null } },
          select: { fcmToken: true },
        });

        await this.firebaseSender.sendPushMultiple(
          admins.map(a => a.fcmToken),
          'New Order Placed',
          `Order ${order.orderNumber} placed`,
        );
      } catch (e) {
        console.error('Notification failed', e);
      }
    })();

    // --------------------------------------------------
    // 🔟 FINAL RESPONSE (UNCHANGED STRUCTURE)
    // --------------------------------------------------
    return {
      success: true,
      data: {
        message: isCOD
          ? 'Order created successfully with Cash on Delivery'
          : 'Order created successfully',

        // 🔒 ORDER IS 100% UNCHANGED
        order: completeOrder,

        paymentMethod: completeOrder.paymentMethod,
        orderAmount,
        shippingCost,
        totalOrderAmount,

        // 🆕 ADDITIVE FIELDS (SAFE FOR NON-COD)
        ...(isCOD
          ? {}
          : {
            paymentGateway: 'myfatoorah',
            paymentReference: fatoorahPaymentId,
          }),
      },
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

  // Add more methods for payment verification, refunds, etc.
}
