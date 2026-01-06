-- AlterTable
ALTER TABLE `orders` ADD COLUMN `paymentMethod` ENUM('credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'cash_on_delivery') NOT NULL DEFAULT 'cash_on_delivery';
