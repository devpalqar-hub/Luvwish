/*
  Warnings:

  - You are about to drop the column `trackingID` on the `orders` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `orders_trackingID_key` ON `orders`;

-- AlterTable
ALTER TABLE `orders` DROP COLUMN `trackingID`;

-- CreateTable
CREATE TABLE `TrackingDetail` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `carrier` VARCHAR(191) NOT NULL,
    `trackingNumber` VARCHAR(191) NOT NULL,
    `trackingUrl` VARCHAR(191) NULL,
    `lastUpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TrackingDetail_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TrackingDetail` ADD CONSTRAINT `TrackingDetail_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
