import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryFilterDto } from './dto/category-filter.dto';
import { PaginationResponseDto } from 'src/pagination/pagination-response.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) { }

  async create(createCategoryDto: CreateCategoryDto, imageFile?: Express.Multer.File) {
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

    // Upload image to S3 if provided
    let imageUrl: string | undefined;
    if (imageFile) {
      const uploadResult = await this.s3Service.uploadFile(imageFile, 'categories');
      imageUrl = uploadResult.url;
    }

    const { image, ...categoryData } = createCategoryDto;

    return this.prisma.category.create({
      data: {
        ...categoryData,
        ...(imageUrl && { image: imageUrl }),
      },
      include: { subCategories: true },
    });
  }

  async findAll(filters?: CategoryFilterDto) {
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';

    // Build where clause
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }
    // ✅ isActive filter
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        include: {
          subCategories: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return new PaginationResponseDto(data, total, page, limit);
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

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    imageFile?: Express.Multer.File,
  ) {
    await this.findOne(id);

    // Validate name / slug uniqueness
    if (updateCategoryDto.name || updateCategoryDto.slug) {
      const existingCategory = await this.prisma.category.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateCategoryDto.name
                  ? { name: updateCategoryDto.name }
                  : undefined,
                updateCategoryDto.slug
                  ? { slug: updateCategoryDto.slug }
                  : undefined,
              ].filter(Boolean),
            },
          ],
        },
      });

      if (existingCategory) {
        throw new ConflictException(
          'Category with this name or slug already exists',
        );
      }
    }

    // Upload image if provided
    let imageUrl: string | undefined;
    if (imageFile) {
      const uploadResult = await this.s3Service.uploadFile(
        imageFile,
        'categories',
      );
      imageUrl = uploadResult.url;
    }

    // Exclude image from DTO (handled separately)
    const { image, ...categoryData } = updateCategoryDto;

    return this.prisma.category.update({
      where: { id },
      data: {
        ...categoryData,            // ← includes isActive safely
        ...(imageUrl && { image: imageUrl }),
      },
      include: { subCategories: true },
    });
  }


  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.category.delete({ where: { id } });
  }
}
