/*
  Warnings:

  - You are about to drop the column `price` on the `product_variations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `product_variations` DROP COLUMN `price`,
    ADD COLUMN `actualPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `discountedPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
