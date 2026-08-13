-- 007_pipeline_stage.sql
-- Persist Kanban pipeline stages server-side

ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS pipeline_stage TEXT
  CHECK (pipeline_stage IS NULL OR pipeline_stage IN ('saved', 'applied', 'interviewing', 'closed'));
