# Subcategories and Product Variations Migration Guide

## Overview
This guide covers the implementation of subcategories and product variations features in your e-commerce application.

## What's New

### 1. Categories & Subcategories
- **Categories**: Top-level organization (e.g., "Clothing", "Electronics")
- **SubCategories**: Second-level organization (e.g., "Shirts", "Phones")
- Products now belong to subcategories instead of just a simple category name string

### 2. Product Variations
- Products can now have multiple variations (e.g., different sizes, colors)
- Each variation has its own:
  - SKU (Stock Keeping Unit)
  - Price
  - Stock count
  - Multiple attributes (e.g., Size: Large, Color: Red)

### 3. Enhanced Cart & Orders
- Cart items can reference specific product variations
- Orders preserve variation details for historical accuracy

## Database Migration Steps

### Step 1: Setup Environment
Ensure your `.env` file has the `DATABASE_URL` configured:
```env
DATABASE_URL="mysql://user:password@host:port/dbname"
```

### Step 2: Run Migration
```bash
npx prisma migrate dev --name add_categories_subcategories_variations
```

This will:
- Create `categories` table
- Create `sub_categories` table
- Create `product_variations` table
- Create `variation_options` table
- Update `products` table (remove `categoryName`, add `subCategoryId`)
- Update `cart_items` table (add `productVariationId`)
- Update `order_items` table (add `productVariationId` and `variationDetails`)

### Step 3: Data Migration (Manual)
Since existing products have a `categoryName` string, you'll need to:

1. Create default categories and subcategories
2. Migrate existing products to the new structure

Example SQL (adjust as needed):
```sql
-- Create a default category
INSERT INTO categories (id, name, slug, description, created_at, updated_at)
VALUES (UUID(), 'General', 'general', 'General category for existing products', NOW(), NOW());

-- Get the category ID
SET @category_id = (SELECT id FROM categories WHERE slug = 'general');

-- Create a default subcategory
INSERT INTO sub_categories (id, name, slug, description, category_id, created_at, updated_at)
VALUES (UUID(), 'Uncategorized', 'uncategorized', 'Default subcategory', @category_id, NOW(), NOW());

-- Get the subcategory ID
SET @subcategory_id = (SELECT id FROM sub_categories WHERE slug = 'uncategorized');

-- Update existing products
UPDATE products SET sub_category_id = @subcategory_id WHERE sub_category_id IS NULL;
```

### Step 4: Regenerate Prisma Client
```bash
npx prisma generate
```

## New API Endpoints

### Categories
- `GET /categories` - List all categories with subcategories
- `GET /categories/:id` - Get single category
- `POST /categories` - Create category (Admin)
- `PATCH /categories/:id` - Update category (Admin)
- `DELETE /categories/:id` - Delete category (Admin)

### SubCategories
- `GET /subcategories` - List all subcategories
- `GET /subcategories/:id` - Get single subcategory
- `GET /subcategories/category/:categoryId` - List by category
- `POST /subcategories` - Create subcategory (Admin)
- `PATCH /subcategories/:id` - Update subcategory (Admin)
- `DELETE /subcategories/:id` - Delete subcategory (Admin)

### Product Variations
- `GET /product-variations/product/:productId` - List variations for a product
- `GET /product-variations/:id` - Get single variation
- `POST /product-variations` - Create variation (Admin)
- `PATCH /product-variations/:id` - Update variation (Admin)
- `DELETE /product-variations/:id` - Delete variation (Admin)

## Updated Endpoints

### Products
Product responses now include:
```json
{
  "id": "...",
  "name": "Product Name",
  "subCategory": {
    "id": "...",
    "name": "Shirts",
    "category": {
      "id": "...",
      "name": "Clothing"
    }
  },
  "variations": [
    {
      "id": "...",
      "sku": "SHIRT-L-RED",
      "price": 29.99,
      "stockCount": 10,
      "options": [
        { "attributeName": "Size", "attributeValue": "Large" },
        { "attributeName": "Color", "attributeValue": "Red" }
      ]
    }
  ]
}
```

### Cart
Add to cart with variation:
```json
{
  "productId": "...",
  "productVariationId": "...",  // Optional
  "quantity": 2
}
```

Cart items now show selected variation details.

### Orders
Order items preserve variation information:
```json
{
  "productId": "...",
  "productVariationId": "...",  // Optional
  "variationDetails": {         // Optional, JSON snapshot
    "sku": "SHIRT-L-RED",
    "options": [
      { "attributeName": "Size", "attributeValue": "Large" }
    ]
  },
  "quantity": 2,
  "discountedPrice": 29.99,
  "actualPrice": 39.99
}
```

## Usage Examples

### Creating a Category with Subcategories
```bash
# Create category
POST /categories
{
  "name": "Clothing",
  "slug": "clothing",
  "description": "All clothing items"
}

# Create subcategory
POST /subcategories
{
  "name": "Shirts",
  "slug": "shirts",
  "categoryId": "<category-id>",
  "description": "All types of shirts"
}
```

### Creating a Product with Variations
```bash
# Create product
POST /products
{
  "name": "Cotton T-Shirt",
  "subCategoryId": "<subcategory-id>",
  "discountedPrice": 19.99,
  "actualPrice": 24.99,
  "stockCount": 0,  // Will be managed at variation level
  "description": "Comfortable cotton t-shirt"
}

# Create variations
POST /product-variations
{
  "productId": "<product-id>",
  "sku": "TSHIRT-S-BLUE",
  "price": 19.99,
  "stockCount": 50,
  "options": [
    { "attributeName": "Size", "attributeValue": "Small" },
    { "attributeName": "Color", "attributeValue": "Blue" }
  ]
}

POST /product-variations
{
  "productId": "<product-id>",
  "sku": "TSHIRT-M-BLUE",
  "price": 19.99,
  "stockCount": 75,
  "options": [
    { "attributeName": "Size", "attributeValue": "Medium" },
    { "attributeName": "Color", "attributeValue": "Blue" }
  ]
}
```

### Adding to Cart with Variation
```bash
POST /cart
{
  "productId": "<product-id>",
  "productVariationId": "<variation-id>",  // Select specific size/color
  "quantity": 2
}
```

## Testing

After migration, test the following:
1. Create categories and subcategories
2. Create products with subcategories
3. Create product variations
4. Add products with variations to cart
5. Place orders with varied products
6. Verify order history shows variation details

## Notes

- Stock management: You can manage stock at either the product level OR variation level
  - If using variations, set product `stockCount` to 0 and manage stock per variation
  - If not using variations, continue managing stock at product level
  
- Backward compatibility: 
  - Products without subcategories will have `subCategoryId` as `null`
  - Cart/order items without variations will have `productVariationId` as `null`

- Filtering products by category:
  - Query products by `subCategoryId`
  - Or fetch all products in a category via subcategories

## Rollback
If you need to rollback, you can revert the migration:
```bash
npx prisma migrate resolve --rolled-back <migration-name>
```

However, this will lose the new category and variation data.
