-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "map_embed_url" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "addresses" JSONB,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "traffic_logs" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traffic_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "traffic_logs_created_at_idx" ON "traffic_logs"("created_at");
