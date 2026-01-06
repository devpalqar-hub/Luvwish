import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductVariationDto } from './dto/create-product-variation.dto';
import { UpdateProductVariationDto } from './dto/update-product-variation.dto';

@Injectable()
export class ProductVariationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductVariationDto: CreateProductVariationDto) {
    const { productId, ...variationData } = createProductVariationDto;

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Check for duplicate SKU
    const existingVariation = await this.prisma.productVariation.findUnique({
      where: { sku: createProductVariationDto.sku },
    });

    if (existingVariation) {
      throw new ConflictException('Product variation with this SKU already exists');
    }

    return this.prisma.productVariation.create({
      data: {
        ...variationData,
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
