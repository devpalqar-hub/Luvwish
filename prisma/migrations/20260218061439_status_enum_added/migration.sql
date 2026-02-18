/*
  Warnings:

  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `TrackingDetail` MODIFY `status` ENUM('order_placed', 'processing', 'ready_to_ship', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'return_processing', 'returned') NOT NULL DEFAULT 'order_placed';

-- AlterTable
ALTER TABLE `users` DROP COLUMN `name`,
    DROP COLUMN `phone`;
