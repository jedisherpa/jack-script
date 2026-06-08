import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { db, campaigns, pieces, references } from "@/lib/db";
import { getLocalPiece, getLocalReferences, updateLocalPiece } from "@/lib/local/database";
import { isLocalFirstMode } from "@/lib/local/mode";
import { toErrorResponse } from "@/lib/errors";
import {
  createInitialProduction,
  initAnimaticForPiece,
  initStoryboardForPiece,
  normalizeProduction,
  syncProductionStages,
} from "@/lib/production";

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

    if (!existing.original?.trim()) {
      return NextResponse.json({ error: "Write and save a script first.", code: "bad_request" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as { withAnimatic?: boolean };
    let visualLanguage = "";
    if (isLocalFirstMode()) {
      const ref = getLocalReferences(existing.campaignId, user.workspaceId);
      visualLanguage = String((ref?.doc as { visualLanguage?: string })?.visualLanguage || "");
    } else {
      const ref = await db.query.references.findFirst({
        where: eq(references.campaignId, existing.campaignId),
      });
      visualLanguage = String((ref?.doc as { visualLanguage?: string })?.visualLanguage || "");
    }

    let production = syncProductionStages(
      normalizeProduction((existing as { production?: unknown }).production ?? createInitialProduction()),
      existing.original,
    );
    production = initStoryboardForPiece(production, existing.original, visualLanguage);
    if (body.withAnimatic !== false) {
      production = initAnimaticForPiece(production, existing.original);
    }

    if (isLocalFirstMode()) {
      const piece = updateLocalPiece(id, user.id, { production }, user.workspaceId);
      if (!piece) return notFound();
      return NextResponse.json({ production, piece });
    }

    const [piece] = await db
      .update(pieces)
      .set({ production, updatedAt: new Date() })
      .where(and(eq(pieces.id, id), eq(pieces.userId, user.id)))
      .returning();

    return NextResponse.json({ production, piece });
  } catch (err) {
    return toErrorResponse(err);
  }
}