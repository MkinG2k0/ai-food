# Review package Task 1
BASE: 3ee414f3eb397209b478f8fba54dc06a9bfe2008
HEAD: f8229573b8e7139947759e6057ed70ba3ef4cbd0

## Commits
f822957 feat(ai-app): add User data consent fields

## Stat
 .../prisma/migrations/20260806010000_user_data_consent/migration.sql   | 3 +++  apps/ai-app/prisma/schema.prisma                                       | 2 ++  apps/ai-app/src/lib/consent.ts                                         | 1 +  3 files changed, 6 insertions(+)

## Diff
```
diff --git a/apps/ai-app/prisma/migrations/20260806010000_user_data_consent/migration.sql b/apps/ai-app/prisma/migrations/20260806010000_user_data_consent/migration.sql new file mode 100644 index 0000000..f778c04 --- /dev/null +++ b/apps/ai-app/prisma/migrations/20260806010000_user_data_consent/migration.sql @@ -0,0 +1,3 @@ +-- AlterTable +ALTER TABLE "User" ADD COLUMN "dataConsentAt" TIMESTAMP(3), +ADD COLUMN "dataConsentVersion" TEXT; diff --git a/apps/ai-app/prisma/schema.prisma b/apps/ai-app/prisma/schema.prisma index 2f13a72..d2681ff 100644 --- a/apps/ai-app/prisma/schema.prisma +++ b/apps/ai-app/prisma/schema.prisma @@ -21,20 +21,22 @@ enum PaymentStatus {    refunded  }    model User {    id                     String             @id @default(cuid())    telegramId             String             @unique    username               String?    firstName              String?    lastName               String?    photoUrl               String? +  dataConsentAt          DateTime? +  dataConsentVersion     String?    subscriptionStatus     SubscriptionStatus @default(none)    subscriptionExpiresAt  DateTime?    createdAt              DateTime           @default(now())    updatedAt              DateTime           @updatedAt    devices                Device[]    usageEvents            UsageEvent[]    payments               Payment[]  }    model Payment { diff --git a/apps/ai-app/src/lib/consent.ts b/apps/ai-app/src/lib/consent.ts new file mode 100644 index 0000000..3aa5724 --- /dev/null +++ b/apps/ai-app/src/lib/consent.ts @@ -0,0 +1 @@ +export const DATA_CONSENT_VERSION = '2026-08-06';
```
