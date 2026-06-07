-- CreateEnum
CREATE TYPE "farmer_produce_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SOLD');

-- CreateEnum
CREATE TYPE "quality_grade" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR');

-- CreateEnum
CREATE TYPE "regional_bid_status" AS ENUM ('OPEN', 'CLOSED', 'APPROVED');

-- CreateEnum
CREATE TYPE "bid_status" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "bid_confirmation_status" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "farmers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "farmerName" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "locationRegion" TEXT,
    "villageName" TEXT,
    "farmSize" TEXT,
    "farmingExperienceYears" INTEGER,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farmers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "locationRegion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produce_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unitOfMeasurement" TEXT NOT NULL,

    CONSTRAINT "produce_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmer_produce" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "produceTypeId" TEXT,
    "quantityAvailable" DECIMAL(10,2) NOT NULL,
    "unitOfMeasurement" TEXT NOT NULL DEFAULT 'bags',
    "askingPricePerUnit" DECIMAL(10,2) NOT NULL,
    "suggestedPrice" DECIMAL(10,2),
    "harvestDate" DATE,
    "qualityGrade" "quality_grade",
    "locationRegion" TEXT,
    "status" "farmer_produce_status" NOT NULL DEFAULT 'PENDING',
    "iotVerified" BOOLEAN NOT NULL DEFAULT false,
    "blockchainRecorded" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farmer_produce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ussd_sessions" (
    "sessionId" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "currentStep" TEXT NOT NULL DEFAULT 'main_menu',
    "collectedData" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT now() + interval '5 minutes',

    CONSTRAINT "ussd_sessions_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "regional_bids" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "produceTypeId" TEXT,
    "averagePricePerUnit" DECIMAL(10,2) NOT NULL,
    "totalQuantityAvailable" DECIMAL(10,2) NOT NULL,
    "participatingFarmersCount" INTEGER NOT NULL DEFAULT 0,
    "negotiationThresholdPercentage" DECIMAL(5,2) DEFAULT 5,
    "status" "regional_bid_status" NOT NULL DEFAULT 'OPEN',
    "bidCloseDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regional_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "regionalBidId" TEXT,
    "buyerId" TEXT,
    "offeredPricePerUnit" DECIMAL(10,2) NOT NULL,
    "totalQuantityBid" DECIMAL(10,2) NOT NULL,
    "bidAmount" DECIMAL(14,2) NOT NULL,
    "negotiationDeviationPercentage" DECIMAL(5,2) NOT NULL,
    "status" "bid_status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_confirmations" (
    "id" TEXT NOT NULL,
    "bidId" TEXT,
    "farmerId" TEXT,
    "confirmationStatus" "bid_confirmation_status" NOT NULL DEFAULT 'PENDING',
    "confirmationTimestamp" TIMESTAMP(3),
    "notificationMethod" TEXT NOT NULL DEFAULT 'in_app',

    CONSTRAINT "bid_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iot_verifications" (
    "verificationId" TEXT NOT NULL,
    "produceId" TEXT,
    "temperature" DECIMAL(6,2),
    "humidity" DECIMAL(6,2),
    "moisture" DECIMAL(6,2),
    "weight" DECIMAL(10,2),
    "riskLevel" TEXT,
    "verificationStatus" TEXT,
    "issues" TEXT,
    "verificationHash" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iot_verifications_pkey" PRIMARY KEY ("verificationId")
);

-- CreateTable
CREATE TABLE "communications" (
    "id" TEXT NOT NULL,
    "senderUserId" TEXT,
    "recipientUserId" TEXT,
    "messageType" TEXT,
    "subject" TEXT,
    "messageContent" TEXT,
    "bidId" TEXT,
    "regionalBidId" TEXT,
    "sentTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readStatus" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "path" TEXT,
    "status" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "farmers_userId_key" ON "farmers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "farmers_phoneNumber_key" ON "farmers"("phoneNumber");

-- CreateIndex
CREATE INDEX "farmers_phoneNumber_idx" ON "farmers"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "buyers_userId_key" ON "buyers"("userId");

-- CreateIndex
CREATE INDEX "farmer_produce_farmerId_idx" ON "farmer_produce"("farmerId");

-- CreateIndex
CREATE INDEX "farmer_produce_status_idx" ON "farmer_produce"("status");

-- CreateIndex
CREATE INDEX "regional_bids_region_status_idx" ON "regional_bids"("region", "status");

-- CreateIndex
CREATE INDEX "bids_regionalBidId_status_idx" ON "bids"("regionalBidId", "status");

-- CreateIndex
CREATE INDEX "audit_events_userId_idx" ON "audit_events"("userId");

-- CreateIndex
CREATE INDEX "audit_events_createdAt_idx" ON "audit_events"("createdAt");

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_produce" ADD CONSTRAINT "farmer_produce_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_produce" ADD CONSTRAINT "farmer_produce_produceTypeId_fkey" FOREIGN KEY ("produceTypeId") REFERENCES "produce_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ussd_sessions" ADD CONSTRAINT "ussd_sessions_phoneNumber_fkey" FOREIGN KEY ("phoneNumber") REFERENCES "farmers"("phoneNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regional_bids" ADD CONSTRAINT "regional_bids_produceTypeId_fkey" FOREIGN KEY ("produceTypeId") REFERENCES "produce_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_regionalBidId_fkey" FOREIGN KEY ("regionalBidId") REFERENCES "regional_bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_confirmations" ADD CONSTRAINT "bid_confirmations_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_confirmations" ADD CONSTRAINT "bid_confirmations_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iot_verifications" ADD CONSTRAINT "iot_verifications_produceId_fkey" FOREIGN KEY ("produceId") REFERENCES "farmer_produce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_regionalBidId_fkey" FOREIGN KEY ("regionalBidId") REFERENCES "regional_bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;
