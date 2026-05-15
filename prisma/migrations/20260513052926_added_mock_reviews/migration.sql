-- DropForeignKey
ALTER TABLE `Review`
DROP FOREIGN KEY `Review_customerProfileId_fkey`;

-- DropForeignKey
ALTER TABLE `Review`
DROP FOREIGN KEY `Review_orderItemId_fkey`;

-- DropIndex
DROP INDEX `Review_customerProfileId_fkey` ON `Review`;

-- AlterTable
ALTER TABLE `Review`
ADD COLUMN `isMock` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `mockReviewerName` VARCHAR(191) NULL,
MODIFY `customerProfileId` VARCHAR(191) NULL,
MODIFY `orderItemId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Review`
ADD CONSTRAINT `Review_customerProfileId_fkey`
FOREIGN KEY (`customerProfileId`)
REFERENCES `CustomerProfile`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review`
ADD CONSTRAINT `Review_orderItemId_fkey`
FOREIGN KEY (`orderItemId`)
REFERENCES `order_items`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;