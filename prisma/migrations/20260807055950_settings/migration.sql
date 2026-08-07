-- AlterTable
ALTER TABLE "USER" ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{"SyncCalender": "true", "Reminders": "true" }';
