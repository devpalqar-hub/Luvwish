# Product API with S3 Image Upload - Complete Guide

## Overview
The product API has been updated to support direct file uploads alongside traditional URL-based image handling. You can now create and update products with image files in a single request using multipart/form-data.

## ✨ What Changed

### Before (URL-based only)
```json
POST /products
Content-Type: application/json

{
  "name": "Product Name",
  "images": [{"url": "https://..."}]
}
```

### After (File upload + URL support)
```bash
POST /products
Content-Type: multipart/form-data

# Can include both files AND product data in one request
images: [file1.jpg, file2.jpg]
name: "Product Name"
categoryName: "Electronics"
discountedPrice: 99.99
# ... other fields
```

## 🔥 Key Features

1. **Seamless Integration** - Upload files and create products in one API call
2. **Backward Compatible** - Still supports URL-based image arrays
3. **Flexible** - Can use files, URLs, or both together
4. **Automatic S3 Upload** - Files are automatically uploaded to S3
5. **Smart Defaults** - First uploaded image is set as main image

## API Usage Examples

### Option 1: Create Product with File Upload (Recommended)

Upload image files directly with product data:

```bash
POST /products
Content-Type: multipart/form-data
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

Form Data:
- images: [file1.jpg, file2.jpg, file3.jpg]
- name: "Wireless Headphones"
- categoryName: "Electronics"
- discountedPrice: 99.99
- actualPrice: 149.99
- stockCount: 100
- description: "High-quality wireless headphones"
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "name=Wireless Headphones" \
  -F "categoryName=Electronics" \
  -F "discountedPrice=99.99" \
  -F "actualPrice=149.99" \
  -F "stockCount=100" \
  -F "description=High-quality wireless headphones"
```

**Response:**
```json
{
  "id": "product-uuid",
  "name": "Wireless Headphones",
  "categoryName": "Electronics",
  "discountedPrice": 99.99,
  "actualPrice": 149.99,
  "stockCount": 100,
  "description": "High-quality wireless headphones",
  "images": [
    {
      "id": "image-uuid-1",
      "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid1.jpg",
      "altText": "Product image 1",
      "isMain": true,
      "sortOrder": 0
    },
    {
      "id": "image-uuid-2",
      "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid2.jpg",
      "altText": "Product image 2",
      "isMain": false,
      "sortOrder": 1
    }
  ],
  "subCategory": { ... },
  "variations": []
}
```

### Option 2: Create Product with Image URLs (Backward Compatible)

Traditional JSON-based approach still works:

```bash
POST /products
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

{
  "name": "Wireless Headphones",
  "categoryName": "Electronics",
  "discountedPrice": 99.99,
  "actualPrice": 149.99,
  "stockCount": 100,
  "description": "High-quality wireless headphones",
  "images": [
    {
      "url": "https://existing-cdn.com/image1.jpg",
      "altText": "Main product image",
      "isMain": true,
      "sortOrder": 0
    },
    {
      "url": "https://existing-cdn.com/image2.jpg",
      "altText": "Secondary image",
      "isMain": false,
      "sortOrder": 1
    }
  ]
}
```

### Option 3: Mixed Approach (Files + URLs)

Combine uploaded files with existing URLs:

```bash
POST /products
Content-Type: multipart/form-data
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

Form Data:
- images: [newfile.jpg]  # New uploaded file
- name: "Wireless Headphones"
- categoryName: "Electronics"
- discountedPrice: 99.99
- actualPrice: 149.99
- stockCount: 100
- images: [{"url": "https://cdn.com/existing.jpg", "altText": "Existing", "isMain": false, "sortOrder": 1}]
```

**Note:** Uploaded files are added first, then URL-based images are appended.

## Update Product API

### Update with File Upload

```bash
PATCH /products/{productId}
Content-Type: multipart/form-data
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

Form Data:
- images: [new-image1.jpg, new-image2.jpg]
- name: "Updated Product Name"
- discountedPrice: 89.99
# ... other fields to update
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/products/product-uuid \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "images=@/path/to/new-image.jpg" \
  -F "name=Updated Product Name" \
  -F "discountedPrice=89.99"
```

⚠️ **Important:** Updating images will **replace all existing images**. Make sure to include all images you want to keep.

### Update with URLs (Backward Compatible)

```bash
PATCH /products/{productId}
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

{
  "name": "Updated Product Name",
  "discountedPrice": 89.99,
  "images": [
    {
      "url": "https://cdn.com/updated-image.jpg",
      "altText": "Updated image",
      "isMain": true,
      "sortOrder": 0
    }
  ]
}
```

## Standalone Image Upload

If you prefer to upload images separately first:

```bash
POST /products/upload-images
Content-Type: multipart/form-data
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

Form Data:
- images: [file1.jpg, file2.jpg]
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

Then use the returned URLs in the product creation:

```bash
POST /products
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN

