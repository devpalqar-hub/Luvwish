-- AlterTable
ALTER TABLE `orders` MODIFY `status` ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded') NOT NULL DEFAULT 'pending';
