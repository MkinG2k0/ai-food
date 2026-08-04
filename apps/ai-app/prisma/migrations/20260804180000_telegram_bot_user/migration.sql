-- Flash-Call phone identities are not migrated to Telegram.
DELETE FROM "Payment";
DELETE FROM "User";

ALTER TABLE "User" DROP COLUMN "phone",
ADD COLUMN "telegramId" TEXT NOT NULL,
ADD COLUMN "username" TEXT,
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "photoUrl" TEXT;

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
