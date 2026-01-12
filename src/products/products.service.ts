import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationDto } from 'src/pagination/dto/pagination.dto';
import { PaginationResponseDto } from 'src/pagination/pagination-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchFilterDto } from 'src/pagination/dto/search-filter.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  // 🔹 Create product with file upload and product data
  async createWithUpload(
    createProductDto: CreateProductDto,
    imageFiles?: Express.Multer.File[],
  ) {
    const { images, ...productData } = createProductDto;

    productData.actualPrice = Number(productData.actualPrice);
    productData.discountedPrice = Number(productData.discountedPrice);
    productData.stockCount = Number(productData.stockCount);

    // Upload images to S3 if files are provided
    let uploadedImages = [];
    if (imageFiles && imageFiles.length > 0) {
      const uploadResults = await this.s3Service.uploadMultipleFiles(
        imageFiles,
        'products',
      );
      uploadedImages = uploadResults.map((result, index) => ({
        url: result.url,
        altText: `Product image ${index + 1}`,
        isMain: index === 0, // First image is main
        sortOrder: index,
      }));
    }

    // Merge uploaded images with provided image URLs (if any)
    const allImages = [...uploadedImages, ...(images || [])];

    return this.prisma.product.create({
      data: {
        ...productData,
        images: allImages.length
          ? {
              create: allImages.map((img) => ({
                url: img.url,
                altText: img.altText,
                isMain: img.isMain ?? false,
                sortOrder: img.sortOrder ?? 0,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        subCategory: {
          include: {
            category: true,
          },
        },
        variations: true,
      },
    });
  }

  // 🔹 Create product with image URLs only (backward compatibility)
  async create(createProductDto: CreateProductDto) {
    return this.createWithUpload(createProductDto);
  }

  async findAll(query: SearchFilterDto, userId?: string) {
    let customerProfileId: string | undefined; // ✅ Declare outside

    if (userId) {
      const customerProfile = await this.prisma.customerProfile.findUnique({
        where: { userId },
      });
      customerProfileId = customerProfile?.id; // ✅ Assign inside
    }

    const {
      search,
      limit = 10,
      page = 1,
      minPrice,
      maxPrice,
      categoryId,
      subCategoryId,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {},
        minPrice ? { discountedPrice: { gte: minPrice } } : {},
        maxPrice ? { discountedPrice: { lte: maxPrice } } : {},
        subCategoryId ? { subCategoryId } : {},
        categoryId
          ? {
              subCategory: {
                is: {
                  categoryId,
                },
              },
            }
          : {},
      ].filter((condition) => Object.keys(condition).length > 0),
    };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: {
          images: true,
          subCategory: {
            include: {
              category: true,
            },
          },
          variations: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    // 🚀 Add is_wishlisted for each product
    let productsWithWishlist;
    if (customerProfileId) {
      const wishlist = await this.prisma.wishlist.findMany({
        where: {
          customerProfileId,
          productId: { in: products.map((p) => p.id) },
        },
        select: { productId: true },
      });

      const wishlistedIds = new Set(wishlist.map((w) => w.productId));

      productsWithWishlist = products.map((p) => ({
        ...p,
        is_wishlisted: wishlistedIds.has(p.id),
      }));
    } else {
      // if not logged in, default false
      productsWithWishlist = products.map((p) => ({
        ...p,
        is_wishlisted: false,
      }));
    }

    return new PaginationResponseDto(productsWithWishlist, total, page, limit);
  }

  // 🔹 Get product by ID
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        subCategory: {
          include: {
            category: true,
          },
        },
        variations: true,
      },
    });

    if (!product)
      throw new NotFoundException(`Product with ID ${id} not found`);
    return product;
  }

  // 🔹 Update product with file upload
  async updateWithUpload(
    id: string,
    updateProductDto: UpdateProductDto,
    imageFiles?: Express.Multer.File[],
  ) {
    const { images, ...productData } = updateProductDto;

    // Upload new images to S3 if files are provided
    let uploadedImages = [];
    if (imageFiles && imageFiles.length > 0) {
      const uploadResults = await this.s3Service.uploadMultipleFiles(
        imageFiles,
        'products',
      );
      uploadedImages = uploadResults.map((result, index) => ({
        url: result.url,
        altText: `Product image ${index + 1}`,
        isMain: index === 0,
        sortOrder: index,
      }));
    }

    // Merge uploaded images with provided image URLs
    const allImages = [...uploadedImages, ...(images || [])];

    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(allImages.length > 0
          ? {
              images: {
                deleteMany: {}, // remove old images
                create: allImages.map((img) => ({
                  url: img.url,
                  altText: img.altText,
                  isMain: img.isMain ?? false,
                  sortOrder: img.sortOrder ?? 0,
                })),
              },
            }
          : {}),
      },
      include: {
        images: true,
        subCategory: {
          include: {
            category: true,
          },
        },
        variations: true,
      },
    });
  }

  // 🔹 Update product with image URLs only (backward compatibility)
  async update(id: string, updateProductDto: UpdateProductDto) {
    return this.updateWithUpload(id, updateProductDto);
  }

  // 🔹 Delete product
  async remove(id: string) {
    if (!(await this.prisma.product.findUnique({ where: { id } }))) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return this.prisma.product.delete({ where: { id } });
  }

  async getRelatedProducts(productId: string, customerProfileId?: string) {
    // 1. Get the product by ID
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // 2. Find related products
    const relatedProducts = await this.prisma.product.findMany({
      where: {
        AND: [
          { id: { not: product.id } },
          {
            OR: [
              { name: { contains: product.name.split(' ')[0].toLowerCase() } },
            ],
          },
        ],
      },
      include: {
        images: true,
        subCategory: {
          include: {
            category: true,
          },
        },
        variations: true,
      },
      take: 10, // limit related products
    });

    // 3. Add is_wishlisted field
    let productsWithWishlist = relatedProducts;
    if (customerProfileId) {
      const wishlist = await this.prisma.wishlist.findMany({
        where: {
          customerProfileId,
          productId: { in: relatedProducts.map((p) => p.id) },
        },
        select: { productId: true },
      });
      const wishlistedIds = new Set(wishlist.map((w) => w.productId));

      productsWithWishlist = relatedProducts.map((p) => ({
        ...p,
        is_wishlisted: wishlistedIds.has(p.id),
      }));
    } else {
      productsWithWishlist = relatedProducts.map((p) => ({
        ...p,
        is_wishlisted: false,
      }));
    }

    return productsWithWishlist;
  }

  async updateStock(dto: UpdateStockDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: { id: dto.productId },
      data: { stockCount: product.stockCount + dto.quantity },
      select: {
        id: true,
        name: true,
        stockCount: true,
        updatedAt: true,
      },
    });
  }
}
