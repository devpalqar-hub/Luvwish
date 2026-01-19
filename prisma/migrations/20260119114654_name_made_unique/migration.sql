/*
  Warnings:

  - A unique constraint covering the columns `[couponName]` on the table `Coupon` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Coupon_couponName_key` ON `Coupon`(`couponName`);
