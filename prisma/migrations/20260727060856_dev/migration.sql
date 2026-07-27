/*
  Warnings:

  - You are about to drop the column `categories` on the `USER` table. All the data in the column will be lost.
  - Added the required column `GmailSubject` to the `EMAILS` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EMAILS" ADD COLUMN     "GmailSubject" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "USER" DROP COLUMN "categories";

-- CreateTable
CREATE TABLE "CATEGORIES" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CATEGORIES_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CATEGORIES" ADD CONSTRAINT "CATEGORIES_userId_fkey" FOREIGN KEY ("userId") REFERENCES "USER"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
