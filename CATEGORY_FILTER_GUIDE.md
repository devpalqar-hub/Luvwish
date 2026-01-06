# Category Filter in Products - Testing Guide

## Overview
The `categoryId` filter in the products endpoint now correctly filters products by their parent category through the subcategory relationship.

---

## How It Works

### Database Relationships
```
Category (id) 
    ↓
SubCategory (categoryId) 
    ↓
Product (subCategoryId)
```

### Filter Logic
When you provide a `categoryId`, the system filters products where:
- Product belongs to a SubCategory
- That SubCategory belongs to the specified Category

---

## API Usage

### Endpoint
```
GET /products?categoryId=<category-uuid>
```

### Query Parameters
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `categoryId` | UUID | Category ID to filter by | No |
| `subCategoryId` | UUID | SubCategory ID to filter by | No |
| `search` | String | Search in product name/description | No |
| `minPrice` | Number | Minimum price filter | No |
| `maxPrice` | Number | Maximum price filter | No |
| `page` | Number | Page number (default: 1) | No |
| `limit` | Number | Items per page (default: 10) | No |

---

## Testing Examples

### 1. Filter by Category Only
```bash
GET /products?categoryId=<category-uuid>
```

**Expected Result:**
- Returns all products whose subcategory belongs to the specified category
- Includes pagination metadata
- Products without a subcategory are excluded

**Example Response:**
```json
{
  "data": [
    {
      "id": "product-uuid-1",
      "name": "Product 1",
      "subCategory": {
        "id": "subcat-uuid",
        "name": "T-Shirts",
        "categoryId": "<category-uuid>",
        "category": {
          "id": "<category-uuid>",
          "name": "Clothing"
        }
      }
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

### 2. Filter by Category + Price Range
```bash
GET /products?categoryId=<category-uuid>&minPrice=10&maxPrice=100
```

**Expected Result:**
- Returns products in the category
- With discountedPrice between 10 and 100

### 3. Filter by Category + Search
```bash
GET /products?categoryId=<category-uuid>&search=shirt
```

**Expected Result:**
- Returns products in the category
- Where name or description contains "shirt"

### 4. Filter by SubCategory (More Specific)
```bash
GET /products?subCategoryId=<subcategory-uuid>
```

**Expected Result:**
- Returns only products in that specific subcategory
- More specific than categoryId filter

### 5. Combine Multiple Filters
```bash
GET /products?categoryId=<category-uuid>&subCategoryId=<subcat-uuid>&minPrice=20&maxPrice=50&search=blue&page=1&limit=20
```

**Expected Result:**
- Products in the specified category AND subcategory
- Price between 20-50
- Name/description contains "blue"
- First 20 results

---

## Testing Steps

### Setup Test Data

1. **Create a Category**
```bash
POST /categories
{
  "name": "Clothing",
  "slug": "clothing",
  "description": "All clothing items"
}
```
Save the returned `id` as `<category-uuid>`

2. **Create a SubCategory**
```bash
POST /subcategories
{
  "name": "T-Shirts",
  "slug": "t-shirts",
  "categoryId": "<category-uuid>",
  "description": "All t-shirts"
}
```
Save the returned `id` as `<subcategory-uuid>`

3. **Create Products**
```bash
POST /products
{
  "name": "Blue T-Shirt",
  "subCategoryId": "<subcategory-uuid>",
  "discountedPrice": 19.99,
  "actualPrice": 29.99,
  "stockCount": 100,
  "description": "Comfortable blue cotton t-shirt"
}
```

4. **Test Category Filter**
```bash
GET /products?categoryId=<category-uuid>
```

Should return the "Blue T-Shirt" and any other products in that category.

---

## Common Issues & Solutions

### Issue 1: No Products Returned
**Possible Causes:**
- CategoryId doesn't exist
- No products have subcategories linked to that category
- Products exist but their subcategory has a different categoryId

**Solution:**
```sql
-- Check if products exist with subcategories in that category
SELECT p.*, sc.categoryId 
FROM products p
JOIN sub_categories sc ON p.subCategoryId = sc.id
WHERE sc.categoryId = '<your-category-uuid>';
```

### Issue 2: Products Without SubCategory Not Showing
**Expected Behavior:**
Products without a `subCategoryId` (NULL) won't appear in category filters. This is correct behavior.

**Solution:**
If you want all products including those without subcategories:
```bash
GET /products
# Don't use categoryId filter
```

### Issue 3: Filter Not Working
**Check:**
1. Is the categoryId a valid UUID?
2. Does the category exist?
3. Are there subcategories linked to this category?
4. Are there products linked to those subcategories?

---

## Code Implementation

### Filter Logic (products.service.ts)
```typescript
const where: any = {
  AND: [
    // ... other filters
    categoryId ? { 
      subCategory: { 
        is: {
          categoryId 
        }
      } 
    } : {},
  ].filter(condition => Object.keys(condition).length > 0),
};
```

### DTO Validation (search-filter.dto.ts)
```typescript
@IsOptional()
@IsUUID()
categoryId?: string;
```

---

## API Examples (Postman/Insomnia)

### Get All Products in "Electronics" Category

**Request:**
```
GET {{base_url}}/products?categoryId=123e4567-e89b-12d3-a456-426614174000&page=1&limit=20
```

**Headers:**
```
Authorization: Bearer {{jwt_token}} (optional)
```

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "prod-uuid-1",
      "name": "Smartphone",
      "discountedPrice": 299.99,
      "actualPrice": 399.99,
      "stockCount": 50,
      "subCategory": {
        "id": "subcat-uuid",
        "name": "Mobile Phones",
        "categoryId": "123e4567-e89b-12d3-a456-426614174000",
        "category": {
          "name": "Electronics"
        }
      },
      "images": [...],
      "variations": [...],
      "is_wishlisted": false
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

## Performance Considerations

### Indexing
Ensure these fields are indexed for optimal performance:
```sql
-- Already indexed by Prisma:
- products.subCategoryId (foreign key)
- sub_categories.categoryId (foreign key)
```

### Query Optimization
The filter uses a JOIN through the subcategory relation:
```sql
SELECT * FROM products
INNER JOIN sub_categories ON products.subCategoryId = sub_categories.id
WHERE sub_categories.categoryId = ?
```

This is efficient with proper foreign key indexes.

---

## Filter Combinations

| CategoryId | SubCategoryId | Result |
|------------|---------------|--------|
| ✅ Yes | ❌ No | All products in all subcategories of that category |
| ❌ No | ✅ Yes | All products in that specific subcategory |
| ✅ Yes | ✅ Yes | Products in that subcategory (categoryId is redundant) |
| ❌ No | ❌ No | All products (no category filter) |

**Note:** When both are provided, subcategoryId is more specific and takes precedence.

---

## Troubleshooting Commands

### Check if category exists:
```bash
GET /categories/<category-uuid>
```

### Check subcategories in a category:
```bash
GET /subcategories/category/<category-uuid>
```

### Get products in a subcategory (more specific):
```bash
GET /products?subCategoryId=<subcategory-uuid>
```

### Get all products (no filter):
```bash
GET /products
```

---

## Summary

✅ **Working:** CategoryId filter through subcategory relationship  
✅ **Handles:** Products without subcategories (excluded from results)  
✅ **Supports:** Combining with other filters (price, search, pagination)  
✅ **Optimized:** Uses Prisma's relation filtering with proper indexes  

The categoryId filter is now fully functional and ready for production use!
