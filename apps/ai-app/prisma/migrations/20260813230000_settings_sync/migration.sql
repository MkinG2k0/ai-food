-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clientSettings" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "settingsClientUpdatedAt" TIMESTAMP(3);
