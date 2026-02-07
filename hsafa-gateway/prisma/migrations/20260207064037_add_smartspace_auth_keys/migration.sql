-- DropIndex
DROP INDEX "smart_spaces_public_key_idx";

-- DropIndex
DROP INDEX "smart_spaces_secret_key_idx";

-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "capabilities" SET DEFAULT '{}'::jsonb;
