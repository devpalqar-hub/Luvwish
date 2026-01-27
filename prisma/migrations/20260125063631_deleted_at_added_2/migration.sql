/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `LeadLogs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `LeadLogs` DROP COLUMN `deletedAt`;

-- AlterTable
ALTER TABLE `Leads` ADD COLUMN `deletedAt` DATETIME(3) NULL;
