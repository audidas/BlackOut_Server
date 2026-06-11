-- CreateTable
CREATE TABLE "movement_sample" (
    "id" BIGSERIAL NOT NULL,
    "match_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "t_sec" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "level_name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movement_sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_event" (
    "event_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "account_id" TEXT,
    "t_sec" DOUBLE PRECISION NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "level_name" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_event_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "movement_sample_match_id_idx" ON "movement_sample"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "movement_sample_match_id_account_id_t_sec_key" ON "movement_sample"("match_id", "account_id", "t_sec");

-- CreateIndex
CREATE INDEX "match_event_match_id_idx" ON "match_event"("match_id");
