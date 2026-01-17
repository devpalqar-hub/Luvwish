-- AlterTable
ALTER TABLE `wishlist` ADD COLUMN `productVariationId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `wishlist` ADD CONSTRAINT `wishlist_productVariationId_fkey` FOREIGN KEY (`productVariationId`) REFERENCES `product_variations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
