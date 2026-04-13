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
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Product Variations')
@Controller('product-variations')
export class ProductVariationsController {
  constructor(private readonly productVariationsService: ProductVariationsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER', 'INVENTORY_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product variation' })
  @ApiBody({ type: CreateProductVariationDto })
  @ApiOkResponse({ description: 'Product variation created successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires admin/product/inventory role' })
  create(@Body() createProductVariationDto: CreateProductVariationDto) {
    return this.productVariationsService.create(createProductVariationDto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get variations by product id' })
  @ApiParam({ name: 'productId', description: 'Product id' })
  @ApiOkResponse({ description: 'Product variations returned successfully' })
  findByProductId(@Param('productId') productId: string) {
    return this.productVariationsService.findByProductId(productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product variation by id' })
  @ApiParam({ name: 'id', description: 'Product variation id' })
  @ApiOkResponse({ description: 'Product variation returned successfully' })
  findOne(@Param('id') id: string) {
    return this.productVariationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER', 'INVENTORY_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product variation by id' })
  @ApiParam({ name: 'id', description: 'Product variation id' })
  @ApiBody({ type: UpdateProductVariationDto })
  @ApiOkResponse({ description: 'Product variation updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires admin/product/inventory role' })
  update(@Param('id') id: string, @Body() updateProductVariationDto: UpdateProductVariationDto) {
    return this.productVariationsService.update(id, updateProductVariationDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product variation by id' })
  @ApiParam({ name: 'id', description: 'Product variation id' })
  @ApiOkResponse({ description: 'Product variation deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN, SUPER_ADMIN, or PRODUCT_MANAGER role' })
  remove(@Param('id') id: string) {
    return this.productVariationsService.remove(id);
  }
}
