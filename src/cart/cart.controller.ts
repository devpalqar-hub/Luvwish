import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @UseGuards(JwtAuthGuard)
  @Post('add')
  @ApiOperation({
    summary: 'Add item to cart',
    description: 'Add a product with optional variation to shopping cart. If item already exists, quantity is updated.',
  })
  @ApiBody({ type: AddToCartDto })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart successfully',
    schema: {
      example: {
        id: 'cart-item-uuid',
        cartId: 'cart-uuid',
        productId: 'product-uuid',
        quantity: 2,
        price: 4999.99,
        totalPrice: 9999.98,
        addedAt: '2026-02-16T10:30:00Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid product or insufficient stock' })
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    const profile_id = req.user.id;
    return this.cartService.addToCart(profile_id, addToCartDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Get shopping cart',
    description: 'Retrieve all items in the user\'s shopping cart with pagination.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'string',
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'string',
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
    schema: {
      example: {
        id: 'cart-uuid',
        items: [
          {
            id: 'item-uuid',
            productId: 'product-uuid',
            name: 'Laptop Pro',
            quantity: 2,
            price: 4999.99,
            totalPrice: 9999.98,
          },
        ],
        subtotal: 9999.98,
        tax: 1799.98,
        total: 11799.96,
        pagination: {
          page: 1,
          limit: 10,
          total: 5,
          totalPages: 1,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getCart(
    @Request() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const userId = req.user.id;
    return this.cartService.getCart(userId, Number(page), Number(limit));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update-cart')
  @ApiOperation({
    summary: 'Update cart item',
    description: 'Update quantity or other details of an existing cart item.',
  })
  @ApiBody({ type: UpdateCartDto })
  @ApiResponse({
    status: 200,
    description: 'Cart item updated successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid quantity or cart item not found' })
  async updateCart(
    @Request() req,
    @Body() updateCartDto: UpdateCartDto,
  ) {
    const profile_id = req.user.id;
    return this.cartService.updateCartItem(profile_id, updateCartDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('remove-from-cart')
  @ApiOperation({
    summary: 'Remove item from cart',
    description: 'Remove an item from cart by cart item ID, product ID, or product variation ID.',
  })
  @ApiQuery({
    name: 'id',
    required: false,
    type: 'string',
    description: 'Cart item ID',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: 'string',
    description: 'Product ID (removes all items of this product)',
  })
  @ApiQuery({
    name: 'productVariationId',
    required: false,
    type: 'string',
    description: 'Product variation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Item removed from cart',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid parameters - at least one ID required' })
  async removeFromCart(
    @Request() req,
    @Query('id') cartItemId?: string,
    @Query('productId') productId?: string,
    @Query('productVariationId') productVariationId?: string,
  ) {
    const userId = req.user.id;
    console.log(productId)

    return this.cartService.RemoveFromCart(
      userId,
      cartItemId,
      productId,
      productVariationId,
    );
  }


  @UseGuards(JwtAuthGuard)
  @Delete('delete-cart/:id')
  async DeleteCart(@Request() req, @Param('id') cartItemId: string) {
    const profile_id = req.user.id;
    return this.cartService.DeleteFromCart(profile_id, cartItemId);
  }
}
