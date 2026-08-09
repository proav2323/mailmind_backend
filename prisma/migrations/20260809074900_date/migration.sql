/*
  Warnings:

  - The `exp` column on the `USER` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "USER" DROP COLUMN "exp",
ADD COLUMN     "exp" TIMESTAMP(3);
