import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { db, campaigns, pieces } from "@/lib/db";
import { getLocalPiece, updateLocalPiece } from "@/lib/local/database";
import { isLocalFirstMode } from "@/lib/local/mode";
import { toErrorResponse } from "@/lib/errors";
import {
  approveProductionStage,
  createInitialProduction,
  normalizeProduction,
  syncProductionStages,
} from "@/lib/production";
import { approveProductionSchema } from "@/lib/schemas-production";

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

    const { stageId } = approveProductionSchema.parse(await req.json());
    const base = syncProductionStages(
      normalizeProduction((existing as { production?: unknown }).production ?? createInitialProduction()),
      existing.original,
    );
    const { state, error } = approveProductionStage(base, stageId, existing.original);
    if (error) {
      return NextResponse.json({ error, code: "gate_blocked", production: state }, { status: 400 });
    }

    if (isLocalFirstMode()) {
      const piece = updateLocalPiece(id, user.id, { production: state }, user.workspaceId);
      if (!piece) return notFound();
      return NextResponse.json({ production: state, piece });
    }

    const [piece] = await db
      .update(pieces)
      .set({ production: state, updatedAt: new Date() })
      .where(and(eq(pieces.id, id), eq(pieces.userId, user.id)))
      .returning();

    return NextResponse.json({ production: state, piece });
  } catch (err) {
    return toErrorResponse(err);
  }
}