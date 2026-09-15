-- AlterTable content_requests
ALTER TABLE "content_requests" ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;
ALTER TABLE "content_requests" ADD COLUMN IF NOT EXISTS "input" JSONB;
ALTER TABLE "content_requests" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'content_requests_workspace_id_idempotency_key_key'
  ) THEN
    ALTER TABLE "content_requests"
      ADD CONSTRAINT "content_requests_workspace_id_idempotency_key_key"
      UNIQUE ("workspace_id", "idempotency_key");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "content_requests_created_by_user_id_idx"
  ON "content_requests"("created_by_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'content_requests_created_by_user_id_fkey'
  ) THEN
    ALTER TABLE "content_requests"
      ADD CONSTRAINT "content_requests_created_by_user_id_fkey"
      FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable generation_jobs
CREATE TABLE IF NOT EXISTS "generation_jobs" (
  "id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "content_request_id" TEXT NOT NULL,
  "status" "ContentJobStatus" NOT NULL DEFAULT 'requested',
  "provider" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "error_code" TEXT,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "usage_metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "generation_jobs_content_request_id_key"
  ON "generation_jobs"("content_request_id");
CREATE INDEX IF NOT EXISTS "generation_jobs_workspace_id_idx"
  ON "generation_jobs"("workspace_id");
CREATE INDEX IF NOT EXISTS "generation_jobs_status_idx"
  ON "generation_jobs"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_workspace_id_fkey'
  ) THEN
    ALTER TABLE "generation_jobs"
      ADD CONSTRAINT "generation_jobs_workspace_id_fkey"
      FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_content_request_id_fkey'
  ) THEN
    ALTER TABLE "generation_jobs"
      ADD CONSTRAINT "generation_jobs_content_request_id_fkey"
      FOREIGN KEY ("content_request_id") REFERENCES "content_requests"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterTable content_drafts
ALTER TABLE "content_drafts" ADD COLUMN IF NOT EXISTS "generation_job_id" TEXT;
ALTER TABLE "content_drafts" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "content_drafts" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "content_drafts" ADD COLUMN IF NOT EXISTS "prompt_version" TEXT;
ALTER TABLE "content_drafts" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- One draft per content request (drop non-unique index first if present)
DROP INDEX IF EXISTS "content_drafts_content_request_id_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "content_drafts_content_request_id_key"
  ON "content_drafts"("content_request_id");
CREATE UNIQUE INDEX IF NOT EXISTS "content_drafts_generation_job_id_key"
  ON "content_drafts"("generation_job_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'content_drafts_generation_job_id_fkey'
  ) THEN
    ALTER TABLE "content_drafts"
      ADD CONSTRAINT "content_drafts_generation_job_id_fkey"
      FOREIGN KEY ("generation_job_id") REFERENCES "generation_jobs"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
