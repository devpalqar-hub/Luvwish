-- AlterTable
ALTER TABLE `orders` ADD COLUMN `coupounId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_coupounId_fkey` FOREIGN KEY (`coupounId`) REFERENCES `Coupon`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
