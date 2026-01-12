import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { S3Service } from '../s3/s3.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchFilterDto } from 'src/pagination/dto/search-filter.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ToggleFeaturedDto } from './dto/toggle-featured.dto';
import { OptionalJwtAuthGuard } from 'src/common/guards/ optional-jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly s3Service: S3Service,
  ) {}

  // 🔹 Create product with images
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post()
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.productsService.createWithUpload(createProductDto, images);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(@Query() query: SearchFilterDto, @Request() req) {
    // If user is logged in (set by your JWT middleware), use their id
    const userId = req.user?.id || req.user?.sub; // handle either shape
    return this.productsService.findAll(query, userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('featured')
  getFeaturedProducts(@Query() query: SearchFilterDto, @Request() req) {
    const userId = req.user?.id || req.user?.sub;
    return this.productsService.getFeaturedProducts(query, userId);
  }

  // 🔹 Get single product
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // 🔹 Update product (with images)
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.productsService.updateWithUpload(id, updateProductDto, images);
  }

  // 🔹 Delete product
  // 🔹 Update product (with images)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get(':id/related')
  async getRelatedProducts(
    @Param('id') productId: string,
    @Query('customerProfileId') customerProfileId?: string,
  ) {
    return this.productsService.getRelatedProducts(
      productId,
      customerProfileId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('update-stock')
  async updateStock(@Body() dto: UpdateStockDto) {
    return this.productsService.updateStock(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/featured')
  async toggleFeatured(
    @Param('id') id: string,
    @Body() dto: ToggleFeaturedDto,
  ) {
    return this.productsService.toggleFeatured(id, dto);
  }

  // 🔹 Upload product images
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  async uploadProductImages(@UploadedFiles() images: Express.Multer.File[]) {
    return this.s3Service.uploadMultipleFiles(images, 'products');
  }
}
