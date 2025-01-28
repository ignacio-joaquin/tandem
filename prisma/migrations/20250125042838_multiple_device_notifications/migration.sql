/*
  Warnings:

  - You are about to drop the column `pushAuth` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `pushP256dh` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `pushToken` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `User` DROP COLUMN `pushAuth`,
    DROP COLUMN `pushP256dh`,
    DROP COLUMN `pushToken`;

-- CreateTable
CREATE TABLE `PushSubscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `endpoint` VARCHAR(500) NOT NULL,
    `auth` VARCHAR(191) NOT NULL,
    `p256dh` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PushSubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
