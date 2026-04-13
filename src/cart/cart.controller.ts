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
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @UseGuards(JwtAuthGuard)
  @Post('add')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product to cart' })
  @ApiBody({ type: AddToCartDto })
  @ApiOkResponse({ description: 'Item added to cart' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    const profile_id = req.user.id; // Assuming JWT auth stores user in req.user
    return this.cartService.addToCart(profile_id, addToCartDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOkResponse({ description: 'Cart returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async getCart(
    @Request() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const userId = req.user.id; // 👈 assuming JWT stores `id`
    return this.cartService.getCart(userId, Number(page), Number(limit));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update-cart')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cart item quantity/details' })
  @ApiBody({ type: UpdateCartDto })
  @ApiOkResponse({ description: 'Cart item updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async updateCart(
    @Request() req,
    @Body() updateCartDto: UpdateCartDto,
  ) {
    const profile_id = req.user.id;
    return this.cartService.updateCartItem(profile_id, updateCartDto);
  }

  // @UseGuards(JwtAuthGuard)
  // @Patch('remove-from-cart/:id')
  // async removeFromCart(@Request() req, @Param('id') cartItemId: string) {
  //   const profile_id = req.user.id;
  //   return this.cartService.RemoveFromCart(profile_id, cartItemId);
  // }

  @UseGuards(JwtAuthGuard)
  @Patch('remove-from-cart')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove item from cart by id/product/variation' })
  @ApiQuery({ name: 'id', required: false, description: 'Cart item id' })
  @ApiQuery({ name: 'productId', required: false, description: 'Product id' })
  @ApiQuery({ name: 'productVariationId', required: false, description: 'Product variation id' })
  @ApiOkResponse({ description: 'Item removed from cart successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete cart item by cart item id' })
  @ApiParam({ name: 'id', description: 'Cart item id' })
  @ApiOkResponse({ description: 'Cart item deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  async DeleteCart(@Request() req, @Param('id') cartItemId: string) {
    const profile_id = req.user.id;
    return this.cartService.DeleteFromCart(profile_id, cartItemId);
  }
}
