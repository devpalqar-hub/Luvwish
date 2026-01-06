# AWS S3 Image Upload Implementation Guide

## Overview
This project now includes a complete AWS S3 integration module for handling image uploads. The module is located in `src/s3/` and is fully integrated with your existing products API.

## Quick Start

### 1. Configure Environment Variables
Add these to your `.env` file:
```env
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name
```

### 2. AWS Setup Checklist
- [ ] Create an S3 bucket in AWS Console
- [ ] Configure bucket to allow public read access
- [ ] Create an IAM user with S3 permissions
- [ ] Generate access keys for the IAM user
- [ ] Add credentials to `.env` file

### 3. Test the Implementation
```bash
# Start the development server
npm run start:dev

# Test upload endpoint (requires ADMIN JWT token)
POST http://localhost:3000/products/upload-images
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

# Body: Form data with "images" field containing image files
```

## Available Endpoints

### S3 Module Endpoints
- `POST /s3/upload` - Upload single image
- `POST /s3/upload-multiple` - Upload multiple images (max 10)
- `DELETE /s3/delete` - Delete single image
- `DELETE /s3/delete-multiple` - Delete multiple images

### Products Module Integration
- `POST /products` - Create product with image files (multipart/form-data)
- `PATCH /products/:id` - Update product with image files (multipart/form-data)
- `POST /products/upload-images` - Upload product images separately

## File Structure
```
src/
└── s3/
    ├── dto/
    │   └── upload-response.dto.ts
    ├── interfaces/
    │   └── s3-config.interface.ts
    ├── s3.controller.ts
    ├── s3.service.ts
    ├── s3.module.ts
    └── README.md (detailed documentation)
```

## Features Implemented
✅ Single and multiple file uploads
✅ File validation (type: images only, size: max 5MB)
✅ UUID-based file naming
✅ Organized folder structure (e.g., products/)
✅ Public URL generation
✅ File deletion from S3
✅ Role-based access control (ADMIN only)
✅ Integration with products module

## Usage Example

### Step 1: Upload Images
```bash
POST /products/upload-images
Headers:
  Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
  Content-Type: multipart/form-data
Body:
  images: [file1.jpg, file2.jpg]
```

**Response:**
```json
[
  {
    "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid1.jpg",
    "key": "products/uuid1.jpg",
    "bucket": "your-bucket",
    "filename": "file1.jpg"
  },
  {
    "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid2.jpg",
    "key": "products/uuid2.jpg",
    "bucket": "your-bucket",
    "filename": "file2.jpg"
  }
]
```

### Step 2: Create Product with Uploaded Images
```bash
POST /products
Headers:
  Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
  Content-Type: application/json
Body:
{
  "name": "Beautiful Product",
  "categoryName": "Electronics",
  "discountedPrice": 99.99,
  "actualPrice": 149.99,
  "stockCount": 100,
  "description": "Product description",
  "images": [
    {
      "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid1.jpg",
      "altText": "Main product image",
      "isMain": true,
      "sortOrder": 0
    },
    {
      "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid2.jpg",
      "altText": "Secondary image",
      "isMain": false,
      "sortOrder": 1
    }
  ]
}
```

## Using S3Service in Other Modules

If you want to use the S3 service in other parts of your application:

### 1. Import the S3Module
```typescript
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [S3Module],
  // ...
})
export class YourModule {}
```

### 2. Inject the S3Service
```typescript
import { S3Service } from '../s3/s3.service';

@Injectable()
export class YourService {
  constructor(private readonly s3Service: S3Service) {}

  async uploadMyFile(file: Express.Multer.File) {
    return this.s3Service.uploadFile(file, 'my-folder');
  }

  async deleteMyFile(key: string) {
    return this.s3Service.deleteFile(key);
  }
}
```

## Security Notes

1. **Never commit AWS credentials** - They are in `.env` which is already in `.gitignore`
2. **ADMIN role required** - All upload/delete endpoints require ADMIN authentication
3. **File validation** - Only image files up to 5MB are allowed
4. **Bucket permissions** - Configure S3 bucket policies carefully

## Troubleshooting

### Build successful but upload fails?
- Check AWS credentials in `.env`
- Verify S3 bucket exists and is accessible
- Check IAM user has proper permissions

### "Access Denied" error?
- Verify IAM user policy includes `s3:PutObject`, `s3:DeleteObject`, `s3:GetObject`
- Check bucket policy allows the required actions

### CORS errors?
- Configure CORS in S3 bucket settings
- Add allowed origins, methods, and headers

## Next Steps

1. Set up your AWS account and S3 bucket
2. Configure environment variables
3. Test the upload endpoints with Postman or similar tool
4. Integrate image uploads into your product creation workflow

## Documentation

For detailed documentation, see:
- **S3 Module README:** `src/s3/README.md`
- **API Documentation:** Check your existing `API_ENDPOINTS_V2.2.0.md`

## Dependencies Installed

The following packages were installed:
- `@aws-sdk/client-s3` - AWS SDK for S3 operations
- `@aws-sdk/lib-storage` - Multipart upload support
- `multer-s3` - Integration with multer
