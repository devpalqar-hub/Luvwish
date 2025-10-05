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

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;
    // 1. Check if product exists & is active
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isStock: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }
    if (product.stockCount < quantity) {
      throw new BadRequestException('Insufficient stock available');
    }
    // 2. Get the customer profile from userId
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!customerProfile) {
      throw new NotFoundException('Customer profile not found');
    }

    // 3. Check if product already exists in cart
    const existingCartItem = await this.prisma.cartItem.findUnique({
      where: {
        customerProfileId_productId: {
          customerProfileId: customerProfile.id,
          productId: productId,
        },
      },
    });
    if (existingCartItem) {
      if (existingCartItem.quantity + quantity > product.stockCount) {
        throw new BadRequestException('Insufficient stock available');
      }
    }
    let cartItem;
    if (existingCartItem) {
      // 4. Update quantity
      cartItem = await this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + quantity },
      });
    } else {
      // 5. Create new cart item
      cartItem = await this.prisma.cartItem.create({
        data: {
          productId,
          quantity,
          customerProfileId: customerProfile.id,
        },
      });
    }

    // 6. Update product stock (optional, if you want stock to reduce immediately)
    await this.prisma.product.update({
      where: { id: productId },
      data: { stockCount: { decrement: quantity } },
    });

    return {
      message: 'Product added to cart successfully',
      cartItem,
    };
  }

  async getCart(userId: string, page = 1, limit = 10) {
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customerProfile)
      throw new NotFoundException('Customer profile not found');

    const skip = (page - 1) * limit;

    // 1️⃣ Get paginated cart items
    const [cartItems, totalCount] = await this.prisma.$transaction([
      this.prisma.cartItem.findMany({
        where: { customerProfileId: customerProfile.id },
        skip,
        take: limit,
        include: {
          product: {
            include: { images: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.cartItem.count({
        where: { customerProfileId: customerProfile.id },
      }),
    ]);

    // 2️⃣ Calculate total amount of *all items*, not just paginated ones
    const allCartItems = await this.prisma.cartItem.findMany({
      where: { customerProfileId: customerProfile.id },
      include: { product: true },
    });

    const totalAmount = allCartItems.reduce((sum, item) => {
      if (!item.product) return sum;
      const qty = item.quantity ?? 1;
      return sum + Number(item.product.discountedPrice) * qty;
    }, 0);

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


  async updateCartItem(
    userId: string,
    updateCartDto: UpdateCartDto,
  ) {
    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customerProfile)
      throw new NotFoundException('Customer profile not found');
    const product = await this.prisma.product.findFirst({
      where: { id: updateCartDto.productId, isStock: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }
    if (product.stockCount < updateCartDto.quantity) {
      throw new BadRequestException('Insufficient stock available');
    }
    const cart = await this.prisma.cartItem.findFirst({
      where: {
        customerProfileId: customerProfile.id,
        productId: updateCartDto.productId
      },
    });
    if (!cart) {
      throw new NotFoundException('Cart item not found');
    }
    if (updateCartDto.quantity && updateCartDto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }
    return this.prisma.cartItem.update({
      where: { id: cart.id },
      data: { ...updateCartDto },
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


  async RemoveFromCart(userId: string, cartItemId: string) {
    const customerprofile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!customerprofile) {
      throw new NotFoundException('Customer profile not found');
    }
    const cart = await this.prisma.cartItem.findFirst({
      where: {
        customerProfileId: customerprofile.id,
        id: cartItemId,
      },
    });
    if (!cart) {
      throw new NotFoundException('Cart item not found');
    }
    const newQuantity = cart.quantity - 1;
    if (newQuantity > 0) {
      return this.prisma.cartItem.update({
        where: { id: cart.id },
        data: { quantity: newQuantity },
      });
    }
    else {
      await this.prisma.cartItem.delete({ where: { id: cart.id } });
      return { message: 'Item removed from cart successfully' };
    }
  }

}