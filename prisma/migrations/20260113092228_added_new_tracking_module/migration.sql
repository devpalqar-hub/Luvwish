-- AlterTable
ALTER TABLE `TrackingDetail` ADD COLUMN `status` ENUM('order_placed', 'processing', 'ready_to_ship', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned') NOT NULL DEFAULT 'order_placed',
    ADD COLUMN `statusHistory` JSON NULL;
