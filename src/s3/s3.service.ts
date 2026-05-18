import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import {
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { UploadResponseDto } from './dto/upload-response.dto';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private publicEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    const endPoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = Number.parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10);
    const useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'palqaradmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'StrongPassword123!');

    const internalEndpoint = `${useSSL ? 'https' : 'http'}://${endPoint}${port ? `:${port}` : ''}`;

    this.publicEndpoint = this.configService.get<string>('MINIO_PUBLIC_ENDPOINT', 'https://storage.palqar.cloud');
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'raheeb');

    this.s3Client = new S3Client({
      region: this.configService.get<string>('MINIO_REGION', 'us-east-1'),
      endpoint: internalEndpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
  }

  private buildPublicUrl(key: string): string {
    const base = (this.publicEndpoint || '').replace(/\/+$/, '');
    const normalizedKey = (key || '').replace(/^\/+/, '');
    return `${base}/${this.bucket}/${normalizedKey}`;
  }

  private normalizeFolder(folder: string): string {
    const raw = (folder || '').trim();
    if (!raw) return '';
    // Convert backslashes, strip leading/trailing slashes, and collapse repeats.
    return raw
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .replace(/\/{2,}/g, '/');
  }

  private sanitizeExtension(originalName: string): string {
    const ext = (originalName || '').split('.').pop() || '';
    const safe = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
    return safe || 'bin';
  }

  private normalizeKey(input: string): string {
    const raw = (input || '').trim();
    if (!raw) return raw;

    // If a full URL is passed, extract the object path.
    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        const path = url.pathname.replace(/^\/+/, '');
        // MinIO path-style URLs are usually: /<bucket>/<key>
        if (path.startsWith(`${this.bucket}/`)) {
          return path.slice(this.bucket.length + 1);
        }
        return path;
      } catch {
        // fall through
      }
    }

    // If someone passed `bucket/key`, strip bucket.
    if (raw.startsWith(`${this.bucket}/`)) {
      return raw.slice(this.bucket.length + 1);
    }

    return raw;
  }

  /**
   * Upload a single file to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Validate file type (images only)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files are allowed (JPEG, PNG, GIF, WebP)');
    }

    const safeFolder = this.normalizeFolder(folder);
    const fileExtension = this.sanitizeExtension(file.originalname);
    const objectName = `${uuidv4()}.${fileExtension}`;
    const fileName = safeFolder ? `${safeFolder}/${objectName}` : objectName;

    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
          // Public access should be handled by bucket policy in MinIO.
          ACL: 'public-read',
        },
      });

      await upload.done();

      const fileUrl = this.buildPublicUrl(fileName);

      return {
        url: fileUrl,
        key: fileName,
        bucket: this.bucket,
        filename: file.originalname,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message}`,
      );
    }
  }

  /**
   * Upload multiple files to S3
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<UploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const normalizedKey = this.normalizeKey(key);
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: normalizedKey,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete file: ${error.message}`,
      );
    }
  }

  /**
   * Delete multiple files from S3
   */
  async deleteMultipleFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteFile(key));
    await Promise.all(deletePromises);
  }

  /**
   * Get a file URL from S3
   */
  getFileUrl(key: string): string {
    return this.buildPublicUrl(this.normalizeKey(key));
  }
}
