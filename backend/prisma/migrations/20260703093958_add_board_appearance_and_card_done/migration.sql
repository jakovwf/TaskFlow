-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "backgroundColor" TEXT;

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "coverColor" TEXT,
ADD COLUMN     "isDone" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "accentColor" TEXT;
