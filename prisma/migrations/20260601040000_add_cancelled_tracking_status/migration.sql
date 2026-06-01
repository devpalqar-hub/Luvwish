-- AlterTable: Add 'cancelled' value to TrackingStatus enum on TrackingDetail table
ALTER TABLE `TrackingDetail` MODIFY COLUMN `status` ENUM('order_placed','processing','ready_to_ship','shipped','in_transit','out_for_delivery','delivered','failed_delivery','return_processing','returned','cancelled') NOT NULL DEFAULT 'order_placed';
