-- AlterTable
ALTER TABLE `product_variations` ADD COLUMN `attributes` JSON NULL,
    ADD COLUMN `variationType` ENUM('size', 'color', 'both') NOT NULL DEFAULT 'size';
