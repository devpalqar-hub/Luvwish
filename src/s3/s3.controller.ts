import {
  Controller,
  Post,
  Delete,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { S3Service } from './s3.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadResponseDto } from './dto/upload-response.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('S3')
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) { }

  /**
   * Upload a single image
   * POST /s3/upload
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload single file to S3' })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, folder: { type: 'string', example: 'products' } } } })
  @ApiOkResponse({ description: 'File uploaded successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN role' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.s3Service.uploadFile(file, folder || 'products');
  }

  /**
   * Upload multiple images
   * POST /s3/upload-multiple
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple files to S3' })
  @ApiBody({ schema: { type: 'object', properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } }, folder: { type: 'string', example: 'products' } } } })
  @ApiOkResponse({ description: 'Files uploaded successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN role' })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ): Promise<UploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    return this.s3Service.uploadMultipleFiles(files, folder || 'products');
  }

  /**
   * Delete a file from S3
   * DELETE /s3/delete
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete single file from S3' })
  @ApiBody({ schema: { type: 'object', properties: { key: { type: 'string', example: 'uploads/product/example.png' } }, required: ['key'] } })
  @ApiOkResponse({ description: 'File deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN role' })
  async deleteFile(@Body('key') key: string): Promise<{ message: string }> {
    if (!key) {
      throw new BadRequestException('File key is required');
    }
    await this.s3Service.deleteFile(key);
    return { message: 'File deleted successfully' };
  }

  /**
   * Delete multiple files from S3
   * DELETE /s3/delete-multiple
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('delete-multiple')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete multiple files from S3' })
  @ApiBody({ schema: { type: 'object', properties: { keys: { type: 'array', items: { type: 'string' }, example: ['uploads/product/a.png', 'uploads/product/b.png'] } }, required: ['keys'] } })
  @ApiOkResponse({ description: 'Files deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Requires ADMIN role' })
  async deleteMultipleFiles(
    @Body('keys') keys: string[],
  ): Promise<{ message: string }> {
    if (!keys || keys.length === 0) {
      throw new BadRequestException('File keys are required');
    }
    await this.s3Service.deleteMultipleFiles(keys);
    return { message: 'Files deleted successfully' };
  }
}
