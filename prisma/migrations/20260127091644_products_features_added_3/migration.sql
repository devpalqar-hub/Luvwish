/*
  Warnings:

  - You are about to drop the column `descriptionTable` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `productsMeta` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `productsMeta` DROP FOREIGN KEY `productsMeta_productId_fkey`;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `descriptionTable`;

-- DropTable
DROP TABLE `productsMeta`;

-- CreateTable
CREATE TABLE `product_meta` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `type` ENUM('SPEC', 'INFO') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `product_meta_productId_type_idx`(`productId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_meta` ADD CONSTRAINT `product_meta_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
