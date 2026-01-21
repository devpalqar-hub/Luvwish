-- CreateTable
CREATE TABLE `DeliveryCharges` (
    `id` VARCHAR(191) NOT NULL,
    `postalCode` VARCHAR(191) NOT NULL,
    `deliveryCharge` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeliveryCharges_postalCode_key`(`postalCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
