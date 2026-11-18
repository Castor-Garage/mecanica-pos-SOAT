-- AlterEnum
ALTER TYPE "OSStatus" ADD VALUE 'CANCELADA';

-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN     "billing_payment_id" TEXT,
ADD COLUMN     "billing_quote_id" TEXT,
ADD COLUMN     "checkout_url" TEXT,
ADD COLUMN     "payment_confirmed_at" TIMESTAMP(3);
