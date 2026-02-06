import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductVariationDto } from './dto/create-product-variation.dto';
import { UpdateProductVariationDto } from './dto/update-product-variation.dto';
import { generateSKU } from '../common/utility/utils';

@Injectable()
export class ProductVariationsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createProductVariationDto: CreateProductVariationDto) {
    const { productId, ...variationData } = createProductVariationDto;

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Auto-generate SKU if not provided
    let sku = variationData.sku;
    if (!sku) {
      sku = generateSKU(product.name, createProductVariationDto.variationName);

      // Ensure generated SKU is unique
      let existingVariation = await this.prisma.productVariation.findUnique({
        where: { sku },
      });

      // If collision, regenerate with retry logic
      let retryCount = 0;
      while (existingVariation && retryCount < 5) {
        sku = generateSKU(product.name, createProductVariationDto.variationName);
        existingVariation = await this.prisma.productVariation.findUnique({
          where: { sku },
        });
        retryCount++;
      }

      if (existingVariation) {
        throw new ConflictException('Unable to generate unique SKU. Please try again.');
      }
    } else {
      // Check for duplicate SKU if provided
      const existingVariation = await this.prisma.productVariation.findUnique({
        where: { sku },
      });

      if (existingVariation) {
        throw new ConflictException('Product variation with this SKU already exists');
      }
    }

    return this.prisma.productVariation.create({
      data: {
        ...variationData,
        sku,
        productId,
      },
      include: {
        product: true,
      },
    });
  }

  async findByProductId(productId: string) {
    return this.prisma.productVariation.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const variation = await this.prisma.productVariation.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!variation) {
      throw new NotFoundException(`Product variation with ID ${id} not found`);
    }

    return variation;
  }

  async update(id: string, updateProductVariationDto: UpdateProductVariationDto) {
    await this.findOne(id);

    if (updateProductVariationDto.sku) {
      const existingVariation = await this.prisma.productVariation.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { sku: updateProductVariationDto.sku },
          ],
        },
      });

      if (existingVariation) {
        throw new ConflictException('Product variation with this SKU already exists');
      }
    }

    return this.prisma.productVariation.update({
      where: { id },
      data: updateProductVariationDto,
      include: {
        product: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.productVariation.delete({ where: { id } });
  }
}
