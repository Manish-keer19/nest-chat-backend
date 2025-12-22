-- AlterTable
ALTER TABLE "MessageRead" ALTER COLUMN "readAt" DROP NOT NULL,
ALTER COLUMN "readAt" DROP DEFAULT,
ALTER COLUMN "deliveredAt" DROP NOT NULL,
ALTER COLUMN "deliveredAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "MessageRead_userId_deliveredAt_idx" ON "MessageRead"("userId", "deliveredAt");
