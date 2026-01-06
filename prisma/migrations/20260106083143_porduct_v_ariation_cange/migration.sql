/*
  Warnings:

  - You are about to drop the column `isActive` on the `product_variations` table. All the data in the column will be lost.
  - You are about to drop the `variation_options` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `variationName` to the `product_variations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `cart_items` DROP FOREIGN KEY `cart_items_customerProfileId_fkey`;

-- DropForeignKey
ALTER TABLE `variation_options` DROP FOREIGN KEY `variation_options_productVariationId_fkey`;

-- AlterTable
ALTER TABLE `product_variations` DROP COLUMN `isActive`,
    ADD COLUMN `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `variationName` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `variation_options`;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_customerProfileId_fkey` FOREIGN KEY (`customerProfileId`) REFERENCES `CustomerProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
