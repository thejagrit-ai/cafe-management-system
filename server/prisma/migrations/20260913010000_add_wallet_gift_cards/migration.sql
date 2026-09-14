CREATE TYPE "GiftCardStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'ADJUSTMENT');

CREATE TABLE "gift_cards" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "initialValue" DECIMAL(10,2) NOT NULL,
  "remainingValue" DECIMAL(10,2) NOT NULL,
  "status" "GiftCardStatus" NOT NULL DEFAULT 'ACTIVE',
  "purchaserName" TEXT,
  "recipientEmail" TEXT,
  "expiresAt" TIMESTAMP(3),
  "redeemedByCustomerId" TEXT,
  "redeemedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallet_transactions" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "type" "WalletTransactionType" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "source" TEXT,
  "referenceId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gift_cards_code_key" ON "gift_cards"("code");
CREATE INDEX "gift_cards_code_idx" ON "gift_cards"("code");
CREATE INDEX "gift_cards_status_idx" ON "gift_cards"("status");
CREATE INDEX "wallet_transactions_customerId_idx" ON "wallet_transactions"("customerId");
CREATE INDEX "wallet_transactions_createdAt_idx" ON "wallet_transactions"("createdAt");

ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
