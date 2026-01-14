import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationDto } from 'src/pagination/dto/pagination.dto';
import { PaginationResponseDto } from 'src/pagination/pagination-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchFilterDto } from 'src/pagination/dto/search-filter.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ToggleFeaturedDto } from './dto/toggle-featured.dto';
import {
  AdminProductFilterDto,
  StockStatus,
} from './dto/admin-product-filter.dto';
import {
  AdminProductListResponseDto,
  AdminProductItemDto,
} from './dto/admin-product-response.dto';
import { generateSKU } from '../common/utility/utils';

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
    const { images, variations, ...productData } = createProductDto;

    // Verify subCategoryId exists
    if (productData.subCategoryId) {
      const subCategory = await this.prisma.subCategory.findUnique({
        where: { id: productData.subCategoryId },
      });
      if (!subCategory) {
        throw new NotFoundException(
          `SubCategory with ID ${productData.subCategoryId} not found`,
        );
      }
    }

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

    // Auto-generate SKUs for variations if not provided
    let processedVariations = variations;
    if (variations && variations.length > 0) {
      processedVariations = await Promise.all(
        variations.map(async (variation) => {
          let sku = variation.sku;

          // Generate SKU if not provided
          if (!sku) {
            sku = generateSKU(productData.name, variation.variationName);

            // Ensure uniqueness with retry logic
            let existingVariation = await this.prisma.productVariation.findUnique({
              where: { sku },
            });

            let retryCount = 0;
            while (existingVariation && retryCount < 5) {
              sku = generateSKU(productData.name, variation.variationName);
              existingVariation = await this.prisma.productVariation.findUnique({
                where: { sku },
              });
              retryCount++;
            }

            if (existingVariation) {
              throw new ConflictException(
                `Unable to generate unique SKU for variation ${variation.variationName}`,
              );
            }
          }

          return { ...variation, sku };
        }),
      );

      // Check for duplicate SKUs in the processed variations array
      const skus = processedVariations.map((v) => v.sku);
      const uniqueSkus = new Set(skus);
      if (uniqueSkus.size !== skus.length) {
        throw new ConflictException('Duplicate SKUs found in variations');
      }

      // Check if any SKU already exists in the database
      const existingVariation = await this.prisma.productVariation.findFirst({
        where: {
          sku: {
            in: skus,
          },
        },
      });

      if (existingVariation) {
        throw new ConflictException(
          `Product variation with SKU ${existingVariation.sku} already exists`,
        );
      }
    }

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
        variations: processedVariations?.length
          ? {
              create: processedVariations.map((variation) => ({
                variationName: variation.variationName,
                sku: variation.sku,
                price: variation.price,
                stockCount: variation.stockCount,
                isAvailable: variation.isAvailable ?? true,
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
      isFeatured,
      isStock,
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
        isFeatured !== undefined ? { isFeatured } : {},
        isStock !== undefined ? { isStock } : {},
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
        reviews: {
          include: {
            images: true,
            customerProfile: {
              select: {
                name: true,
                profilePicture: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!product)
      throw new NotFoundException(`Product with ID ${id} not found`);
    
    // Calculate review statistics
    const reviewStats = {
      totalReviews: product.reviews.length,
      averageRating: product.reviews.length > 0 
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length 
        : 0,
      ratingDistribution: {
        5: product.reviews.filter(r => r.rating === 5).length,
        4: product.reviews.filter(r => r.rating === 4).length,
        3: product.reviews.filter(r => r.rating === 3).length,
        2: product.reviews.filter(r => r.rating === 2).length,
        1: product.reviews.filter(r => r.rating === 1).length,
      },
    };

    return {
      ...product,
      reviewStats,
    };
  }

  // 🔹 Update product with file upload
  async updateWithUpload(
    id: string,
    updateProductDto: UpdateProductDto,
    imageFiles?: Express.Multer.File[],
  ) {
    const { images, variations, ...productData } = updateProductDto;

    // Get product name for SKU generation
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const productName = productData.name || product.name;

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

    // Auto-generate SKUs for variations if not provided
    let processedVariations = variations;
    if (variations && variations.length > 0) {
      processedVariations = await Promise.all(
        variations.map(async (variation) => {
          let sku = variation.sku;

          // Generate SKU if not provided
          if (!sku) {
            sku = generateSKU(productName, variation.variationName);

            // Ensure uniqueness with retry logic
            let existingVariation = await this.prisma.productVariation.findUnique({
              where: { sku },
            });

            let retryCount = 0;
            while (existingVariation && retryCount < 5) {
              sku = generateSKU(productName, variation.variationName);
              existingVariation = await this.prisma.productVariation.findUnique({
                where: { sku },
              });
              retryCount++;
            }

            if (existingVariation) {
              throw new ConflictException(
                `Unable to generate unique SKU for variation ${variation.variationName}`,
              );
            }
          }

          return { ...variation, sku };
        }),
      );
    }

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
        ...(processedVariations && processedVariations.length > 0
          ? {
              variations: {
                deleteMany: {}, // remove old variations
                create: processedVariations.map((variation) => ({
                  variationName: variation.variationName,
                  sku: variation.sku,
                  price: variation.price,
                  stockCount: variation.stockCount,
                  isAvailable: variation.isAvailable ?? true,
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

  async getFeaturedProducts(query: SearchFilterDto, userId?: string) {
    let customerProfileId: string | undefined;

    if (userId) {
      const customerProfile = await this.prisma.customerProfile.findUnique({
        where: { userId },
      });
      customerProfileId = customerProfile?.id;
    }

    const { limit = 10, page = 1, categoryId, subCategoryId } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      isFeatured: true,
      AND: [
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

    // Add is_wishlisted for each product
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
      productsWithWishlist = products.map((p) => ({
        ...p,
        is_wishlisted: false,
      }));
    }

    return new PaginationResponseDto(productsWithWishlist, total, page, limit);
  }

  async toggleFeatured(id: string, dto: ToggleFeaturedDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return this.prisma.product.update({
      where: { id },
      data: { isFeatured: dto.isFeatured },
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

  // 🔹 Admin: Get all products with filters (includes variations as separate items)
  async getAdminProducts(
    query: AdminProductFilterDto,
  ): Promise<AdminProductListResponseDto> {
    const { search, subCategoryId, stockStatus, page = '1', limit = '10' } = query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for products
    const where: any = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (subCategoryId) {
      where.subCategoryId = subCategoryId;
    }

    // Fetch products with variations
    const products = await this.prisma.product.findMany({
      where,
      include: {
        images: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        subCategory: true,
        variations: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform products and variations into a flat list
    const productItems: AdminProductItemDto[] = [];

    for (const product of products) {
      const firstImage = product.images.find((img) => img.isMain)?.url || 
                         product.images[0]?.url || 
                         null;
      const images = product.images.map((img) => img.url);

      // If product has variations, list each variation as a separate item
      if (product.variations && product.variations.length > 0) {
        for (const variation of product.variations) {
          const stockCount = variation.stockCount;
          const varStockStatus = this.getStockStatus(stockCount, variation.isAvailable);

          // Apply stock status filter
          if (stockStatus && varStockStatus !== stockStatus) {
            continue;
          }

          productItems.push({
            id: product.id,
            productName: `${product.name} - ${variation.variationName}`,
            firstImage,
            images,
            subCategory: product.subCategory?.name || null,
            stockPrice: Number(product.actualPrice),
            discountedPrice: Number(variation.price),
            sku: variation.sku,
            isVariationProduct: true,
            variationId: variation.id,
            stockStatus: varStockStatus,
            stockCount,
          });
        }
      } else {
        // No variations, list the product itself
        const stockCount = product.stockCount;
        const prodStockStatus = this.getStockStatus(stockCount, product.isStock);

        // Apply stock status filter
        if (stockStatus && prodStockStatus !== stockStatus) {
          continue;
        }

        productItems.push({
          id: product.id,
          productName: product.name,
          firstImage,
          images,
          subCategory: product.subCategory?.name || null,
          stockPrice: Number(product.actualPrice),
          discountedPrice: Number(product.discountedPrice),
          sku: null,
          isVariationProduct: false,
          variationId: null,
          stockStatus: prodStockStatus,
          stockCount,
        });
      }
    }

    // Apply pagination to the flattened list
    const total = productItems.length;
    const paginatedItems = productItems.slice(skip, skip + limitNum);

    return {
      data: paginatedItems,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  // Helper method to determine stock status
  private getStockStatus(
    stockCount: number,
    isAvailable: boolean,
  ): 'in_stock' | 'out_of_stock' | 'low_stock' {
    if (!isAvailable || stockCount === 0) {
      return 'out_of_stock';
    }
    if (stockCount < 5) {
      return 'low_stock';
    }
    return 'in_stock';
  }
}

