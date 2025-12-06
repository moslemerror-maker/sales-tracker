-- CreateTable
CREATE TABLE "LastLocation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LastLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LastLocation_userId_key" ON "LastLocation"("userId");

-- AddForeignKey
ALTER TABLE "LastLocation" ADD CONSTRAINT "LastLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
