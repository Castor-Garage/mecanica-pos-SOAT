-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CPF', 'CNPJ');

-- CreateEnum
CREATE TYPE "OSStatus" AS ENUM ('RECEBIDA', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO', 'EM_EXECUCAO', 'FINALIZADA', 'ENTREGUE');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "license_plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT,
    "client_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "estimated_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" "OSStatus" NOT NULL DEFAULT 'RECEBIDA',
    "client_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "problem_description" TEXT,
    "diagnosis" TEXT,
    "quote_total_amount" DECIMAL(10,2),
    "quote_approved_at" TIMESTAMP(3),
    "quote_rejected_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "technician_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_items" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_order_parts" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_order_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "os_status_history" (
    "id" TEXT NOT NULL,
    "service_order_id" TEXT NOT NULL,
    "from_status" "OSStatus",
    "to_status" "OSStatus" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "notes" TEXT,

    CONSTRAINT "os_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_document_key" ON "clients"("document");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_license_plate_key" ON "vehicles"("license_plate");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_order_number_key" ON "service_orders"("order_number");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_parts" ADD CONSTRAINT "service_order_parts_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_order_parts" ADD CONSTRAINT "service_order_parts_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "os_status_history" ADD CONSTRAINT "os_status_history_service_order_id_fkey" FOREIGN KEY ("service_order_id") REFERENCES "service_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
