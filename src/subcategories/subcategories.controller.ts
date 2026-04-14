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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Subcategories')
@Controller('subcategories')
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER')
  @UseInterceptors(FileInterceptor('image'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create subcategory' })
  @ApiBody({ type: CreateSubCategoryDto })
  @ApiOkResponse({ description: 'Subcategory created successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN, SUPER_ADMIN, or PRODUCT_MANAGER role' })
  create(
    @Body() createSubCategoryDto: CreateSubCategoryDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.subCategoriesService.create(createSubCategoryDto, image);
  }

  @Get()
  @ApiOperation({ summary: 'List subcategories with optional filters' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category id' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOkResponse({ description: 'Subcategories returned successfully' })
  findAll(@Query() filters: SubCategoryFilterDto) {
    return this.subCategoriesService.findAll(filters);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Get subcategories by category id' })
  @ApiParam({ name: 'categoryId', description: 'Category id' })
  @ApiOkResponse({ description: 'Subcategories returned successfully' })
  findByCategoryId(@Param('categoryId') categoryId: string) {
    return this.subCategoriesService.findByCategoryId(categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subcategory by id' })
  @ApiParam({ name: 'id', description: 'Subcategory id' })
  @ApiOkResponse({ description: 'Subcategory returned successfully' })
  findOne(@Param('id') id: string) {
    return this.subCategoriesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER')
  @UseInterceptors(FileInterceptor('image'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update subcategory by id' })
  @ApiParam({ name: 'id', description: 'Subcategory id' })
  @ApiBody({ type: UpdateSubCategoryDto })
  @ApiOkResponse({ description: 'Subcategory updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN, SUPER_ADMIN, or PRODUCT_MANAGER role' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete subcategory by id' })
  @ApiParam({ name: 'id', description: 'Subcategory id' })
  @ApiOkResponse({ description: 'Subcategory deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN, SUPER_ADMIN, or PRODUCT_MANAGER role' })
  remove(@Param('id') id: string) {
    return this.subCategoriesService.remove(id);
  }
}
