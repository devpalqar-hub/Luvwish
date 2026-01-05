-- Script to clean duplicate cart items before adding unique constraint
-- This script keeps the most recent cart item for each unique combination
-- Run this BEFORE applying the migration

-- Step 1: Identify and keep only the most recent cart item for each customer+product+variation combination
DELETE c1 FROM cart_items c1
INNER JOIN cart_items c2 
WHERE 
  c1.customerProfileId = c2.customerProfileId
  AND c1.productId = c2.productId
  AND (c1.productVariationId = c2.productVariationId OR (c1.productVariationId IS NULL AND c2.productVariationId IS NULL))
  AND c1.createdAt < c2.createdAt;

-- Step 2: If there are still duplicates with same timestamp, keep the one with higher quantity
DELETE c1 FROM cart_items c1
INNER JOIN cart_items c2 
WHERE 
  c1.customerProfileId = c2.customerProfileId
  AND c1.productId = c2.productId
  AND (c1.productVariationId = c2.productVariationId OR (c1.productVariationId IS NULL AND c2.productVariationId IS NULL))
  AND c1.createdAt = c2.createdAt
  AND c1.quantity < c2.quantity;

-- Step 3: Final cleanup - if still duplicates exist, keep only one by ID (lowest ID)
DELETE c1 FROM cart_items c1
INNER JOIN cart_items c2 
WHERE 
  c1.customerProfileId = c2.customerProfileId
  AND c1.productId = c2.productId
  AND (c1.productVariationId = c2.productVariationId OR (c1.productVariationId IS NULL AND c2.productVariationId IS NULL))
  AND c1.id > c2.id;

-- Verify no duplicates remain
SELECT 
  customerProfileId, 
  productId, 
  productVariationId, 
  COUNT(*) as count
FROM cart_items
GROUP BY customerProfileId, productId, productVariationId
HAVING COUNT(*) > 1;
-- This should return empty result if all duplicates are cleaned
