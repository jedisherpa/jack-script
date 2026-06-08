/**
 * Professional screenplay PDF — Courier 12pt, standard margins.
 */
import PDFDocument from "pdfkit";
import { parseScreenplay } from "./parser";

export interface PdfMeta {
  title: string;
  author?: string;
  contact?: string;
  draftDate?: string;
  revision?: string;
}

const FONT = "Courier";
const PAGE_W = 612; // 8.5"
const PAGE_H = 792; // 11"
const MARGIN_L = 108; // 1.5"
const MARGIN_R = 72; // 1"
const MARGIN_T = 72;
const MARGIN_B = 72;
const ACTION_W = PAGE_W - MARGIN_L - MARGIN_R;
const DIALOGUE_X = 180;
const DIALOGUE_W = 216;
const CHARACTER_X = 288;
const PAREN_X = 216;
const LINE_H = 14;

type PdfBlock = { type: string; text: string };

function classifyForPdf(line: string, prev: string | null): string {
  const t = line.trim();
  if (!t) return "blank";
  if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i.test(t)) return "slugline";
  if (/^(CUT TO:|FADE IN:|FADE OUT\.|FADE TO BLACK\.)/i.test(t)) return "transition";
  if (/^\([^)]+\)$/.test(t)) return "parenthetical";
  if (/^[A-Z][A-Z0-9 .'\-()]{0,30}$/.test(t) && !t.endsWith(".") && t.length < 35) {
    if (prev === "slugline" || prev === "action" || prev === "transition") return "character";
  }
  if (prev === "character" || prev === "parenthetical") return "dialogue";
  return "action";
}

function toBlocks(text: string): PdfBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: PdfBlock[] = [];
  let prev: string | null = null;
  for (const line of lines) {
    const type = classifyForPdf(line, prev);
    if (type === "blank") { prev = null; continue; }
    blocks.push({ type, text: line.trim() });
    prev = type;
  }
  return blocks;
}

export function toScreenplayPdf(text: string, meta: PdfMeta): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margins: { top: MARGIN_T, bottom: MARGIN_B, left: MARGIN_L, right: MARGIN_R } });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font(FONT).fontSize(12);

    // Title page (WGA-style)
    doc.moveDown(10);
    doc.fontSize(14).text(meta.title.toUpperCase(), { align: "center" });
    doc.moveDown(3);
    if (meta.author) {
      doc.fontSize(12).text("written by", { align: "center" });
      doc.moveDown(0.8);
      doc.text(meta.author, { align: "center" });
    }
    if (meta.contact) {
      doc.moveDown(4);
      const contactLines = meta.contact.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      contactLines.forEach((line) => doc.fontSize(11).text(line, { align: "center" }));
    }
    if (meta.draftDate || meta.revision) {
      doc.moveDown(2);
      if (meta.draftDate) doc.fontSize(10).text(meta.draftDate, { align: "center" });
      if (meta.revision) {
        doc.moveDown(0.4);
        doc.fontSize(10).fillColor("#8B0000").text(meta.revision, { align: "center" });
        doc.fillColor("black");
      }
    }
    doc.addPage();

    let y = MARGIN_T;

    const ensureSpace = (needed = LINE_H) => {
      if (y + needed > PAGE_H - MARGIN_B) {
        doc.addPage();
        y = MARGIN_T;
      }
    };

    const writeLine = (x: number, w: number, t: string, opts?: { uppercase?: boolean }) => {
      ensureSpace();
      const content = opts?.uppercase ? t.toUpperCase() : t;
      doc.text(content, x, y, { width: w, lineBreak: true });
      y = doc.y + 4;
    };

    writeLine(MARGIN_L, ACTION_W, "FADE IN:", { uppercase: true });
    y += 8;

    const blocks = toBlocks(text);
    for (const b of blocks) {
      switch (b.type) {
        case "slugline":
          y += 8;
          writeLine(MARGIN_L, ACTION_W, b.text, { uppercase: true });
          break;
        case "character":
          y += 8;
          writeLine(CHARACTER_X, ACTION_W - CHARACTER_X + MARGIN_L, b.text, { uppercase: true });
          break;
        case "parenthetical":
          writeLine(PAREN_X, DIALOGUE_W, b.text);
          break;
        case "dialogue":
          writeLine(DIALOGUE_X, DIALOGUE_W, b.text);
          break;
        case "transition":
          writeLine(PAGE_W - MARGIN_R - 120, 120, b.text, { uppercase: true });
          break;
        default:
          writeLine(MARGIN_L, ACTION_W, b.text);
      }
    }

    const range = doc.bufferedPageRange();
    for (let i = range.start + 1; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(10).text(String(i - range.start), PAGE_W / 2 - 10, PAGE_H - 48, { lineBreak: false });
    }

    doc.end();
  });
}

export function pdfPageEstimate(text: string): number {
  return parseScreenplay(text).pageEstimate;
}