-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('UGX', 'USD');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('MOBILE_MONEY');

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" "Currency" NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "state" "PaymentState" NOT NULL DEFAULT 'INITIATED',
    "providerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTransaction" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerTransactionId" TEXT NOT NULL,
    "status" "PaymentState" NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" "Currency" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" UUID NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerTxId" TEXT NOT NULL,
    "payloadHash" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_customerPhone_idx" ON "Payment"("customerPhone");

-- CreateIndex
CREATE INDEX "Payment_customerEmail_idx" ON "Payment"("customerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTransaction_providerName_providerTransactionId_key" ON "ProviderTransaction"("providerName", "providerTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookDelivery_providerName_providerTxId_key" ON "WebhookDelivery"("providerName", "providerTxId");

-- AddForeignKey
ALTER TABLE "ProviderTransaction" ADD CONSTRAINT "ProviderTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
