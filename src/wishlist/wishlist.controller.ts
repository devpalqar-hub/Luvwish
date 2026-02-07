import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/wishlist.dto';
import { PaginationDto } from 'src/pagination/dto/pagination.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  addToWishlist(@Body() dto: CreateWishlistDto, @Request() req) {
    const profile_id = req.user.id;
    return this.wishlistService.addToWishlist(dto, profile_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getWishlist(@Request() req, @Query() pagination: PaginationDto) {
    const profile_id = req.user.id;
    return this.wishlistService.getWishlist(profile_id, pagination);
  }


  @UseGuards(JwtAuthGuard)
  @Delete()
  removeFromWishlist(
    @Request() req,
    @Query('id') id?: string,
    @Query('productId') productId?: string,

  ) {
    const userId = req.user.id;

    return this.wishlistService.removeFromWishlist(
      id,
      userId,
      productId,
    );
  }


  @Delete()
  clearWishlist(@Request() req) {
    const profile_id = req.user.id;
    return this.wishlistService.clearWishlist(profile_id);
  }
}
