-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "promoCode" TEXT;

-- CreateIndex
CREATE INDEX "Payment_promoCode_status_idx" ON "Payment"("promoCode", "status");
