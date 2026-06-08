import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { db, campaigns, pieces, references } from "@/lib/db";
import { getLocalPiece, getLocalReferences, updateLocalPiece } from "@/lib/local/database";
import { isLocalFirstMode } from "@/lib/local/mode";
import { buildRefContext } from "@/lib/refContext";
import { toErrorResponse } from "@/lib/errors";
import {
  createInitialProduction,
  draftProductionVoiceScript,
  normalizeProduction,
  syncProductionStages,
} from "@/lib/production";
import { getUserAI } from "@/lib/llm";

const notFound = () =>
  NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });

async function resolvePiece(id: string, user: SessionUser) {
  if (isLocalFirstMode()) return getLocalPiece(id, user.id, user.workspaceId);
  const piece = await db.query.pieces.findFirst({
    where: and(eq(pieces.id, id), eq(pieces.userId, user.id)),
  });
  if (!piece || !user.workspaceId) return null;
  const campaign = await db.query.campaigns.findFirst({
    where: and(eq(campaigns.id, piece.campaignId), eq(campaigns.workspaceId, user.workspaceId)),
  });
  return campaign ? piece : null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await resolvePiece(id, user);
    if (!existing) return notFound();

    const body = (await req.json().catch(() => ({}))) as { voiceName?: string; useLlm?: boolean };
    let refContext = "";
    if (isLocalFirstMode()) {
      const ref = getLocalReferences(existing.campaignId, user.workspaceId);
      refContext = buildRefContext((ref?.doc as Record<string, unknown>) || {});
    } else {
      const ref = await db.query.references.findFirst({
        where: eq(references.campaignId, existing.campaignId),
      });
      refContext = buildRefContext((ref?.doc as Record<string, unknown>) || {});
    }

    const writeAI = body.useLlm === true ? await getUserAI("write", user) : undefined;
    const voiceScript = await draftProductionVoiceScript({
      title: existing.title,
      text: existing.original,
      refContext,
      voiceName: body.voiceName || "Narrator",
      useLlm: body.useLlm === true,
      client: writeAI,
    });

    let production = syncProductionStages(
      normalizeProduction((existing as { production?: unknown }).production ?? createInitialProduction()),
      existing.original,
    );
    production.audio = {
      ...production.audio,
      voiceScript,
      voiceName: body.voiceName || production.audio.voiceName || "Narrator",
    };
    production.auditLog.unshift({
      at: new Date().toISOString(),
      action: "audio_draft",
      stage: "audio",
      detail: `${voiceScript.length} chars`,
    });
    production = syncProductionStages(production, existing.original);

    if (isLocalFirstMode()) {
      const piece = updateLocalPiece(id, user.id, { production }, user.workspaceId);
      if (!piece) return notFound();
      return NextResponse.json({ production, voiceScript });
    }

    await db
      .update(pieces)
      .set({ production, updatedAt: new Date() })
      .where(and(eq(pieces.id, id), eq(pieces.userId, user.id)));

    return NextResponse.json({ production, voiceScript });
  } catch (err) {
    return toErrorResponse(err);
  }
}