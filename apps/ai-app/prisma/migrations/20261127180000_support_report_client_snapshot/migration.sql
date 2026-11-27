ALTER TABLE "SupportReport" ADD COLUMN "clientSnapshot" JSONB;
ALTER TABLE "SupportReport" ADD COLUMN "hasClientSnapshot" BOOLEAN NOT NULL DEFAULT false;
