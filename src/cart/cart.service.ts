import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) { }


  async addToCart(userId: string, dto: AddToCartDto) {
    const { productId, productVariationId, quantity } = dto;

    // 1️⃣ Get customer profile
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    // --------------------------------------------------
    // CASE A: ADD PRODUCT VARIATION
    // --------------------------------------------------
    if (productVariationId) {
      const variation = await this.prisma.productVariation.findFirst({
        where: {
          id: productVariationId,
          isAvailable: true,
          product: {
            isStock: true,
          },
        },
        include: { product: true },
      });

      if (!variation) {
        throw new NotFoundException('Product variation not available');
      }

      if (variation.stockCount < quantity) {
        throw new BadRequestException('Insufficient variation stock');
      }

      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          customerProfileId: customerProfile.id,
          productVariationId,
        },
      });

      if (
        existingItem &&
        existingItem.quantity + quantity > variation.stockCount
      ) {
        throw new BadRequestException('Insufficient variation stock');
      }

      const cartItem = existingItem
        ? await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
        })
        : await this.prisma.cartItem.create({
          data: {
            productVariationId,
            quantity,
            productId: variation.productId,
            customerProfileId: customerProfile.id,
          },
        });

      return {
        message: 'Product variation added to cart',
        cartItem,
      };
    }

    // --------------------------------------------------
    // CASE B: ADD PRODUCT (NO VARIATIONS)
    // --------------------------------------------------
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isStock: true,
      },
    });

    if (!product) {
      throw new BadRequestException(
        'Product not available or has variations',
      );
    }

    if (product.stockCount < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        customerProfileId: customerProfile.id,
        productId,
        productVariationId: null,
      },
    });

    if (
      existingItem &&
      existingItem.quantity + quantity > product.stockCount
    ) {
      throw new BadRequestException('Insufficient stock');
    }

    const cartItem = existingItem
      ? await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      })
      : await this.prisma.cartItem.create({
        data: {
          productId,
          quantity,
          customerProfileId: customerProfile.id,
        },
      });

    return {
      message: 'Product added to cart',
      cartItem,
    };
  }

  async getCart(userId: string, page = 1, limit = 10) {
    // 1️⃣ Get customer profile
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    const skip = (page - 1) * limit;

    // 2️⃣ Get paginated cart items
    const [cartItems, totalCount] = await this.prisma.$transaction([
      this.prisma.cartItem.findMany({
        where: { customerProfileId: customerProfile.id, productId: { not: null } },
        skip,
        take: limit,
        include: {
          product: {
            include: {
              images: true,
            },
          },
          productVariation: {
            include: {
              product: {
                include: {
                  images: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cartItem.count({
        where: { customerProfileId: customerProfile.id },
      }),
    ]);

    // 3️⃣ Fetch ALL cart items for total calculation
    const allCartItems = await this.prisma.cartItem.findMany({
      where: { customerProfileId: customerProfile.id },
      include: {
        product: true,
        productVariation: true,
      },
    });

    // 4️⃣ Calculate total amount with fallback pricing
    const totalAmount = allCartItems.reduce((sum, item) => {
      const qty = item.quantity ?? 1;

      // PRODUCT VARIATION
      if (item.productVariation) {
        const price =
          !item.productVariation.discountedPrice ||
            Number(item.productVariation.discountedPrice) === 0
            ? Number(item.productVariation.actualPrice)
            : Number(item.productVariation.discountedPrice);

        return sum + price * qty;
      }

      // PRODUCT (NO VARIATION)
      if (item.product) {
        const price =
          !item.product.discountedPrice ||
            Number(item.product.discountedPrice) === 0
            ? Number(item.product.actualPrice)
            : Number(item.product.discountedPrice);

        return sum + price * qty;
      }

      return sum;
    }, 0);

    // 5️⃣ Return response (UNCHANGED)
    return {
      items: cartItems,
      totalAmount,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }



  async updateCartItem(userId: string, dto: UpdateCartDto) {
    const { productId, productVariationId, quantity } = dto;

    // 1️⃣ Get customer profile
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    // --------------------------------------------------
    // CASE A: UPDATE VARIATION CART ITEM
    // --------------------------------------------------
    if (productVariationId) {
      const variation = await this.prisma.productVariation.findFirst({
        where: {
          id: productVariationId,
          isAvailable: true,
        },
      });

      if (!variation) {
        throw new NotFoundException('Product variation not found');
      }

      if (variation.stockCount < quantity) {
        throw new BadRequestException('Insufficient variation stock');
      }

      const cartItem = await this.prisma.cartItem.findFirst({
        where: {
          customerProfileId: customerProfile.id,
          productVariationId,
        },
      });

      if (!cartItem) {
        throw new NotFoundException('Cart item not found');
      }

      return this.prisma.cartItem.update({
        where: { id: cartItem.id },
        data: { quantity },
      });
    }

    // --------------------------------------------------
    // CASE B: UPDATE PRODUCT CART ITEM (NO VARIATIONS)
    // --------------------------------------------------
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isStock: true,
        variations: {
          none: {}, // 🚨 prevents base product update if variations exist
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Product not found, inactive, or has variations',
      );
    }

    if (product.stockCount < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        customerProfileId: customerProfile.id,
        productId,
        productVariationId: null,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
    });
  }


  async DeleteFromCart(userId: string, cartItemId: string) {
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customerProfile)
      throw new NotFoundException('Customer profile not found');

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });
    if (!cartItem || cartItem.customerProfileId !== customerProfile.id) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    return { message: 'Item removed from cart successfully' };
  }

  async RemoveFromCart(
    userId: string,
    cartItemId?: string,
    productId?: string,
    productVariationId?: string,
  ) {
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    if (!cartItemId && !productId && !productVariationId) {
      throw new BadRequestException(
        'cartItemId or productId or productVariationId is required',
      );
    }

    // --------------------------------------------------
    // Resolve cart item (same pattern as wishlist)
    // --------------------------------------------------
    const cart = await this.prisma.cartItem.findFirst({
      where: {
        customerProfileId: customerProfile.id,
        OR: [
          cartItemId ? { id: cartItemId } : undefined,
          productVariationId
            ? { productVariationId }
            : undefined,
          productId
            ? { productId, productVariationId: null }
            : undefined,
        ].filter(Boolean),
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart item not found');
    }

    // --------------------------------------------------
    // Quantity handling
    // --------------------------------------------------
    const newQuantity = (cart.quantity ?? 0) - 1;

    if (newQuantity > 0) {
      return this.prisma.cartItem.update({
        where: { id: cart.id },
        data: { quantity: newQuantity },
      });
    }

    await this.prisma.cartItem.delete({
      where: { id: cart.id },
    });

    return { message: 'Item removed from cart successfully' };
  }


}