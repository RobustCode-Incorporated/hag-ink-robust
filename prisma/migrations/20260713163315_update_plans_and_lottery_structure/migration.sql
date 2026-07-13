/*
  Warnings:

  - The values [BEARD,LIMITED_EDITION_TRIMESTRIAL] on the enum `PlanName` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `lotteryTicketId` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `lotteryTickets` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlanName_new" AS ENUM ('STANDARD_ENFANT', 'STANDARD_ADULTE', 'BRAIDS_A', 'BRAIDS_B', 'LOCKS_A', 'LOCKS_B', 'LIMITED_EDITION');
ALTER TABLE "Subscription" ALTER COLUMN "planName" TYPE "PlanName_new" USING ("planName"::text::"PlanName_new");
ALTER TYPE "PlanName" RENAME TO "PlanName_old";
ALTER TYPE "PlanName_new" RENAME TO "PlanName";
DROP TYPE "public"."PlanName_old";
COMMIT;

-- DropIndex
DROP INDEX "Subscription_lotteryTicketId_key";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "lotteryTicketId",
ADD COLUMN     "lotteryTickets" TEXT NOT NULL;
