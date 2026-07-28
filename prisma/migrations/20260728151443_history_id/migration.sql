/*
  Warnings:

  - You are about to drop the column `desc` on the `CATEGORIES` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CATEGORIES" DROP COLUMN "desc";

-- AlterTable
ALTER TABLE "USER" ADD COLUMN     "historyId" TEXT;
