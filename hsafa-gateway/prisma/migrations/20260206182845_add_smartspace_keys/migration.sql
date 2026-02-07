/*
  Warnings:

  - A unique constraint covering the columns `[public_key]` on the table `smart_spaces` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[secret_key]` on the table `smart_spaces` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `public_key` to the `smart_spaces` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secret_key` to the `smart_spaces` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "capabilities" SET DEFAULT '{}'::jsonb;

-- AlterTable
ALTER TABLE "smart_spaces" ADD COLUMN     "public_key" TEXT NOT NULL,
ADD COLUMN     "secret_key" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "smart_spaces_public_key_key" ON "smart_spaces"("public_key");

-- CreateIndex
CREATE UNIQUE INDEX "smart_spaces_secret_key_key" ON "smart_spaces"("secret_key");

-- CreateIndex
CREATE INDEX "smart_spaces_public_key_idx" ON "smart_spaces"("public_key");

-- CreateIndex
CREATE INDEX "smart_spaces_secret_key_idx" ON "smart_spaces"("secret_key");
