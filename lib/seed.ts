/**
 * Seed data for King's Press campaigns + references.
 *
 * SEED_REFERENCES and CAMPAIGN_NAMES are ported VERBATIM from
 * prototype-reference/store.js (the source of truth for the references doc
 * shape and the 11 default campaign names). seedWorkspace inserts the 11
 * campaigns (slug = kebab-case of name) each with a references row whose
 * doc = SEED_REFERENCES.
 */
import type { db as Db } from "@/lib/db";
import { campaigns, references } from "@/lib/db";
export {
  CAMPAIGN_NAMES,
  SEED_REFERENCES,
  slug,
  type SeedReferences,
} from "@/lib/seed-data";
import {
  CAMPAIGN_NAMES,
  SEED_REFERENCES,
  slug,
  type SeedReferences,
} from "@/lib/seed-data";

/**
 * Insert the 11 seed campaigns into a workspace, each with a references row
 * whose doc = SEED_REFERENCES. Returns the inserted campaign rows.
 */
export async function seedWorkspace(database: typeof Db, workspaceId: string) {
  const campaignRows = await database
    .insert(campaigns)
    .values(
      CAMPAIGN_NAMES.map((name) => ({
        workspaceId,
        slug: slug(name),
        name,
      })),
    )
    .returning();

  if (campaignRows.length) {
    await database.insert(references).values(
      campaignRows.map((c) => ({
        campaignId: c.id,
        // fresh clone of the seed doc per campaign
        doc: JSON.parse(JSON.stringify(SEED_REFERENCES)) as SeedReferences,
      })),
    );
  }

  return campaignRows;
}
