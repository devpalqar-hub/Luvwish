/*
  Production-safe migration for categories, subcategories, and product variations
  This migration checks for existing tables and only creates/modifies what's needed
*/

-- Create categories table if not exists
CREATE TABLE IF NOT EXISTS `categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_name_key`(`name`),
    UNIQUE INDEX `categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create sub_categories table if not exists
CREATE TABLE IF NOT EXISTS `sub_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sub_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create product_variations table if not exists
CREATE TABLE IF NOT EXISTS `product_variations` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `stockCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_variations_sku_key`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create variation_options table if not exists
CREATE TABLE IF NOT EXISTS `variation_options` (
    `id` VARCHAR(191) NOT NULL,
    `productVariationId` VARCHAR(191) NOT NULL,
    `attributeName` VARCHAR(191) NOT NULL,
    `attributeValue` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Modify products table: remove categoryName if exists, add subCategoryId if not exists
SET @column_exists_categoryName = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND COLUMN_NAME = 'categoryName'
);

SET @sql_drop_categoryName = IF(
    @column_exists_categoryName > 0,
    'ALTER TABLE `products` DROP COLUMN `categoryName`',
    'SELECT "Column categoryName does not exist"'
);

PREPARE stmt FROM @sql_drop_categoryName;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists_subCategoryId = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND COLUMN_NAME = 'subCategoryId'
);

SET @sql_add_subCategoryId = IF(
    @column_exists_subCategoryId = 0,
    'ALTER TABLE `products` ADD COLUMN `subCategoryId` VARCHAR(191) NULL',
    'SELECT "Column subCategoryId already exists"'
);

PREPARE stmt FROM @sql_add_subCategoryId;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Modify cart_items table: add productVariationId if not exists
SET @column_exists_cart_variation = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'cart_items' 
    AND COLUMN_NAME = 'productVariationId'
);

SET @sql_add_cart_variation = IF(
    @column_exists_cart_variation = 0,
    'ALTER TABLE `cart_items` ADD COLUMN `productVariationId` VARCHAR(191) NULL',
    'SELECT "Column productVariationId already exists in cart_items"'
);

PREPARE stmt FROM @sql_add_cart_variation;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Modify order_items table: add productVariationId and variationDetails if not exists
SET @column_exists_order_variation = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_items' 
    AND COLUMN_NAME = 'productVariationId'
);

SET @sql_add_order_variation = IF(
    @column_exists_order_variation = 0,
    'ALTER TABLE `order_items` ADD COLUMN `productVariationId` VARCHAR(191) NULL',
    'SELECT "Column productVariationId already exists in order_items"'
);

PREPARE stmt FROM @sql_add_order_variation;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists_variation_details = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_items' 
    AND COLUMN_NAME = 'variationDetails'
);

SET @sql_add_variation_details = IF(
    @column_exists_variation_details = 0,
    'ALTER TABLE `order_items` ADD COLUMN `variationDetails` JSON NULL',
    'SELECT "Column variationDetails already exists"'
);

PREPARE stmt FROM @sql_add_variation_details;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign keys if they don't exist
SET @fk_exists_subcategory_category = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sub_categories'
    AND CONSTRAINT_NAME = 'sub_categories_categoryId_fkey'
);

SET @sql_add_fk_subcategory = IF(
    @fk_exists_subcategory_category = 0,
    'ALTER TABLE `sub_categories` ADD CONSTRAINT `sub_categories_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT "Foreign key sub_categories_categoryId_fkey already exists"'
);

PREPARE stmt FROM @sql_add_fk_subcategory;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists_product_subcategory = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND CONSTRAINT_NAME = 'products_subCategoryId_fkey'
);

SET @sql_add_fk_product_subcategory = IF(
    @fk_exists_product_subcategory = 0,
    'ALTER TABLE `products` ADD CONSTRAINT `products_subCategoryId_fkey` FOREIGN KEY (`subCategoryId`) REFERENCES `sub_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "Foreign key products_subCategoryId_fkey already exists"'
);

