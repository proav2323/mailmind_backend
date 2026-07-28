/*
  Warnings:

  - A unique constraint covering the columns `[gmailId]` on the table `EMAILS` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EMAILS_gmailId_key" ON "EMAILS"("gmailId");