{
  "name": "Product Name",
  "categoryName": "Electronics",
  "discountedPrice": 99.99,
  "actualPrice": 149.99,
  "stockCount": 100,
  "images": [
    {
      "url": "https://your-bucket.s3.us-east-1.amazonaws.com/products/uuid1.jpg",
      "altText": "Main image",
      "isMain": true,
      "sortOrder": 0
    }
  ]
}
```

## Implementation Details

### File Upload Behavior

1. **Automatic Upload**: Files are uploaded to S3 automatically when creating/updating products
2. **Default Values**: 
   - First uploaded file becomes the main image (`isMain: true`)
   - Alt text is auto-generated as "Product image {index}"
   - Sort order is based on file order (0, 1, 2, ...)
3. **Validation**:
   - Maximum 10 images per request
   - File size limit: 5MB per file
   - Allowed types: JPEG, JPG, PNG, GIF, WebP
4. **S3 Location**: Files are stored in `products/` folder with UUID filenames

### Image Priority

When both files and URLs are provided:
1. Uploaded files are processed first
2. URL-based images are added after
3. All images maintain their respective sort orders

## Testing with Postman

### Setup
1. Get your ADMIN JWT token from login endpoint
2. Create a new request in Postman
3. Set method to `POST` or `PATCH`
4. Set URL to `http://localhost:3000/products`

### Configure Request
1. **Authorization Tab**: 
   - Type: Bearer Token
   - Token: Your JWT token

2. **Body Tab**:
   - Select "form-data"
   - Add fields:
     - Key: `images`, Type: File, Value: Select your image files (can select multiple)
     - Key: `name`, Type: Text, Value: "Product Name"
     - Key: `categoryName`, Type: Text, Value: "Electronics"
     - Key: `discountedPrice`, Type: Text, Value: "99.99"
     - Key: `actualPrice`, Type: Text, Value: "149.99"
     - Key: `stockCount`, Type: Text, Value: "100"
     - (Add other fields as needed)

3. **Send Request**

## Frontend Integration Examples

### JavaScript/Fetch API

```javascript
const createProduct = async (productData, imageFiles) => {
  const formData = new FormData();
  
  // Add image files
  imageFiles.forEach(file => {
    formData.append('images', file);
  });
  
  // Add product data
  formData.append('name', productData.name);
  formData.append('categoryName', productData.categoryName);
  formData.append('discountedPrice', productData.discountedPrice);
  formData.append('actualPrice', productData.actualPrice);
  formData.append('stockCount', productData.stockCount);
  formData.append('description', productData.description);
  
  const response = await fetch('http://localhost:3000/products', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};

// Usage
const files = document.getElementById('imageInput').files;
const product = {
  name: 'Wireless Headphones',
  categoryName: 'Electronics',
  discountedPrice: 99.99,
  actualPrice: 149.99,
  stockCount: 100,
  description: 'High-quality wireless headphones'
};

createProduct(product, Array.from(files));
```

### React Example

```jsx
import { useState } from 'react';

function CreateProductForm() {
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    categoryName: '',
    discountedPrice: '',
    actualPrice: '',
    stockCount: '',
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = new FormData();
    
    // Add files
    files.forEach(file => data.append('images', file));
    
    // Add form fields
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });
    
    const response = await fetch('http://localhost:3000/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: data
    });
    
    const result = await response.json();
    console.log('Product created:', result);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(Array.from(e.target.files))}
      />
      <input
        type="text"
        placeholder="Product Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
      />
      {/* Add other input fields */}
      <button type="submit">Create Product</button>
    </form>
  );
}
```

### Axios Example

```javascript
import axios from 'axios';

const createProduct = async (productData, imageFiles) => {
  const formData = new FormData();
  
  imageFiles.forEach(file => {
    formData.append('images', file);
  });
  
  Object.keys(productData).forEach(key => {
    formData.append(key, productData[key]);
  });
  
  const response = await axios.post(
    'http://localhost:3000/products',
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  
  return response.data;
};
```

## Migration Guide

If you have existing code using the old API:

### No Changes Needed
Your existing JSON-based requests will continue to work without modifications.

### To Use New File Upload Feature
Simply change from `application/json` to `multipart/form-data` and attach files:

**Before:**
```javascript
fetch('/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Product', images: [{ url: '...' }] })
});
```

**After:**
```javascript
const formData = new FormData();
formData.append('images', fileInput.files[0]);
formData.append('name', 'Product');

fetch('/products', {
  method: 'POST',
  body: formData  // No Content-Type header needed
});
```

## Error Handling

### Common Errors

1. **"No files provided"** - You must include at least one image file or image URL
2. **"File size exceeds limit"** - Reduce file size (max 5MB per file)
3. **"Only image files are allowed"** - Use supported formats: JPEG, PNG, GIF, WebP
4. **"Unauthorized"** - Check your JWT token and ensure you have ADMIN role

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "File size exceeds 5MB limit",
  "error": "Bad Request"
}
```

## Best Practices

1. **Optimize Images**: Compress images before upload to reduce file size
2. **Use Alt Text**: Provide meaningful alt text for accessibility
3. **Main Image**: Set one image as main (`isMain: true`)
4. **Sort Order**: Use sequential sort orders (0, 1, 2...)
5. **Error Handling**: Always handle upload errors gracefully
6. **Progress Tracking**: Show upload progress for large files

## Summary

✅ **Create/Update with File Upload**: Use `multipart/form-data` and include image files
✅ **Create/Update with URLs**: Use `application/json` with image URL array (backward compatible)
✅ **Mixed Mode**: Combine both approaches in the same request
✅ **Standalone Upload**: Use `/products/upload-images` endpoint for separate upload flow

All approaches are fully supported and work seamlessly with your existing flow!
