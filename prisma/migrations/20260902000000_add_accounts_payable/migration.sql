-- CreateTable
CREATE TABLE "PayableAccount" ("id" TEXT NOT NULL PRIMARY KEY, "supplierId" TEXT, "purchaseId" TEXT, "description" TEXT NOT NULL, "totalUsd" REAL NOT NULL DEFAULT 0, "totalBs" REAL NOT NULL DEFAULT 0, "paidUsd" REAL NOT NULL DEFAULT 0, "paidBs" REAL NOT NULL DEFAULT 0, "remainingUsd" REAL NOT NULL DEFAULT 0, "remainingBs" REAL NOT NULL DEFAULT 0, "exchangeRate" REAL NOT NULL DEFAULT 0, "dueDate" DATETIME, "status" TEXT NOT NULL DEFAULT 'pendiente', "notes" TEXT NOT NULL DEFAULT '', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PayableAccount_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE);

-- CreateTable
CREATE TABLE "PayablePayment" ("id" TEXT NOT NULL PRIMARY KEY, "payableId" TEXT NOT NULL, "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "amountUsd" REAL NOT NULL, "amountBs" REAL NOT NULL, "exchangeRate" REAL NOT NULL, "method" TEXT NOT NULL DEFAULT 'transferencia', "reference" TEXT NOT NULL DEFAULT '', "notes" TEXT NOT NULL DEFAULT '', "createdBy" TEXT NOT NULL DEFAULT '', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PayablePayment_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "PayableAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE);

-- CreateIndex
CREATE INDEX "PayableAccount_status_idx" ON "PayableAccount"("status");

-- CreateIndex
CREATE INDEX "PayableAccount_supplierId_idx" ON "PayableAccount"("supplierId");

-- CreateIndex
CREATE INDEX "PayableAccount_dueDate_idx" ON "PayableAccount"("dueDate");

-- CreateIndex
CREATE INDEX "PayablePayment_date_idx" ON "PayablePayment"("date");

-- CreateIndex
CREATE INDEX "PayablePayment_payableId_idx" ON "PayablePayment"("payableId");
