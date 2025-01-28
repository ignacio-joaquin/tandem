-- AlterTable
ALTER TABLE `User` ADD COLUMN `resetPasswordToken` VARCHAR(191) NULL,
    ADD COLUMN `resetPasswordTokenExpiry` DATETIME(3) NULL;
