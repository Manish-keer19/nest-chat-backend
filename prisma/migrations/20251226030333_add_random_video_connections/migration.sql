-- CreateTable
CREATE TABLE "RandomVideoConnection" (
    "id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,

    CONSTRAINT "RandomVideoConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RandomVideoConnection_user1Id_idx" ON "RandomVideoConnection"("user1Id");

-- CreateIndex
CREATE INDEX "RandomVideoConnection_user2Id_idx" ON "RandomVideoConnection"("user2Id");

-- CreateIndex
CREATE INDEX "RandomVideoConnection_startedAt_idx" ON "RandomVideoConnection"("startedAt");

-- AddForeignKey
ALTER TABLE "RandomVideoConnection" ADD CONSTRAINT "RandomVideoConnection_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RandomVideoConnection" ADD CONSTRAINT "RandomVideoConnection_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
