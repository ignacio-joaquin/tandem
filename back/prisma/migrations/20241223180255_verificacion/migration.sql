/*
  Warnings:

  - Added the required column `evidence` to the `Goal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Goal` ADD COLUMN `evidence` VARCHAR(191) NOT NULL;
