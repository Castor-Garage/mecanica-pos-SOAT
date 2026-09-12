-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'ATIVO';
