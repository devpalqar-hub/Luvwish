import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubCategoryDto } from './dto/update-subcategory.dto';
import { SubCategoryFilterDto } from './dto/subcategory-filter.dto';
import { PaginationResponseDto } from 'src/pagination/pagination-response.dto';

@Injectable()
export class SubCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) { }

  async create(
    createSubCategoryDto: CreateSubCategoryDto,
    imageFile?: Express.Multer.File,
  ) {
    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: createSubCategoryDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${createSubCategoryDto.categoryId} not found`,
      );
    }

    // Check for duplicate slug
    const existingSubCategory = await this.prisma.subCategory.findUnique({
      where: { slug: createSubCategoryDto.slug },
    });

    if (existingSubCategory) {
      throw new ConflictException('SubCategory with this slug already exists');
    }

    // Upload image to S3 if provided
    let imageUrl: string | undefined;
    if (imageFile) {
      const uploadResult = await this.s3Service.uploadFile(
        imageFile,
        'subcategories',
      );
      imageUrl = uploadResult.url;
    }

    const { image, ...subCategoryData } = createSubCategoryDto;

    return this.prisma.subCategory.create({
      data: {
        ...subCategoryData,
        ...(imageUrl && { image: imageUrl }),
      },
      include: { category: true },
    });
  }

  async findAll(filters?: SubCategoryFilterDto) {
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

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.subCategory.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.subCategory.count({ where }),
    ]);

    return new PaginationResponseDto(data, total, page, limit);
  }

  async findByCategoryId(categoryId: string) {
    return this.prisma.subCategory.findMany({
      where: { categoryId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID ${id} not found`);
    }

    return subCategory;
  }
  async update(
    id: string,
    updateSubCategoryDto: UpdateSubCategoryDto,
    imageFile?: Express.Multer.File,
  ) {
    await this.findOne(id);

    // Validate category change
    if (updateSubCategoryDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateSubCategoryDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateSubCategoryDto.categoryId} not found`,
        );
      }
    }

    // Validate slug uniqueness
    if (updateSubCategoryDto.slug) {
      const existingSubCategory = await this.prisma.subCategory.findFirst({
        where: {
          AND: [{ id: { not: id } }, { slug: updateSubCategoryDto.slug }],
        },
      });

      if (existingSubCategory) {
        throw new ConflictException(
          'SubCategory with this slug already exists',
        );
      }
    }

    // Upload image if provided
    let imageUrl: string | undefined;
    if (imageFile) {
      const uploadResult = await this.s3Service.uploadFile(
        imageFile,
        'subcategories',
      );
      imageUrl = uploadResult.url;
    }

    // Exclude image from DTO (handled separately)
    const { image, ...subCategoryData } = updateSubCategoryDto;

    return this.prisma.subCategory.update({
      where: { id },
      data: {
        ...subCategoryData,          // ← includes isActive safely
        ...(imageUrl && { image: imageUrl }),
      },
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.subCategory.delete({ where: { id } });
  }
}
