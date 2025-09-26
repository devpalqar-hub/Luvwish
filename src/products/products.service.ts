import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationDto } from 'src/pagination/dto/pagination.dto';
import { PaginationResponseDto } from 'src/pagination/pagination-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchFilterDto } from 'src/pagination/dto/search-filter.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) { }

  // 🔹 Create product with multiple images
  async create(createProductDto: CreateProductDto) {
    const { images, ...productData } = createProductDto;

    return this.prisma.product.create({
      data: {
        ...productData,
        images: images?.length
          ? {
            create: images.map((img) => ({
              url: img.url,
              altText: img.altText,
              isMain: img.isMain ?? false,
              sortOrder: img.sortOrder ?? 0,
            })),
          }
          : undefined,
      },
      include: { images: true },
    });
  }

  async findAll(query: SearchFilterDto, customerProfileId?: string) {
    const { search, limit = 10, page = 1, minPrice } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      AND: [
        search
          ? {
            OR: [
              { name: { contains: search, } },
              { description: { contains: search, } },
            ],
          }
          : {},
        minPrice ? { discountedPrice: { lt: minPrice } } : {},
      ],
    };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { images: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    // 🚀 Add is_wishlisted for each product
    let productsWithWishlist = products;
    if (customerProfileId) {
      const wishlist = await this.prisma.wishlist.findMany({
        where: { customerProfileId, productId: { in: products.map(p => p.id) } },
        select: { productId: true },
      });
      const wishlistedIds = new Set(wishlist.map(w => w.productId));

      productsWithWishlist = products.map(p => ({
        ...p,
        is_wishlisted: wishlistedIds.has(p.id),
      }));
    } else {
      // if not logged in, default false
      productsWithWishlist = products.map(p => ({
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
      include: { images: true },
    });

    if (!product)
      throw new NotFoundException(`Product with ID ${id} not found`);
    return product;
  }

  // 🔹 Update product (including images)
  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, ...productData } = updateProductDto;

    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(images
          ? {
            images: {
              deleteMany: {}, // remove old images
              create: images.map((img) => ({
                url: img.url,
                altText: img.altText,
                isMain: img.isMain ?? false,
                sortOrder: img.sortOrder ?? 0,
              })),
            },
          }
          : {}),
      },
      include: { images: true },
    });
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
      include: { images: true },
      take: 10, // limit related products
    });

    // 3. Add is_wishlisted field
    let productsWithWishlist = relatedProducts;
    if (customerProfileId) {
      const wishlist = await this.prisma.wishlist.findMany({
        where: { customerProfileId, productId: { in: relatedProducts.map(p => p.id) } },
        select: { productId: true },
      });
      const wishlistedIds = new Set(wishlist.map(w => w.productId));

      productsWithWishlist = relatedProducts.map(p => ({
        ...p,
        is_wishlisted: wishlistedIds.has(p.id),
      }));
    } else {
      productsWithWishlist = relatedProducts.map(p => ({
        ...p,
        is_wishlisted: false,
      }));
    }

    return productsWithWishlist;
  }

}
