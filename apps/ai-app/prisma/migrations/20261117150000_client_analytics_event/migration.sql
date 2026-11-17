-- CreateTable
CREATE TABLE "ClientAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "deviceId" TEXT,
    "mealId" TEXT,
    "errorCode" TEXT,
    "inFlight" BOOLEAN NOT NULL DEFAULT false,
    "clientAt" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientAnalyticsEvent_name_createdAt_idx" ON "ClientAnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "ClientAnalyticsEvent_userId_createdAt_idx" ON "ClientAnalyticsEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientAnalyticsEvent_deviceId_createdAt_idx" ON "ClientAnalyticsEvent"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientAnalyticsEvent_mealId_createdAt_idx" ON "ClientAnalyticsEvent"("mealId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClientAnalyticsEvent" ADD CONSTRAINT "ClientAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
