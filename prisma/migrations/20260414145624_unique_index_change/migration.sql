/*
  Warnings:

  - A unique constraint covering the columns `[customerProfileId,productVariationId,productId]` on the table `wishlist` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `wishlist` DROP FOREIGN KEY `wishlist_customerProfileId_fkey`;

-- DropIndex
DROP INDEX `wishlist_customerProfileId_productId_key` ON `wishlist`;

-- CreateIndex
CREATE UNIQUE INDEX `wishlist_customerProfileId_productVariationId_productId_key` ON `wishlist`(`customerProfileId`, `productVariationId`, `productId`);

-- AddForeignKey
ALTER TABLE `return_items` ADD CONSTRAINT `return_items_orderItemId_fkey_v2` FOREIGN KEY (`orderItemId`) REFERENCES `order_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
