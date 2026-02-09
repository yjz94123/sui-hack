-- DropIndex
DROP INDEX "markets_conditionId_key";

-- AlterTable
ALTER TABLE "markets" ALTER COLUMN "conditionId" DROP NOT NULL;
