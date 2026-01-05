# Quick Start Guide - Categories & Product Variations

## 🚀 Ready to Use!

Your e-commerce project now supports:
- **Hierarchical Categories** (Categories → SubCategories → Products)
- **Product Variations** (Size, Color, or any custom attributes)

## Database Status
✅ **All migrations applied**  
✅ **Unique constraint on cart_items active**  
✅ **Project builds successfully**

---

## Basic Usage Examples

### 1. Create Category & SubCategory Flow

```bash
# Step 1: Create a Category (e.g., "Clothing")
POST /categories
{
  "name": "Clothing",
  "slug": "clothing",
  "description": "All clothing items"
}

# Step 2: Create SubCategory (e.g., "Shirts")
POST /subcategories
{
  "name": "Shirts",
  "slug": "shirts",
  "description": "All types of shirts",
  "categoryId": "<category-id-from-step-1>"
}
```

### 2. Create Product with SubCategory

```bash
POST /products
{
  "name": "Cotton T-Shirt",
  "subCategoryId": "<subcategory-id>",
  "discountedPrice": 19.99,
  "actualPrice": 29.99,
  "description": "Comfortable cotton t-shirt",
  "stockCount": 100
}
```

### 3. Add Product Variations (Size/Color)

```bash
POST /product-variations
{
  "productId": "<product-id>",
  "sku": "TSHIRT-RED-M",
  "price": 19.99,
  "stockCount": 50,
  "isActive": true,
  "options": [
    {
      "attributeName": "Size",
      "attributeValue": "M"
    },
    {
      "attributeName": "Color",
      "attributeValue": "Red"
    }
  ]
}
```

### 4. Add to Cart with Variation

```bash
POST /cart
{
  "productId": "<product-id>",
  "productVariationId": "<variation-id>",
  "quantity": 2
}
```

### 5. Browse Products by SubCategory

```bash
# Get all shirts
GET /products?subCategoryId=<subcategory-id>

# Get product with variations
GET /products/<product-id>
# Returns:
{
  "id": "...",
  "name": "Cotton T-Shirt",
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
      "sku": "TSHIRT-RED-M",
      "price": 19.99,
      "stockCount": 50,
      "options": [
        { "attributeName": "Size", "attributeValue": "M" },
        { "attributeName": "Color", "attributeValue": "Red" }
      ]
    }
  ]
}
```

---

## API Endpoints Summary

### Categories
- `GET /categories` - List all
- `POST /categories` - Create (Admin)
- `GET /categories/:id` - Get one
- `PATCH /categories/:id` - Update (Admin)
- `DELETE /categories/:id` - Delete (Admin)

### SubCategories
- `GET /subcategories` - List all
- `GET /subcategories/category/:categoryId` - Filter by category
- `POST /subcategories` - Create (Admin)
- `GET /subcategories/:id` - Get one
- `PATCH /subcategories/:id` - Update (Admin)
- `DELETE /subcategories/:id` - Delete (Admin)

### Product Variations
- `GET /product-variations` - List all
- `GET /product-variations/product/:productId` - Filter by product
- `POST /product-variations` - Create (Admin)
- `GET /product-variations/:id` - Get one
- `PATCH /product-variations/:id` - Update (Admin)
- `DELETE /product-variations/:id` - Delete (Admin)

---

## Common Scenarios

### Scenario 1: E-Commerce with Clothing
```
Categories:
  - Clothing
    ├── Shirts
    ├── Pants
    └── Shoes

Product: "Blue Denim Shirt"
Variations:
  - Small (S) - $29.99 - 20 in stock
  - Medium (M) - $29.99 - 50 in stock
  - Large (L) - $29.99 - 30 in stock
```

### Scenario 2: Electronics Store
```
Categories:
  - Electronics
    ├── Phones
    ├── Laptops
    └── Accessories

Product: "Smartphone X"
Variations:
  - 64GB Black - $599 - 15 in stock
  - 128GB Black - $699 - 10 in stock
  - 128GB White - $699 - 8 in stock
  - 256GB Black - $799 - 5 in stock
```

### Scenario 3: Mixed Products
```
Categories:
  - Furniture
    ├── Chairs
    └── Tables

Product: "Office Chair"
Variations:
  - Black Leather - $199 - 12 in stock
  - Brown Leather - $199 - 8 in stock
  - Blue Fabric - $149 - 20 in stock
```

---

## Key Features

### ✅ Variation Pricing
When a variation is added to cart, the **variation price** is used instead of the base product price.

### ✅ Stock Management
Each variation has its own stock count. When customers add items to cart:
- System validates variation has sufficient stock
- Stock is tracked per variation, not just per product

### ✅ Order History
When an order is placed, variation details are captured as a JSON snapshot:
```json
{
  "variationId": "...",
  "sku": "TSHIRT-RED-M",
  "options": [
    { "attributeName": "Size", "attributeValue": "M" },
    { "attributeName": "Color", "attributeValue": "Red" }
  ],
  "price": 19.99
}
```

### ✅ Duplicate Prevention
The unique constraint ensures customers can't accidentally add the same product+variation combination multiple times. Instead, the quantity is updated.

---

## Testing with Postman

Import `api.json` into Postman to test all endpoints.

**Environment Variables to Set:**
- `baseUrl`: `http://localhost:3000`
- `accessToken`: Your JWT token after login

**Test Flow:**
1. Login as admin → Get token
2. Create category → Save ID
3. Create subcategory → Save ID
4. Create product with subCategoryId → Save ID
5. Create variations for product → Save variation IDs
6. Login as customer → Get token
7. Add product with variation to cart
8. View cart → Verify variation details
9. Create order → Verify variation stored

---

## Important Notes

### Backward Compatibility
- Old products without `subCategoryId` still work (field is optional)
- Existing cart items without variations remain valid
- No existing data was lost during migration

### Unique Constraint on Cart
The cart now enforces uniqueness on:
```
(customerProfileId, productId, productVariationId)
```

This means:
- ✅ Same product, different variations → Allowed (separate cart items)
- ✅ Same product, same variation → Prevented (updates quantity instead)
- ✅ Different products → Always allowed

### Admin Permissions
These endpoints require Admin role:
- Creating/updating/deleting categories
- Creating/updating/deleting subcategories
- Creating/updating/deleting product variations

---

## Troubleshooting

### "Duplicate entry" error when adding to cart
This means the customer already has this exact product+variation in their cart. The system should update the quantity instead of creating a new item.

### Product not showing variations
Make sure:
1. Variations were created for that product
2. Variations are set to `isActive: true`
3. You're fetching product details with `GET /products/:id` (not just listing)

### SubCategory not showing in product response
Verify:
1. Product has `subCategoryId` set
2. SubCategory exists in database
3. SubCategory is properly linked to a category

---

## Performance Tips

1. **Index Usage**: The unique constraint on cart_items also serves as an index for faster lookups
2. **Eager Loading**: Product queries automatically include subcategories and variations
3. **Stock Validation**: Variation stock is checked before adding to cart to prevent overselling

---

## Next Steps

1. **Seed Data**: Update `prisma/seed.ts` to create sample categories, subcategories, and variations
2. **Frontend Integration**: Use the API endpoints to build category navigation and variation selectors
3. **Reporting**: Query variations data for sales reports and inventory management
4. **Images**: Consider adding images to variations (e.g., show different colors)

---

## Support Files

- **Full API Collection**: `api.json`
- **Deployment Guide**: `PRODUCTION_DEPLOYMENT.md`
- **Complete Summary**: `DEPLOYMENT_SUMMARY.md`
- **Database Schema**: `prisma/schema.prisma`

---

**Happy coding! 🎉**
