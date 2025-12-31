/*
  Warnings:

  - You are about to drop the `RandomVideoConnection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RandomVideoConnection" DROP CONSTRAINT "RandomVideoConnection_user1Id_fkey";

-- DropForeignKey
ALTER TABLE "RandomVideoConnection" DROP CONSTRAINT "RandomVideoConnection_user2Id_fkey";

-- DropTable
DROP TABLE "RandomVideoConnection";
