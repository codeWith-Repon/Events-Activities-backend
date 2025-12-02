-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "paymentGatewayData" DROP NOT NULL,
ALTER COLUMN "invoiceUrl" DROP NOT NULL;
