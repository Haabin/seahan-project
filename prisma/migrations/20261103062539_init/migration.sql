-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('DEFECT', 'HOLD', 'SHIP_PLANNED', 'OTHER');

-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('ACTIVE', 'RELEASED');

-- CreateEnum
CREATE TYPE "AdjustmentSource" AS ENUM ('MANUAL', 'SCAN');

-- CreateEnum
CREATE TYPE "ConsultStatus" AS ENUM ('OPEN', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "HistoryAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SyncKind" AS ENUM ('BASELINE', 'INCREMENTAL');

-- CreateEnum
CREATE TYPE "SyncSource" AS ENUM ('CSV_FILE', 'MOCK', 'DB', 'SEED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Site" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ProcessStage" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProcessStage_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Item" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "variantCode" TEXT,
    "capacityMl" INTEGER,
    "packUnit" TEXT,
    "packQty" INTEGER,
    "unit" TEXT NOT NULL DEFAULT '개',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpStock" (
    "id" SERIAL NOT NULL,
    "itemCode" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "erpQty" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "syncRunId" INTEGER,

    CONSTRAINT "ErpStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpStockHistory" (
    "id" SERIAL NOT NULL,
    "itemCode" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "erpQty" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "syncRunId" INTEGER,

    CONSTRAINT "ErpStockHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adjustment" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "AdjustmentSource" NOT NULL DEFAULT 'MANUAL',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedById" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releaseNote" TEXT,

    CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPlan" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "plannedQty" INTEGER NOT NULL,
    "startDate" DATE,
    "dueDate" DATE NOT NULL,
    "stageCode" TEXT NOT NULL,
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memo" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultNote" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "requestedQty" INTEGER NOT NULL,
    "desiredDate" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ConsultStatus" NOT NULL DEFAULT 'OPEN',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ConsultNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultNoteHistory" (
    "id" SERIAL NOT NULL,
    "noteId" TEXT NOT NULL,
    "action" "HistoryAction" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultNoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","itemCode")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" SERIAL NOT NULL,
    "kind" "SyncKind" NOT NULL,
    "source" "SyncSource" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_nameNormalized_idx" ON "Item"("nameNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_name_key" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ErpStock_itemCode_siteCode_key" ON "ErpStock"("itemCode", "siteCode");

-- CreateIndex
CREATE INDEX "ErpStockHistory_itemCode_siteCode_capturedAt_idx" ON "ErpStockHistory"("itemCode", "siteCode", "capturedAt");

-- CreateIndex
CREATE INDEX "Adjustment_itemCode_siteCode_status_idx" ON "Adjustment"("itemCode", "siteCode", "status");

-- CreateIndex
CREATE INDEX "Adjustment_createdAt_idx" ON "Adjustment"("createdAt");

-- CreateIndex
CREATE INDEX "ProductionPlan_itemCode_dueDate_idx" ON "ProductionPlan"("itemCode", "dueDate");

-- CreateIndex
CREATE INDEX "ConsultNote_itemCode_desiredDate_idx" ON "ConsultNote"("itemCode", "desiredDate");

-- CreateIndex
CREATE INDEX "ConsultNote_authorId_idx" ON "ConsultNote"("authorId");

-- CreateIndex
CREATE INDEX "ConsultNoteHistory_noteId_idx" ON "ConsultNoteHistory"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "SyncRun_startedAt_idx" ON "SyncRun"("startedAt");

-- AddForeignKey
ALTER TABLE "ErpStock" ADD CONSTRAINT "ErpStock_itemCode_fkey" FOREIGN KEY ("itemCode") REFERENCES "Item"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpStock" ADD CONSTRAINT "ErpStock_siteCode_fkey" FOREIGN KEY ("siteCode") REFERENCES "Site"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpStock" ADD CONSTRAINT "ErpStock_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpStockHistory" ADD CONSTRAINT "ErpStockHistory_itemCode_fkey" FOREIGN KEY ("itemCode") REFERENCES "Item"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpStockHistory" ADD CONSTRAINT "ErpStockHistory_siteCode_fkey" FOREIGN KEY ("siteCode") REFERENCES "Site"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpStockHistory" ADD CONSTRAINT "ErpStockHistory_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_itemCode_fkey" FOREIGN KEY ("itemCode") REFERENCES "Item"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_siteCode_fkey" FOREIGN KEY ("siteCode") REFERENCES "Site"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_itemCode_fkey" FOREIGN KEY ("itemCode") REFERENCES "Item"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_siteCode_fkey" FOREIGN KEY ("siteCode") REFERENCES "Site"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_stageCode_fkey" FOREIGN KEY ("stageCode") REFERENCES "ProcessStage"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultNote" ADD CONSTRAINT "ConsultNote_itemCode_fkey" FOREIGN KEY ("itemCode") REFERENCES "Item"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultNote" ADD CONSTRAINT "ConsultNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultNoteHistory" ADD CONSTRAINT "ConsultNoteHistory_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "ConsultNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultNoteHistory" ADD CONSTRAINT "ConsultNoteHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_itemCode_fkey" FOREIGN KEY ("itemCode") REFERENCES "Item"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
