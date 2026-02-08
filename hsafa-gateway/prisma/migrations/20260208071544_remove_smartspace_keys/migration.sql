/*
  Warnings:

  - You are about to drop the column `public_key` on the `smart_spaces` table. All the data in the column will be lost.
  - You are about to drop the column `secret_key` on the `smart_spaces` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "smart_spaces_public_key_key";

-- DropIndex
DROP INDEX "smart_spaces_secret_key_key";

-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "capabilities" SET DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "smart_spaces" DROP COLUMN "public_key",
DROP COLUMN "secret_key";
