-- AlterTable
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "referralGrantedAt" TIMESTAMP(3);
