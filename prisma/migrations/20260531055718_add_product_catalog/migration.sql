-- CreateTable
CREATE TABLE "ProductCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nmId" INTEGER NOT NULL,
    "article" TEXT NOT NULL,
    "subject" TEXT,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Без статуса',
    "responsible" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCatalog_nmId_key" ON "ProductCatalog"("nmId");
