-- CreateTable
CREATE TABLE "GatewayRequest" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stream" BOOLEAN NOT NULL DEFAULT false,
    "ok" BOOLEAN NOT NULL,
    "ttfbMs" INTEGER,
    "durationMs" INTEGER,
    "userId" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatewayRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GatewayRequest_createdAt_type_idx" ON "GatewayRequest"("createdAt", "type");

-- CreateIndex
CREATE INDEX "GatewayRequest_type_createdAt_idx" ON "GatewayRequest"("type", "createdAt");
