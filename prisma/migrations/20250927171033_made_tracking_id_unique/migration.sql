/*
  Warnings:

  - A unique constraint covering the columns `[trackingID]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `orders_trackingID_key` ON `orders`(`trackingID`);
