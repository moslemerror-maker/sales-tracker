-- CreateTable
CREATE TABLE "PJP" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PJP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PJPItem" (
    "id" SERIAL NOT NULL,
    "pjpId" INTEGER NOT NULL,
    "dealerId" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "plannedTime" TIMESTAMP(3),

    CONSTRAINT "PJPItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PJP_userId_date_key" ON "PJP"("userId", "date");

-- AddForeignKey
ALTER TABLE "PJP" ADD CONSTRAINT "PJP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PJPItem" ADD CONSTRAINT "PJPItem_pjpId_fkey" FOREIGN KEY ("pjpId") REFERENCES "PJP"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PJPItem" ADD CONSTRAINT "PJPItem_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
