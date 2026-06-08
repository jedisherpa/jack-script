import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { db, campaigns, pieces } from "@/lib/db";
import { getLocalPiece, updateLocalPiece } from "@/lib/local/database";
import { isLocalFirstMode } from "@/lib/local/mode";
import { toErrorResponse } from "@/lib/errors";
import {
  createInitialProduction,
  normalizeProduction,
  syncProductionStages,
} from "@/lib/production";
import { patchProductionSchema } from "@/lib/schemas-production";

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

function getProduction(piece: { production?: unknown }) {
  return syncProductionStages(
    normalizeProduction(piece.production ?? createInitialProduction()),
    (piece as { original?: string }).original || "",
  );
}

async function saveProduction(
  pieceId: string,
  user: SessionUser,
  production: ReturnType<typeof syncProductionStages>,
  existing: { original: string },
) {
  if (isLocalFirstMode()) {
    const updated = updateLocalPiece(pieceId, user.id, { production }, user.workspaceId);
    if (!updated) return null;
    return updated;
  }

  const [row] = await db
    .update(pieces)
    .set({ production, updatedAt: new Date() })
    .where(and(eq(pieces.id, pieceId), eq(pieces.userId, user.id)))
    .returning();

  return row ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const piece = await resolvePiece(id, user);
    if (!piece) return notFound();

    const production = getProduction(piece as { production?: unknown; original?: string });
    return NextResponse.json({ production, piece: { id: piece.id, title: piece.title, original: piece.original } });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await resolvePiece(id, user);
    if (!existing) return notFound();

    const body = patchProductionSchema.parse(await req.json());
    let production = getProduction(existing as { production?: unknown; original?: string });

    if (body.brief) production.brief = { ...production.brief, ...body.brief };
    if (body.audio) production.audio = { ...production.audio, ...body.audio };
    if (body.storyboard) {
      production.storyboard = body.storyboard.map((f) => ({
        ...f,
        mediaJobId: f.mediaJobId ?? null,
      }));
    }
    if (body.animatic) production.animatic = { ...production.animatic, ...body.animatic };
    if (body.currentStage) production.currentStage = body.currentStage;

    production = syncProductionStages(production, existing.original);

    const saved = await saveProduction(id, user, production, existing);
    if (!saved) return notFound();

    return NextResponse.json({ production, piece: saved });
  } catch (err) {
    return toErrorResponse(err);
  }
}