-- Add optional images list to product variations.
-- MySQL doesn't support scalar list columns, so we store it as JSON (string[]).

ALTER TABLE `product_variations`
ADD COLUMN `images` JSON NULL;
