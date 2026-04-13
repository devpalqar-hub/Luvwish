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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add item to wishlist' })
  @ApiBody({ type: CreateWishlistDto })
  @ApiOkResponse({ description: 'Item added to wishlist' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  addToWishlist(@Body() dto: CreateWishlistDto, @Request() req) {
    const profile_id = req.user.id;
    return this.wishlistService.addToWishlist(dto, profile_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user wishlist' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size' })
  @ApiOkResponse({ description: 'Wishlist fetched successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  getWishlist(@Request() req, @Query() pagination: PaginationDto) {
    const profile_id = req.user.id;
    return this.wishlistService.getWishlist(profile_id, pagination);
  }


  @UseGuards(JwtAuthGuard)
  @Delete()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove wishlist item by item id or product id' })
  @ApiQuery({ name: 'id', required: false, description: 'Wishlist item id' })
  @ApiQuery({ name: 'productId', required: false, description: 'Product id' })
  @ApiOkResponse({ description: 'Wishlist item removed successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
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
  @ApiOperation({ summary: 'Clear wishlist for current user' })
  @ApiOkResponse({ description: 'Wishlist cleared successfully' })
  clearWishlist(@Request() req) {
    const profile_id = req.user.id;
    return this.wishlistService.clearWishlist(profile_id);
  }
}
