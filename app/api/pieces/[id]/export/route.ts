import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { db, campaigns, pieces } from "@/lib/db";
import { getLocalPiece } from "@/lib/local/database";
import { isLocalFirstMode } from "@/lib/local/mode";
import { toErrorResponse } from "@/lib/errors";
import { toFountain, toBreakdownMarkdown, toFormattedScreenplay } from "@/lib/screenplay/export";
import { textToFdx } from "@/lib/screenplay/fdx";
import { toScreenplayPdf } from "@/lib/screenplay/pdf";

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

function scriptText(piece: { original?: string | null; revision?: unknown }): string {
  const rev = piece.revision as { text?: string } | null;
  return rev?.text?.trim() || piece.original || "";
}

/**
 * GET /api/pieces/[id]/export?format=pdf|fountain|fdx|formatted|breakdown
 * Export a script in professional screenplay formats.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const piece = await resolvePiece(id, user);
    if (!piece) return notFound();

    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "fountain").toLowerCase();
    const text = scriptText(piece);
    const meta = {
      title: piece.title,
      author: url.searchParams.get("author") || undefined,
      contact: url.searchParams.get("contact") || undefined,
      draftDate: url.searchParams.get("date") || new Date().toISOString().slice(0, 10),
      revision: piece.status === "Revised" ? "REVISED DRAFT" : undefined,
    };
    const safeName = piece.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80) || "script";

    if (format === "pdf") {
      const buf = await toScreenplayPdf(text, meta);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        },
      });
    }

    if (format === "fdx") {
      const xml = textToFdx(text, meta.title);
      return new NextResponse(xml, {
        headers: {
          "Content-Type": "application/xml",
          "Content-Disposition": `attachment; filename="${safeName}.fdx"`,
        },
      });
    }

    if (format === "formatted") {
      const body = toFormattedScreenplay(text, meta);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeName}.txt"`,
        },
      });
    }

    if (format === "breakdown") {
      const md = toBreakdownMarkdown(text, meta.title);
      return new NextResponse(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeName}_breakdown.md"`,
        },
      });
    }

    // default: fountain
    const fountain = toFountain(text, meta);
    return new NextResponse(fountain, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.fountain"`,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}