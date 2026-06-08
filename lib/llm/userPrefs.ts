import { and, eq } from "drizzle-orm";
import { db, settings } from "@/lib/db";
import { getOrCreateLocalSettings } from "@/lib/local/database";
import { isLocalFirstMode } from "@/lib/local/mode";
import type { LLMRolesPrefs } from "@/lib/llm/types";

function asRolesPrefs(value: unknown): LLMRolesPrefs | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as LLMRolesPrefs;
}

/** Load per-user LLM role overrides from settings.prefs.llmRoles. */
export async function loadUserLlmRoles(
  userId: string,
  workspaceId?: string,
): Promise<LLMRolesPrefs | undefined> {
  if (isLocalFirstMode()) {
    const row = getOrCreateLocalSettings(userId, workspaceId ?? "local-workspace");
    return asRolesPrefs(row.prefs?.llmRoles);
  }

  const scope = workspaceId
    ? and(eq(settings.userId, userId), eq(settings.workspaceId, workspaceId))
    : eq(settings.userId, userId);
  const [row] = await db.select().from(settings).where(scope).limit(1);
  const prefs = row?.prefs as Record<string, unknown> | null | undefined;
  return asRolesPrefs(prefs?.llmRoles);
}