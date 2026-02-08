/*
  Warnings:

  - You are about to drop the column `hsafa_public_key` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `hsafa_secret_key` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "hsafa_public_key",
DROP COLUMN "hsafa_secret_key";
