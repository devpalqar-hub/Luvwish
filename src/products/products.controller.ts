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
  BadRequestException,
  UsePipes,
  ValidationPipe,
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
import { AdminProductFilterDto } from './dto/admin-product-filter.dto';
import { UpdateProductVariationDto } from './dto/update-product-variation.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

const maxSize = 10 * 1024 * 1024; // 50MB per media
const maxSizeGallery = 50 * 1024 * 1024; // 50 MB

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly s3Service: S3Service,
  ) { }

  // 🔹 Create product with images
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(FilesInterceptor('images', 10))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create product with image uploads' })
  @ApiOkResponse({ description: 'Product created successfully' })
  async create(
    @Body() body: any,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    // 🔹 REQUIRED fields check
    if (!body.name) {
      throw new BadRequestException('name is required');
    }

    // 🔹 Booleans
    body.isStock =
      body.isStock === 'true' || body.isStock === true || body.isStock === 1;

    body.isFeatured =
      body.isFeatured === 'true' ||
      body.isFeatured === true ||
      body.isFeatured === 1;

    // 🔹 Numbers (safe conversion)
    body.actualPrice =
      body.actualPrice !== undefined ? Number(body.actualPrice) : undefined;

    body.discountedPrice =
      body.discountedPrice !== undefined
        ? Number(body.discountedPrice)
        : undefined;

    body.stockCount =
      body.stockCount !== undefined ? Number(body.stockCount) : undefined;

    // 🔹 Variations
    if (typeof body.variations === 'string') {
      body.variations = JSON.parse(body.variations);
    }

    return this.productsService.createWithUpload(body, images);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List products with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiOkResponse({ description: 'Products returned successfully' })
  findAll(@Query() query: SearchFilterDto, @Request() req) {
    // If user is logged in (set by your JWT middleware), use their id
    const userId = req.user?.id || req.user?.sub; // handle either shape
    return this.productsService.findAll(query, userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('featured')
  @ApiOperation({ summary: 'List featured products' })
  @ApiOkResponse({ description: 'Featured products returned successfully' })
  getFeaturedProducts(@Query() query: SearchFilterDto, @Request() req) {
    const userId = req.user?.id || req.user?.sub;
    return this.productsService.getFeaturedProducts(query, userId);
  }

  // 🔹 Admin: Get all products with filters (variations listed separately)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('admin/products')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin list products with advanced filters' })
  @ApiOkResponse({ description: 'Admin product list returned successfully' })
  getAdminProducts(@Query() query: AdminProductFilterDto) {
    return this.productsService.getAdminProducts(query);
  }

  // 🔹 Get single product
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get product by id' })
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiOkResponse({ description: 'Product returned successfully' })
  findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?.sub;
    return this.productsService.findOne(id, userId);
  }

  // // 🔹 Update product (with images)
  // @Patch(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  // @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  // async update(
  //   @Param('id') id: string,
  //   @Body() updateProductDto: UpdateProductDto,
  //   @UploadedFiles() images?: Express.Multer.File[],
  // ) {
  //   return this.productsService.updateWithUpload(id, updateProductDto, images);
  // }

  // 🔹 Delete product
  // 🔹 Update product (with images)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product by id' })
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiOkResponse({ description: 'Product deleted successfully' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related products' })
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiQuery({ name: 'customerProfileId', required: false })
  @ApiOkResponse({ description: 'Related products returned successfully' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update stock for products/variations' })
  @ApiBody({ type: UpdateStockDto })
  @ApiOkResponse({ description: 'Stock updated successfully' })
  async updateStock(@Body() dto: UpdateStockDto) {
    return this.productsService.updateStock(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Patch(':id/featured')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle product featured flag' })
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiBody({ type: ToggleFeaturedDto })
  @ApiOkResponse({ description: 'Featured flag updated successfully' })
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
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload product images to S3' })
  @ApiOkResponse({ description: 'Product images uploaded successfully' })
  async uploadProductImages(@UploadedFiles() images: Express.Multer.File[]) {
    return this.s3Service.uploadMultipleFiles(images, 'products');
  }


  //this is by devanand joly
  @Patch(':id')
  @ApiOperation({ summary: 'Update product by id' })
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiBody({ type: UpdateProductDto })
  @ApiOkResponse({ description: 'Product updated successfully' })
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    // 🔍 DEBUG (will now be boolean)
    console.log(typeof dto.isFeatured, dto.isFeatured);
    console.log("hi adheena")
    return this.productsService.updateProduct(
      id,
      dto,
    );
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post(':productId/gallery/images')
  @UseInterceptors(FilesInterceptor('image', 10))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Add gallery images to product' })
  @ApiParam({ name: 'productId', description: 'Product id' })
  @ApiOkResponse({ description: 'Product gallery images added successfully' })
  async addProductImages(
    @Param('productId') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('altText') altText?: string,
    @Body('isMain') isMain?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    const totalGallerySize = files.reduce(
      (sum, file) => sum + file.size,
      0,
    );

    if (totalGallerySize > maxSizeGallery) {
      throw new BadRequestException(
        'Total product image size must not exceed 50MB',
      );
    }

    const folder = 'uploads/product/';
    const uploadedResponses = await this.s3Service.uploadMultipleFiles(
      files,
      folder,
    );

    const imagePayload = uploadedResponses.map((res, index) => ({
      url: res.url,
      altText: altText ?? null,
      isMain: index === 0 && isMain === 'true', // first image as main if requested
    }));

    return this.productsService.addProductImages(productId, imagePayload);
  }


  // =========================
  // GET MESS IMAGES
  // =========================
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.MESS_ADMIN)

  // @ApiOperation({ summary: 'Get mess gallery images' })
  // @ApiResponse({
  //     status: 200,
  //     description: 'Mess images fetched successfully',
  // })
  @Get(':productId/gallery/images')
  @ApiOperation({ summary: 'Get product gallery images' })
  @ApiParam({ name: 'productId', description: 'Product id' })
  @ApiOkResponse({ description: 'Product gallery images returned successfully' })
  async getProductImages(@Param('productId') productId: string) {
    return this.productsService.getProductImages(productId);
  }

  // =========================
  // DELETE MESS IMAGE
  // =========================
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.MESS_ADMIN)
  @Delete(':productId/gallery/images/:imageId')
  @ApiOperation({ summary: 'Delete product gallery image' })
  @ApiParam({ name: 'productId', description: 'Product id' })
  @ApiParam({ name: 'imageId', description: 'Image id' })
  @ApiOkResponse({ description: 'Product gallery image deleted successfully' })
  async deleteProductImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.deleteproductImage(productId, imageId);
  }

  @Get(":productId/variations")
  @ApiOperation({ summary: 'Get all variations for product' })
  @ApiParam({ name: 'productId', description: 'Product id' })
  @ApiOkResponse({ description: 'Product variations returned successfully' })
  async getAllVariation(@Param('productId') productId?: string) {
    return this.productsService.getAllVariation(productId);
  }
}
