/*
  Warnings:

  - You are about to drop the column `categories` on the `EMAILS` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EMAILS" DROP COLUMN "categories";

-- AlterTable
ALTER TABLE "USER" ADD COLUMN     "categories" TEXT[];
