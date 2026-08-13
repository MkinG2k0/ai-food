-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "items" JSONB NOT NULL,
    "totalCalories" DOUBLE PRECISION NOT NULL,
    "portions" DOUBLE PRECISION,
    "totalGrams" DOUBLE PRECISION,
    "status" TEXT,
    "healthiness" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "analyzeErrorCode" TEXT,
    "micronutrients" JSONB,
    "aiModel" TEXT,
    "portionReference" TEXT,
    "addedSugar" DOUBLE PRECISION,
    "confidenceReason" TEXT,
    "healthinessReason" TEXT,
    "disclaimers" JSONB,
    "customContent" TEXT,
    "customContentEntries" JSONB,
    "imageUri" TEXT,
    "imageUris" JSONB,
    "clientUpdatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Meal_userId_timestamp_idx" ON "Meal"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "Meal_userId_clientUpdatedAt_idx" ON "Meal"("userId", "clientUpdatedAt");

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
