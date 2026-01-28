-- AlterTable
ALTER TABLE `orders` MODIFY `paymentMethod` ENUM('credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'myfatoorah', 'cash_on_delivery') NOT NULL DEFAULT 'cash_on_delivery';

-- AlterTable
ALTER TABLE `payments` MODIFY `method` ENUM('credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'myfatoorah', 'cash_on_delivery') NOT NULL;
