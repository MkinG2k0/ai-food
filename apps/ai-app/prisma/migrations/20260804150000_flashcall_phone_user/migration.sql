-- Telegram identities are intentionally not migrated to phone identities.
-- Reset user-owned payment history before adding the required phone field.
DELETE FROM "Payment";
DELETE FROM "User";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "telegramId",
DROP COLUMN "username",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "photoUrl",
ADD COLUMN "phone" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
