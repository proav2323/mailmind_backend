/*
  Warnings:

  - Added the required column `expiresIn` to the `USER` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `USER` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "USER" ADD COLUMN     "expiresIn" INTEGER NOT NULL,
ADD COLUMN     "refreshToken" TEXT NOT NULL;
