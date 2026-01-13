import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubCategoriesService } from './subcategories.service';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubCategoryDto } from './dto/update-subcategory.dto';
import { SubCategoryFilterDto } from './dto/subcategory-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('subcategories')
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER')
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() createSubCategoryDto: CreateSubCategoryDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.subCategoriesService.create(createSubCategoryDto, image);
  }

  @Get()
  findAll(@Query() filters: SubCategoryFilterDto) {
    return this.subCategoriesService.findAll(filters);
  }

  @Get('category/:categoryId')
  findByCategoryId(@Param('categoryId') categoryId: string) {
    return this.subCategoriesService.findByCategoryId(categoryId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subCategoriesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER')
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id') id: string,
    @Body() updateSubCategoryDto: UpdateSubCategoryDto,
    @UploadedFile() imageFile?: Express.Multer.File,
  ) {
    return this.subCategoriesService.update(
      id,
      updateSubCategoryDto,
      imageFile,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER')
  remove(@Param('id') id: string) {
    return this.subCategoriesService.remove(id);
  }
}
