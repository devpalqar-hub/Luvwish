# API Changelog - Version 2.1.0

## Product Variation Simplification Update

**Date:** January 6, 2026  
**Version:** 2.0.0 → 2.1.0

### Overview
The Product Variations API has been simplified to use a single-table structure instead of the previous two-table approach. This makes it easier to add and manage product variations.

---

## Breaking Changes

### 1. Create Product Variation (POST `/product-variations`)

#### Before (v2.0.0):
```json
{
  "productId": "<product-id>",
  "sku": "TSHIRT-L-BLUE",
  "price": 19.99,
  "stockCount": 50,
  "isActive": true,
  "options": [
    {
      "attributeName": "Size",
      "attributeValue": "Large"
    },
    {
      "attributeName": "Color",
      "attributeValue": "Blue"
    }
  ]
}
```

#### After (v2.1.0):
```json
{
  "productId": "<product-id>",
  "variationName": "Blue T-Shirt - Large",
  "sku": "TSHIRT-L-BLUE",
  "price": 19.99,
  "stockCount": 50,
  "isAvailable": true
}
```

**Changes:**
- ❌ Removed `options` array
- ❌ Removed `isActive` field
- ✅ Added `variationName` field (required)
- ✅ Added `isAvailable` field (replaces `isActive`)

---

### 2. Update Product Variation (PATCH `/product-variations/:id`)

#### Before (v2.0.0):
```json
{
  "price": 18.99,
  "stockCount": 75
}
```

#### After (v2.1.0):
```json
{
  "variationName": "Blue T-Shirt - Large (Updated)",
  "price": 18.99,
  "stockCount": 75,
  "isAvailable": true
}
```

**Changes:**
- ✅ Can now update `variationName`
- ✅ Use `isAvailable` instead of `isActive`

---

### 3. Get Variation Response

#### Before (v2.0.0):
```json
{
  "id": "variation-uuid",
  "productId": "product-uuid",
  "sku": "TSHIRT-L-BLUE",
  "price": 19.99,
  "stockCount": 50,
  "isActive": true,
  "options": [
    {
      "id": "option-uuid",
      "attributeName": "Size",
      "attributeValue": "Large"
    },
    {
      "id": "option-uuid",
      "attributeName": "Color",
      "attributeValue": "Blue"
    }
  ]
}
```

#### After (v2.1.0):
```json
{
  "id": "variation-uuid",
  "productId": "product-uuid",
  "variationName": "Blue T-Shirt - Large",
  "sku": "TSHIRT-L-BLUE",
  "price": 19.99,
  "stockCount": 50,
  "isAvailable": true,
  "createdAt": "2024-01-05T10:00:00Z",
  "updatedAt": "2024-01-05T10:00:00Z"
}
```

**Changes:**
- ❌ No more nested `options` array
- ✅ Single `variationName` field
- ✅ `isAvailable` instead of `isActive`

---

### 4. Order Creation - Variation Details

#### Before (v2.0.0):
```json
{
  "variationDetails": {
    "sku": "TSHIRT-L-BLUE",
    "options": [
      {
        "attributeName": "Size",
        "attributeValue": "Large"
      }
    ]
  }
}
```

#### After (v2.1.0):
```json
{
  "variationDetails": {
    "variationName": "Blue T-Shirt - Large",
    "sku": "TSHIRT-L-BLUE"
  }
}
```

**Changes:**
- ❌ Removed `options` array from variation details
- ✅ Added `variationName` for clarity

---

## Migration Guide

### For Frontend/Client Applications:

1. **Update Create Variation Requests:**
   - Remove the `options` array
   - Add `variationName` field with a descriptive name
   - Change `isActive` to `isAvailable`

2. **Update Variation Display:**
   - Use `variationName` instead of concatenating options
   - Update availability checks to use `isAvailable`

3. **Update Order Display:**
   - Show `variationName` from `variationDetails`
   - Remove logic that renders options array

### Example Migration:

```javascript
// OLD CODE (v2.0.0)
const createVariation = {
  productId: productId,
  sku: `${product.name}-${size}-${color}`,
  price: price,
  stockCount: stock,
  isActive: true,
  options: [
    { attributeName: "Size", attributeValue: size },
    { attributeName: "Color", attributeValue: color }
  ]
};

// NEW CODE (v2.1.0)
const createVariation = {
  productId: productId,
  variationName: `${color} ${product.name} - ${size}`,
  sku: `${product.name}-${size}-${color}`,
  price: price,
  stockCount: stock,
  isAvailable: true
};
```

---

## Non-Breaking Changes

The following endpoints remain unchanged:
- ✅ GET `/product-variations/product/:productId`
- ✅ GET `/product-variations/:id`
- ✅ DELETE `/product-variations/:id`

---

## Benefits

1. **Simpler API** - Fewer nested structures
2. **Faster Queries** - No joins required
3. **Easier to Understand** - Clear, flat structure
4. **Better Performance** - Reduced database complexity
5. **Flexible Naming** - Name variations however you want

---

## Testing

Import the updated `api.json` (v2.1.0) into Postman or your API client to test the new endpoints.

**Test Checklist:**
- [ ] Create a new variation with `variationName`
- [ ] Update variation `isAvailable` status
- [ ] Get variations by product
- [ ] Create an order with simplified variation details
- [ ] Verify old `options` field is no longer returned

---

## Support

For questions or issues with the migration, please refer to:
- `VARIATION_CHANGES.md` - Detailed technical documentation
- Database migration: `prisma/migrations/20260106135244_simplify_product_variations/`
