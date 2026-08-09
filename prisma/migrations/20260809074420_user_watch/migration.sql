-- AlterTable
ALTER TABLE "USER" ADD COLUMN     "exp" INTEGER,
ADD COLUMN     "isWatching" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "seen" BOOLEAN NOT NULL DEFAULT false;