PREPARE stmt FROM @sql_add_fk_product_subcategory;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists_variation_product = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'product_variations'
    AND CONSTRAINT_NAME = 'product_variations_productId_fkey'
);

SET @sql_add_fk_variation_product = IF(
    @fk_exists_variation_product = 0,
    'ALTER TABLE `product_variations` ADD CONSTRAINT `product_variations_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT "Foreign key product_variations_productId_fkey already exists"'
);

PREPARE stmt FROM @sql_add_fk_variation_product;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists_option_variation = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'variation_options'
    AND CONSTRAINT_NAME = 'variation_options_productVariationId_fkey'
);

SET @sql_add_fk_option_variation = IF(
    @fk_exists_option_variation = 0,
    'ALTER TABLE `variation_options` ADD CONSTRAINT `variation_options_productVariationId_fkey` FOREIGN KEY (`productVariationId`) REFERENCES `product_variations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT "Foreign key variation_options_productVariationId_fkey already exists"'
);

PREPARE stmt FROM @sql_add_fk_option_variation;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists_cart_variation = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cart_items'
    AND CONSTRAINT_NAME = 'cart_items_productVariationId_fkey'
);

SET @sql_add_fk_cart_variation = IF(
    @fk_exists_cart_variation = 0,
    'ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_productVariationId_fkey` FOREIGN KEY (`productVariationId`) REFERENCES `product_variations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT "Foreign key cart_items_productVariationId_fkey already exists"'
);

PREPARE stmt FROM @sql_add_fk_cart_variation;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists_order_variation = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'order_items'
    AND CONSTRAINT_NAME = 'order_items_productVariationId_fkey'
);

SET @sql_add_fk_order_variation = IF(
    @fk_exists_order_variation = 0,
    'ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productVariationId_fkey` FOREIGN KEY (`productVariationId`) REFERENCES `product_variations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "Foreign key order_items_productVariationId_fkey already exists"'
);

PREPARE stmt FROM @sql_add_fk_order_variation;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop foreign key from cart_items to customerProfile if it exists
SET @fk_exists_cart_customer = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cart_items'
    AND CONSTRAINT_NAME = 'cart_items_customerProfileId_fkey'
);

SET @sql_drop_fk_cart_customer = IF(
    @fk_exists_cart_customer > 0,
    'ALTER TABLE `cart_items` DROP FOREIGN KEY `cart_items_customerProfileId_fkey`',
    'SELECT "Foreign key cart_items_customerProfileId_fkey does not exist"'
);

PREPARE stmt FROM @sql_drop_fk_cart_customer;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop old unique index on cart_items if exists
SET @index_exists_old = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cart_items'
    AND INDEX_NAME = 'cart_items_customerProfileId_productId_key'
);

SET @sql_drop_old_index = IF(
    @index_exists_old > 0,
    'DROP INDEX `cart_items_customerProfileId_productId_key` ON `cart_items`',
    'SELECT "Old index does not exist"'
);

PREPARE stmt FROM @sql_drop_old_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new unique constraint on cart_items if not exists
SET @index_exists_new = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cart_items'
    AND INDEX_NAME = 'cart_items_customerProfileId_productId_productVariationId_key'
);

SET @sql_add_unique = IF(
    @index_exists_new = 0,
    'CREATE UNIQUE INDEX `cart_items_customerProfileId_productId_productVariationId_key` ON `cart_items`(`customerProfileId`, `productId`, `productVariationId`)',
    'SELECT "New unique constraint already exists"'
);

PREPARE stmt FROM @sql_add_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Re-add foreign key from cart_items to customerProfile
SET @fk_exists_cart_customer_new = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cart_items'
    AND CONSTRAINT_NAME = 'cart_items_customerProfileId_fkey'
);

SET @sql_add_fk_cart_customer = IF(
    @fk_exists_cart_customer_new = 0,
    'ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_customerProfileId_fkey` FOREIGN KEY (`customerProfileId`) REFERENCES `CustomerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT "Foreign key cart_items_customerProfileId_fkey already exists"'
);

PREPARE stmt FROM @sql_add_fk_cart_customer;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
