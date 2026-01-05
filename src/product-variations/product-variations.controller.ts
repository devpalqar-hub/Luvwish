import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ProductVariationsService } from './product-variations.service';
import { CreateProductVariationDto } from './dto/create-product-variation.dto';
import { UpdateProductVariationDto } from './dto/update-product-variation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('product-variations')
export class ProductVariationsController {
  constructor(private readonly productVariationsService: ProductVariationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER', 'INVENTORY_MANAGER')
  create(@Body() createProductVariationDto: CreateProductVariationDto) {
    return this.productVariationsService.create(createProductVariationDto);
  }

  @Get('product/:productId')
  findByProductId(@Param('productId') productId: string) {
    return this.productVariationsService.findByProductId(productId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productVariationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER', 'INVENTORY_MANAGER')
  update(@Param('id') id: string, @Body() updateProductVariationDto: UpdateProductVariationDto) {
    return this.productVariationsService.update(id, updateProductVariationDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER')
  remove(@Param('id') id: string) {
    return this.productVariationsService.remove(id);
  }
}
