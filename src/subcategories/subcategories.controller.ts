import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SubCategoriesService } from './subcategories.service';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubCategoryDto } from './dto/update-subcategory.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('subcategories')
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER')
  create(@Body() createSubCategoryDto: CreateSubCategoryDto) {
    return this.subCategoriesService.create(createSubCategoryDto);
  }

  @Get()
  findAll() {
    return this.subCategoriesService.findAll();
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
  update(@Param('id') id: string, @Body() updateSubCategoryDto: UpdateSubCategoryDto) {
    return this.subCategoriesService.update(id, updateSubCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER')
  remove(@Param('id') id: string) {
    return this.subCategoriesService.remove(id);
  }
}
