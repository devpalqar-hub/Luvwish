/*
  Warnings:

  - Made the column `customerProfileId` on table `orders` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `orders_customerProfileId_fkey`;

-- DropIndex
DROP INDEX `orders_customerProfileId_fkey` ON `orders`;

-- AlterTable
ALTER TABLE `orders` MODIFY `customerProfileId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_customerProfileId_fkey` FOREIGN KEY (`customerProfileId`) REFERENCES `CustomerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
