-- AlterTable
ALTER TABLE `categories` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `sub_categories` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;
