import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { S3Service } from 'src/s3/s3.service';
const maxSize = 10 * 1024 * 1024; // 50MB per media
const maxSizeGallery = 50 * 1024 * 1024; // 50 MB

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService,
    private readonly s3Service: S3Service,
  ) { }
  // Admin - Create banner
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'SUPER_ADMIN', 'MARKETING_MANAGER')
  @Post('admin')
  @UseInterceptors(FilesInterceptor('image', 10))
  async createBanner(
    @Body() createBannerDto: CreateBannerDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one banner image is required');
    }

    const MAX_GALLERY_SIZE = 50 * 1024 * 1024; // 50 MB

    const totalSize = files.reduce(
      (sum, file) => sum + (file?.size ?? 0),
      0,
    );

    if (totalSize > MAX_GALLERY_SIZE) {
      throw new BadRequestException(
        'Total banner image size must not exceed 50 MB',
      );
    }

    const uploadFolder = 'uploads/banner/';
    const uploadedFiles = await this.s3Service.uploadMultipleFiles(
      files,
      uploadFolder,
    );

    return this.bannersService.create(createBannerDto, uploadedFiles);
  }




  // Public - List all banners
  @Get()
  findAll() {
    return this.bannersService.findAll();
  }

  // Admin - Get single banner
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'SUPER_ADMIN', 'MARKETING_MANAGER')
  @Get('admin/:id')
  findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  // Admin - Update banner
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'SUPER_ADMIN', 'MARKETING_MANAGER')
  @Patch('admin/:id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;

    if (file) {
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('Only image files are allowed');
      }

      if (file.size > maxSizeGallery) {
        throw new BadRequestException(
          'Banner image size must not exceed 50MB',
        );
      }

      const folder = 'uploads/banner/';
      const uploaded = await this.s3Service.uploadFile(file, folder);
      imageUrl = uploaded.url;
    }

    return this.bannersService.update(id, updateBannerDto, imageUrl);
  }


  // Admin - Delete banner
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'SUPER_ADMIN', 'MARKETING_MANAGER')
  @Delete('admin/:id')
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }
}

