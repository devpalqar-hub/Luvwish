-- AlterTable
ALTER TABLE `order_items` ADD COLUMN `returnStatus` ENUM('pending', 'approved', 'rejected', 'picked_up', 'returned', 'refunded') NULL AFTER `isReturned`;
