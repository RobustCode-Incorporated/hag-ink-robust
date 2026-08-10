/*
  Warnings:

  - You are about to drop the column `stripeEventId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSessionId` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[flexpayOrderNumber]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `flexpayOrderNumber` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Payment_stripeEventId_key";

-- DropIndex
DROP INDEX "Payment_stripeSessionId_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "stripeEventId",
DROP COLUMN "stripeSessionId",
ADD COLUMN     "flexpayOrderNumber" TEXT NOT NULL,
ADD COLUMN     "providerReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_flexpayOrderNumber_key" ON "Payment"("flexpayOrderNumber");
