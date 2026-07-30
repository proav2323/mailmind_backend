/*
  Warnings:

  - Added the required column `aiPriority` to the `EMAILS` table without a default value. This is not possible if the table is not empty.
  - Added the required column `importance` to the `EMAILS` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isCompleted` to the `EMAILS` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requiresAction` to the `EMAILS` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderImportance` to the `EMAILS` table without a default value. This is not possible if the table is not empty.
  - Added the required column `urgency` to the `EMAILS` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EMAILS" ADD COLUMN     "aiPriority" TEXT NOT NULL,
ADD COLUMN     "importance" INTEGER NOT NULL,
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL,
ADD COLUMN     "lastOpenedAt" TIMESTAMP(3),
ADD COLUMN     "requiresAction" BOOLEAN NOT NULL,
ADD COLUMN     "senderImportance" INTEGER NOT NULL,
ADD COLUMN     "urgency" INTEGER NOT NULL;
