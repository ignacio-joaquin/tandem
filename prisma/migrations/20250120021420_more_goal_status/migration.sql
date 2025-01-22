/*
  Warnings:

  - You are about to drop the column `verified` on the `Goal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Goal` DROP COLUMN `verified`,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'pending verification';
