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

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @UseGuards(JwtAuthGuard)
  @Post('add')
  async addToCart(@Request() req, @Body() addToCartDto: AddToCartDto) {
    const profile_id = req.user.id; // Assuming JWT auth stores user in req.user
    return this.cartService.addToCart(profile_id, addToCartDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
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
  async updateCart(
    @Request() req,
    @Body() updateCartDto: UpdateCartDto,
  ) {
    const profile_id = req.user.id;
    return this.cartService.updateCartItem(profile_id, updateCartDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('remove-from-cart/:id')
  async removeFromCart(@Request() req, @Param('id') cartItemId: string) {
    const profile_id = req.user.id;
    return this.cartService.RemoveFromCart(profile_id, cartItemId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete-cart/:id')
  async DeleteCart(@Request() req, @Param('id') cartItemId: string) {
    const profile_id = req.user.id;
    return this.cartService.DeleteFromCart(profile_id, cartItemId);
  }
}
