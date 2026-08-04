BASE: f8b7a608ac79ee8b5a682286b9f325cb9dc675a1
HEAD: cdde860d493cf62d2fa015b9739f409254ae183a

cdde860 feat(ai-app): migrate User identity back to telegramId
 .../20260804180000_telegram_bot_user/migration.sql           | 12 ++++++++++++
 apps/ai-app/prisma/schema.prisma                             |  6 +++++-
 2 files changed, 17 insertions(+), 1 deletion(-)
diff --git a/apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql b/apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql
new file mode 100644
index 0000000..1f10a71
--- /dev/null
+++ b/apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql
@@ -0,0 +1,12 @@
+-- Flash-Call phone identities are not migrated to Telegram.
+DELETE FROM "Payment";
+DELETE FROM "User";
+
+ALTER TABLE "User" DROP COLUMN "phone",
+ADD COLUMN "telegramId" TEXT NOT NULL,
+ADD COLUMN "username" TEXT,
+ADD COLUMN "firstName" TEXT,
+ADD COLUMN "lastName" TEXT,
+ADD COLUMN "photoUrl" TEXT;
+
+CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
diff --git a/apps/ai-app/prisma/schema.prisma b/apps/ai-app/prisma/schema.prisma
index 2b715bf..d2ea3b9 100644
--- a/apps/ai-app/prisma/schema.prisma
+++ b/apps/ai-app/prisma/schema.prisma
@@ -16,21 +16,25 @@ enum SubscriptionStatus {
 
 enum PaymentStatus {
   pending
   confirmed
   rejected
   refunded
 }
 
 model User {
   id                     String             @id @default(cuid())
-  phone                  String             @unique
+  telegramId             String             @unique
+  username               String?
+  firstName              String?
+  lastName               String?
+  photoUrl               String?
   subscriptionStatus     SubscriptionStatus @default(none)
   subscriptionExpiresAt  DateTime?
   createdAt              DateTime           @default(now())
   updatedAt              DateTime           @updatedAt
   devices                Device[]
   usageEvents            UsageEvent[]
   payments               Payment[]
 }
 
 model Payment {
