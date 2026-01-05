# Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the subcategories and product variations feature to production safely.

## Pre-Deployment Checklist

### 1. Backup Database
**CRITICAL: Always backup your production database before any migration**
```bash
mysqldump -u [username] -p ecommerce_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Clean Duplicate Cart Items (if any exist)
Run the cleanup script to remove any duplicate cart items that would violate the unique constraint:

```bash
mysql -u [username] -p ecommerce_db < prisma/clean-duplicate-cart-items.sql
```

This script will:
- Keep the most recent cart item for each customer+product+variation combination
- Remove older duplicates
- Verify no duplicates remain

## Deployment Steps

### Step 1: Resolve Current Migration State

Since the migration `20260105092923_add_categories_subcategories_variations` partially applied, we need to clean up:

```bash
# Mark the failed migration as rolled back
npx prisma migrate resolve --rolled-back "20260105092923_add_categories_subcategories_variations"
```

### Step 2: Check for Schema Drift

```bash
npx prisma migrate status
```

### Step 3: Create Migration Baseline

Since some tables (categories, sub_categories, product_variations, variation_options) already exist in the database, we need to create a migration that accounts for this.

Create a migration file manually at:
`prisma/migrations/[TIMESTAMP]_add_categories_and_variations_final/migration.sql`

### Step 4: Apply the Migration

```bash
npx prisma migrate deploy
```

## What This Migration Does

### New Tables
1. **categories** - Main product categories
2. **sub_categories** - Subcategories linked to categories
3. **product_variations** - Product variations (size, color, etc.)
4. **variation_options** - Individual attributes for each variation

### Modified Tables
1. **products** - Removed `categoryName`, added `subCategoryId` (optional FK)
2. **cart_items** - Added `productVariationId`, added unique constraint
3. **order_items** - Added `productVariationId` and `variationDetails` (JSON)

### Data Changes
- Existing products will have `subCategoryId` as NULL (backward compatible)
- No data loss for existing cart items or orders
- Duplicate cart items will be cleaned before adding unique constraint

## Rollback Plan

If issues occur:

### 1. Restore Database from Backup
```bash
mysql -u [username] -p ecommerce_db < backup_[timestamp].sql
```

### 2. Mark Migration as Rolled Back
```bash
npx prisma migrate resolve --rolled-back "[migration_name]"
```

### 3. Revert Code Changes
```bash
git revert [commit_hash]
```

## Post-Deployment Verification

### 1. Verify Tables Exist
```sql
SHOW TABLES;
-- Should show: categories, sub_categories, product_variations, variation_options
```

### 2. Verify Schema Changes
```sql
DESCRIBE cart_items;
DESCRIBE order_items;
DESCRIBE products;
```

### 3. Check Unique Constraint
```sql
SHOW INDEXES FROM cart_items WHERE Key_name = 'cart_items_customerProfileId_productId_productVariationId_key';
```

### 4. Test API Endpoints
- Create a category: `POST /categories`
- Create a subcategory: `POST /subcategories`
- Create a product with subcategory: `POST /products`
- Create product variation: `POST /product-variations`
- Add to cart with variation: `POST /cart`

## Important Notes

### Unique Constraint Behavior
The unique constraint on `cart_items` prevents:
- Same product + variation being added twice for the same customer
- Duplicate cart entries

Benefits:
- Cleaner cart data
- Prevents accidental duplicates
- Improves query performance

### Backward Compatibility
- Existing products without subcategories will continue to work
- Old cart items and orders are preserved
- API endpoints remain compatible

### Production Safety
- The migration is designed to NOT lose any existing data
- All changes are additive or optional (nullable fields)
- Foreign keys use appropriate cascade/set null behaviors

## Monitoring

After deployment, monitor:
1. Application logs for any errors related to cart or products
2. Database performance (new indexes added)
3. API response times for product and cart endpoints
4. Customer reports of cart issues

## Support

If issues arise:
1. Check application logs
2. Verify database schema matches expected state
3. Review `_prisma_migrations` table for migration status
4. Contact development team with error details

## Additional Resources

- API Documentation: See `api.json` for all endpoints
- Migration Details: See `SUBCATEGORIES_VARIATIONS_MIGRATION.md`
- Schema Reference: See `prisma/schema.prisma`
