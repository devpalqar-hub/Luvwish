import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        OR: [
          { name: createCategoryDto.name },
          { slug: createCategoryDto.slug },
        ],
      },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name or slug already exists');
    }

    return this.prisma.category.create({
      data: createCategoryDto,
      include: { subCategories: true },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        subCategories: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);

    if (updateCategoryDto.name || updateCategoryDto.slug) {
      const existingCategory = await this.prisma.category.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateCategoryDto.name ? { name: updateCategoryDto.name } : {},
                updateCategoryDto.slug ? { slug: updateCategoryDto.slug } : {},
              ],
            },
          ],
        },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name or slug already exists');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: { subCategories: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.category.delete({ where: { id } });
  }
}
