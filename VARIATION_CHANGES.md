# Product Variation Simplification

## Overview
The product variation system has been simplified from a two-table structure to a single-table structure for easier management.

## What Changed

### Before (Complex Structure)
- **Two tables**: `product_variations` + `variation_options`
- Each variation had multiple option rows (e.g., Color: Red, Size: Large)
- Required joins to get complete variation info
- Complex DTO with nested options array

### After (Simple Structure)
- **Single table**: `product_variations`
- Each variation is a single row with all info
- Direct fields: `variationName`, `isAvailable`, `stockCount`, etc.
- Simple DTO with flat fields

## Database Schema Changes

### ProductVariation Table
```
- id (UUID)
- productId (UUID, FK to products)
- variationName (String) ← NEW
- sku (String, unique)
- price (Decimal)
- stockCount (Integer)
- isAvailable (Boolean) ← RENAMED from isActive
- createdAt (DateTime)
- updatedAt (DateTime)
```

### Removed Table
- `variation_options` table has been completely removed

## API Changes

### Create Variation (POST /product-variations)
```json
{
  "productId": "uuid",
  "variationName": "Red T-Shirt - Large",
  "sku": "RED-TSHIRT-L",
  "price": 29.99,
  "stockCount": 100,
  "isAvailable": true
}
```

### Update Variation (PATCH /product-variations/:id)
```json
{
  "variationName": "Red T-Shirt - Large (Updated)",
  "price": 24.99,
  "stockCount": 85,
  "isAvailable": true
}
```

## Migration Steps

1. **Backup your database** before running migrations

2. Start your database server

3. Run the migration:
   ```bash
   npx prisma migrate deploy
   ```
   
   Or for development:
   ```bash
   npx prisma migrate dev
   ```

4. Update any existing variation names (optional):
   ```sql
   UPDATE product_variations 
   SET variationName = CONCAT(
     -- Build variation name from your business logic
     'Custom Name'
   )
   WHERE variationName = 'Default Variation';
   ```

## Code Changes Made

### Files Modified:
1. `prisma/schema.prisma` - Updated ProductVariation model
2. `src/product-variations/dto/create-product-variation.dto.ts` - Simplified DTO
3. `src/product-variations/product-variations.service.ts` - Removed options handling

### Files Removed:
1. `src/product-variations/dto/variation-option.dto.ts` - No longer needed

## Benefits

✅ Simpler data model
✅ Faster queries (no joins needed)
✅ Easier to add variations one at a time
✅ More intuitive API
✅ Less code complexity

## Example Usage

### Adding a Single Variation
```typescript
// Add "Red - Small" variation
await fetch('/product-variations', {
  method: 'POST',
  body: JSON.stringify({
    productId: 'product-uuid',
    variationName: 'Red - Small',
    sku: 'PROD-RED-SM',
    price: 19.99,
    stockCount: 50,
    isAvailable: true
  })
});

// Add "Red - Medium" variation  
await fetch('/product-variations', {
  method: 'POST',
  body: JSON.stringify({
    productId: 'product-uuid',
    variationName: 'Red - Medium',
    sku: 'PROD-RED-MD',
    price: 19.99,
    stockCount: 75,
    isAvailable: true
  })
});
```

### Updating Stock
```typescript
await fetch('/product-variations/variation-uuid', {
  method: 'PATCH',
  body: JSON.stringify({
    stockCount: 25,
    isAvailable: true
  })
});
```

### Disabling a Variation
```typescript
await fetch('/product-variations/variation-uuid', {
  method: 'PATCH',
  body: JSON.stringify({
    isAvailable: false
  })
});
```
