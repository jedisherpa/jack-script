import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db, campaigns, pieces, references } from "@/lib/db";
import {
  deleteLocalPiece,
  getLocalPiece,
  getLocalReferences,
  updateLocalPiece,
  updateLocalReferences,
} from "@/lib/local/database";
import { isLocalFirstMode } from "@/lib/local/mode";
import { updatePieceSchema } from "@/lib/schemas-pieces";
import { toErrorResponse } from "@/lib/errors";
import { enrichScriptFromText } from "@/lib/screenplay/enrich";
import { mergeScriptIntoBible } from "@/lib/screenplay/bibleSync";
import type { SessionUser } from "@/lib/auth";
import type { Piece } from "@/lib/db";

const notFound = () =>
  NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });

/**
 * Load a piece the caller is allowed to touch, or null. The piece must be owned
 * by the caller AND live in a campaign within the caller's workspace. Anything
 * else (other user, other workspace, nonexistent) → null, surfaced as 404 so we
 * never reveal that the row exists.
 */
async function resolvePiece(id: string, user: SessionUser): Promise<Piece | null> {
  if (isLocalFirstMode()) return getLocalPiece(id, user.id, user.workspaceId) as Piece | null;
  const piece = await db.query.pieces.findFirst({
    where: and(eq(pieces.id, id), eq(pieces.userId, user.id)),
  });
  if (!piece) return null;
  if (!user.workspaceId) return null;

  const campaign = await db.query.campaigns.findFirst({
    where: and(eq(campaigns.id, piece.campaignId), eq(campaigns.workspaceId, user.workspaceId)),
  });
  if (!campaign) return null;

  return piece;
}

// GET /api/pieces/[id] — full piece (incl. packet/revision/outputs/outputOrder).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const piece = await resolvePiece(id, user);
    if (!piece) return notFound();

    return NextResponse.json({ piece });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// PATCH /api/pieces/[id] — update title / original / status.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await resolvePiece(id, user);
    if (!existing) return notFound();

    const body = updatePieceSchema.parse(await req.json());

    // gateNotes is shallow-merged into the stored map (so notes on different
    // gates accumulate); empty-string values clear that gate's note.
    let mergedNotes: Record<string, string> | undefined;
    if (body.gateNotes !== undefined) {
      const current = (existing.gateNotes as Record<string, string> | null) ?? {};
      mergedNotes = { ...current };
      for (const [k, v] of Object.entries(body.gateNotes)) {
        if ((v ?? "").trim()) mergedNotes[k] = v;
        else delete mergedNotes[k];
      }
    }

    const enrichment = body.original !== undefined ? enrichScriptFromText(body.original) : null;

    async function syncBibleFromScript(campaignId: string) {
      if (!enrichment || (!enrichment.characters.length && !enrichment.locations.length)) return;
      if (isLocalFirstMode()) {
        const ref = getLocalReferences(campaignId, user.workspaceId);
        if (!ref) return;
        const sync = mergeScriptIntoBible(ref.doc, enrichment.characters, enrichment.locations);
        if (sync) updateLocalReferences(campaignId, { patch: sync.patch }, user.workspaceId);
        return;
      }
      const ref = await db.query.references.findFirst({
        where: eq(references.campaignId, campaignId),
      });
      if (!ref) return;
      const sync = mergeScriptIntoBible(ref.doc as Record<string, unknown>, enrichment.characters, enrichment.locations);
      if (!sync) return;
      await db
        .update(references)
        .set({
          doc: { ...(ref.doc as Record<string, unknown>), ...sync.patch },
          updatedAt: new Date(),
        })
        .where(eq(references.campaignId, campaignId));
    }

    if (isLocalFirstMode()) {
      const piece = updateLocalPiece(
        existing.id,
        user.id,
        {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.original !== undefined ? { original: body.original } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.direction !== undefined ? { direction: body.direction } : {}),
          ...(mergedNotes !== undefined ? { gateNotes: mergedNotes } : {}),
          ...(enrichment
            ? {
                pageEstimate: enrichment.pageEstimate,
                sceneCount: enrichment.sceneCount,
                parsedScenes: enrichment.parsedScenes,
              }
            : {}),
        },
        user.workspaceId,
      );
      if (!piece) return notFound();
      if (enrichment) await syncBibleFromScript(existing.campaignId);
      return NextResponse.json({ piece });
    }

    const [piece] = await db
      .update(pieces)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.original !== undefined ? { original: body.original } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.direction !== undefined ? { direction: body.direction } : {}),
        ...(mergedNotes !== undefined ? { gateNotes: mergedNotes } : {}),
        ...(enrichment
          ? {
              pageEstimate: enrichment.pageEstimate,
              sceneCount: enrichment.sceneCount,
              parsedScenes: enrichment.parsedScenes,
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(pieces.id, existing.id), eq(pieces.userId, user.id)))
      .returning();

    if (enrichment) await syncBibleFromScript(existing.campaignId);
    return NextResponse.json({ piece });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// DELETE /api/pieces/[id].
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await resolvePiece(id, user);
    if (!existing) return notFound();

    if (isLocalFirstMode()) {
      deleteLocalPiece(existing.id, user.id, user.workspaceId);
      return NextResponse.json({ ok: true });
    }

    await db.delete(pieces).where(and(eq(pieces.id, existing.id), eq(pieces.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
