-- AddForeignKey
ALTER TABLE `wishlist` ADD CONSTRAINT `wishlist_customerProfileId_fkey` FOREIGN KEY (`customerProfileId`) REFERENCES `CustomerProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
