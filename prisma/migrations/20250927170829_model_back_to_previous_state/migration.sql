/*
  Warnings:

  - You are about to drop the column `paymentId` on the `orders` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `orders_paymentId_key` ON `orders`;

-- AlterTable
ALTER TABLE `orders` DROP COLUMN `paymentId`;
