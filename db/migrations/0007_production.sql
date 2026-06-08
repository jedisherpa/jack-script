-- Skill 11: stage-gated video production state on pieces
ALTER TABLE "pieces" ADD COLUMN IF NOT EXISTS "production" jsonb;