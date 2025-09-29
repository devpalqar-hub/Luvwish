/*
  Warnings:

  - A unique constraint covering the columns `[paymentId]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `paymentId` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `orders` ADD COLUMN `paymentId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `orders_paymentId_key` ON `orders`(`paymentId`);
