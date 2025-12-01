/*
  Warnings:

  - You are about to drop the column `image` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "image",
ADD COLUMN     "images" TEXT[];
