# API Changelog - Version 2.3.0

## Release Date
January 6, 2026

## Summary
Added AWS S3 integration for image uploads with seamless integration into the product creation/update flow.

---

## 🆕 New Features

### S3 Upload Module
A complete module for managing file uploads to AWS S3.

**New Endpoints:**
- `POST /s3/upload` - Upload single image to S3
- `POST /s3/upload-multiple` - Upload multiple images to S3
- `DELETE /s3/delete` - Delete single file from S3
- `DELETE /s3/delete-multiple` - Delete multiple files from S3

**Features:**
- File validation (type, size)
- UUID-based automatic file naming
- Organized folder structure
- Public URL generation
- Role-based access control (ADMIN only)
- Max 10 files per request
- Max 5MB per file
- Supported formats: JPEG, JPG, PNG, GIF, WebP

---

## 🔄 Updated Endpoints

### Products Module

#### `POST /products` - Create Product
**Changes:**
- Now supports `multipart/form-data` for direct file upload
- Can accept image files along with product data in a single request
- Files are automatically uploaded to S3
- Still supports JSON with URL-based images (backward compatible)

**Old Format (Still Supported):**
```json
Content-Type: application/json
{
  "name": "Product Name",
  "images": [{"url": "https://...", "altText": "...", "isMain": true}]
}
```

**New Format:**
```
Content-Type: multipart/form-data
images: [file1.jpg, file2.jpg]
name: "Product Name"
categoryName: "Category"
discountedPrice: 99.99
actualPrice: 149.99
stockCount: 100
```

#### `PATCH /products/:id` - Update Product
**Changes:**
- Now supports `multipart/form-data` for direct file upload
- Can accept image files along with updated product data
- Files are automatically uploaded to S3
- Still supports JSON with URL-based images (backward compatible)
- ⚠️ **Note:** Updating images replaces ALL existing images

**New Format:**
```
Content-Type: multipart/form-data
images: [new-file1.jpg, new-file2.jpg]
name: "Updated Name"
discountedPrice: 89.99
```

#### `POST /products/upload-images` - Upload Product Images
**New Endpoint:**
- Standalone endpoint for uploading product images
- Returns S3 URLs that can be used in product creation
- Useful for two-step upload process

---

## 📋 API Collection Updates

The `api.json` Postman collection has been updated with:

1. **New S3 Upload Section**
   - Upload Single Image
   - Upload Multiple Images
   - Delete Single File
   - Delete Multiple Files

2. **Updated Product Endpoints**
   - Create Product (with File Upload)
   - Create Product (with URLs) - backward compatible
   - Upload Product Images - new standalone endpoint
   - Update Product (with File Upload)
   - Update Product (with URLs) - backward compatible

3. **Version Bump**
   - Updated from v2.2.0 to v2.3.0
   - Updated description to include AWS S3 integration

---

## 🔧 Implementation Details

### File Upload Behavior
1. **Automatic S3 Upload**: Files are uploaded automatically during product create/update
2. **Smart Defaults**:
   - First uploaded file is set as main image (`isMain: true`)
   - Alt text auto-generated as "Product image {index}"
   - Sort order based on file order (0, 1, 2, ...)
3. **S3 Storage**: Files stored in `products/` folder with UUID filenames

### Image Priority
When both files and URLs are provided:
1. Uploaded files processed first
2. URL-based images added after
3. All images maintain their respective sort orders

---

## 🔐 Authentication & Authorization
- All S3 upload/delete endpoints require JWT authentication
- ADMIN role required for all upload/delete operations
- Same authentication requirements for product create/update

---

## ⚙️ Configuration Requirements

### Environment Variables
```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_bucket_name
```

### AWS Setup
1. Create S3 bucket
2. Configure bucket for public read access
3. Create IAM user with S3 permissions
4. Add credentials to `.env` file

---

## 📦 New Dependencies
- `@aws-sdk/client-s3` - AWS SDK for S3 operations
- `@aws-sdk/lib-storage` - Multipart upload support
- `multer-s3` - Integration with multer

---

## 🔄 Migration Guide

### No Breaking Changes
All existing code will continue to work without modifications. The API is fully backward compatible.

### To Use New Features
Simply change from JSON to multipart/form-data:

**Before:**
```javascript
fetch('/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Product', images: [...] })
});
```

**After:**
```javascript
const formData = new FormData();
formData.append('images', file);
formData.append('name', 'Product');

fetch('/products', {
  method: 'POST',
  body: formData
});
```

---

## 📚 Documentation

New documentation files:
- `AWS_S3_SETUP_GUIDE.md` - Quick start guide
- `PRODUCT_API_WITH_S3_GUIDE.md` - Complete usage guide with examples
- `src/s3/README.md` - S3 module documentation

---

## ✅ Testing

### Updated Postman Collection
Import the updated `api.json` file to get all new endpoints with pre-configured examples.

### Test Flow
1. Get ADMIN JWT token from `/auth/login`
2. Test S3 upload: `POST /s3/upload-multiple`
3. Test product creation with files: `POST /products` (multipart/form-data)
4. Test product update with files: `PATCH /products/:id` (multipart/form-data)

---

## 🐛 Bug Fixes
None - This is a feature release

---

## 🔮 Future Enhancements
- Image optimization/resizing
- Signed URLs for private files
- CloudFront CDN integration
- Image thumbnail generation
- Progress tracking for large uploads

---

## 📞 Support

For questions or issues:
1. Check the documentation in the project root
2. Review the S3 module README at `src/s3/README.md`
3. See examples in `PRODUCT_API_WITH_S3_GUIDE.md`

---

**Previous Version:** 2.2.0  
**Current Version:** 2.3.0  
**Type:** Feature Release  
**Backward Compatible:** Yes ✅
