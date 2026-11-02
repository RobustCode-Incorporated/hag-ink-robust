-- CreateEnum
CREATE TYPE "JohnReportKind" AS ENUM ('MONTHLY', 'DAILY');

-- CreateEnum
CREATE TYPE "JohnReportStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "JohnReport" (
    "id" TEXT NOT NULL,
    "kind" "JohnReportKind" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "status" "JohnReportStatus" NOT NULL DEFAULT 'QUEUED',
    "facts" JSONB NOT NULL,
    "script" JSONB,
    "blobPath" TEXT,
    "durationSec" DOUBLE PRECISION,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "requestedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "JohnReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JohnReport_status_createdAt_idx" ON "JohnReport"("status", "createdAt");
