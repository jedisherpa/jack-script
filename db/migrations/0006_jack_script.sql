-- Jack Script: project + script metadata extensions
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'feature';
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "logline" text;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "genre" text;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "target_page_count" integer;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "format" text DEFAULT 'screenplay';

ALTER TABLE "pieces" ADD COLUMN IF NOT EXISTS "format" text DEFAULT 'screenplay';
ALTER TABLE "pieces" ADD COLUMN IF NOT EXISTS "page_estimate" real;
ALTER TABLE "pieces" ADD COLUMN IF NOT EXISTS "scene_count" integer;
ALTER TABLE "pieces" ADD COLUMN IF NOT EXISTS "parsed_scenes" jsonb;