-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "goalKg" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE IF NOT EXISTS "WeightEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "kg" DOUBLE PRECISION NOT NULL,
    "clientUpdatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeightEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceMealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "totalCalories" DOUBLE PRECISION NOT NULL,
    "portions" DOUBLE PRECISION,
    "imageUri" TEXT,
    "imageUris" JSONB,
    "healthiness" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "micronutrients" JSONB,
    "createdAtClient" TIMESTAMP(3),
    "clientUpdatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WeightEntry_userId_date_idx" ON "WeightEntry"("userId", "date");
CREATE INDEX IF NOT EXISTS "WeightEntry_userId_clientUpdatedAt_idx" ON "WeightEntry"("userId", "clientUpdatedAt");
CREATE INDEX IF NOT EXISTS "Favorite_userId_clientUpdatedAt_idx" ON "Favorite"("userId", "clientUpdatedAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "WeightEntry" ADD CONSTRAINT "WeightEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
