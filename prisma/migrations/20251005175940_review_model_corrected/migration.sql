/*
  Warnings:

  - You are about to drop the `reviews` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ReviewImage` DROP FOREIGN KEY `ReviewImage_reviewId_fkey`;

-- DropForeignKey
ALTER TABLE `reviews` DROP FOREIGN KEY `reviews_customerProfileId_fkey`;

-- DropForeignKey
ALTER TABLE `reviews` DROP FOREIGN KEY `reviews_productId_fkey`;

-- DropIndex
DROP INDEX `ReviewImage_reviewId_fkey` ON `ReviewImage`;

-- DropTable
DROP TABLE `reviews`;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `productId` VARCHAR(191) NOT NULL,
    `customerProfileId` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Review_orderItemId_key`(`orderItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_customerProfileId_fkey` FOREIGN KEY (`customerProfileId`) REFERENCES `CustomerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `order_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewImage` ADD CONSTRAINT `ReviewImage_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `Review`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
