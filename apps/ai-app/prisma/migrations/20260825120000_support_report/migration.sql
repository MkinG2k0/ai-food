-- CreateEnum
CREATE TYPE "SupportReportType" AS ENUM ('bug', 'feature', 'question', 'other');

-- CreateEnum
CREATE TYPE "SupportReportStatus" AS ENUM ('new', 'read', 'resolved');

-- CreateTable
CREATE TABLE "SupportReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "type" "SupportReportType" NOT NULL DEFAULT 'other',
    "message" TEXT NOT NULL,
    "images" JSONB,
    "appVersion" TEXT,
    "platform" TEXT,
    "status" "SupportReportStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportReport_createdAt_idx" ON "SupportReport"("createdAt");

-- CreateIndex
CREATE INDEX "SupportReport_userId_createdAt_idx" ON "SupportReport"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportReport_status_createdAt_idx" ON "SupportReport"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SupportReport" ADD CONSTRAINT "SupportReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
