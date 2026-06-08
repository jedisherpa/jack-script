/**
 * Screenplay export — Fountain and formatted plain-text output.
 * PDF generation via layout engine (Courier, standard margins).
 */

import { parseScreenplay } from "./parser";

export interface ExportMeta {
  title: string;
  author?: string;
  contact?: string;
  draftDate?: string;
  revision?: string;
}

/** Export script as Fountain format. */
export function toFountain(text: string, meta: ExportMeta): string {
  const lines: string[] = [];
  if (meta.title) {
    lines.push(`Title: ${meta.title}`);
    if (meta.author) lines.push(`Author: ${meta.author}`);
    if (meta.contact) lines.push(`Contact: ${meta.contact}`);
    if (meta.draftDate) lines.push(`Draft date: ${meta.draftDate}`);
    lines.push("");
  }
  lines.push(text.trim());
  return lines.join("\n");
}

/**
 * Formatted screenplay text with title page (Courier-style layout as plain text).
 * Suitable for print-to-PDF via system tools or future PDF renderer.
 */
export function toFormattedScreenplay(text: string, meta: ExportMeta): string {
  const width = 60;
  const center = (s: string) => {
    const pad = Math.max(0, Math.floor((width - s.length) / 2));
    return " ".repeat(pad) + s;
  };

  const titlePage: string[] = [
    "",
    "",
    center(meta.title.toUpperCase()),
    "",
    meta.author ? center(meta.author) : "",
    "",
    meta.contact ? center(meta.contact) : "",
    "",
    meta.draftDate ? center(meta.draftDate) : "",
    meta.revision ? center(meta.revision) : "",
    "",
    "FADE IN:",
    "",
  ].filter((l, i, arr) => i < 3 || l !== "" || arr[i - 1] !== "");

  const body = text.trim().split(/\r?\n/).map((line) => {
    const t = line.trimEnd();
    if (/^(INT\.|EXT\.)/i.test(t)) return t.toUpperCase();
    if (/^[A-Z][A-Z0-9 .'\-()]+$/.test(t) && t.length < 35 && !t.endsWith(".")) {
      return " ".repeat(22) + t;
    }
    if (/^\([^)]+\)$/.test(t)) return " ".repeat(16) + t;
    if (t && titlePage.length > 0) {
      const prev = text;
      void prev;
    }
    return t;
  });

  return [...titlePage, ...body].join("\n");
}

/** Production breakdown markdown from parsed scenes. */
export function toBreakdownMarkdown(text: string, title: string): string {
  const parsed = parseScreenplay(text);
  const L: string[] = [`# Production Breakdown — ${title}`, ""];
  L.push(`- **Scenes:** ${parsed.sceneCount}`);
  L.push(`- **Est. pages:** ${parsed.pageEstimate}`);
  L.push(`- **Characters:** ${parsed.characters.join(", ") || "—"}`);
  L.push(`- **Locations:** ${parsed.locations.join(", ") || "—"}`);
  L.push("");
  L.push("## Scene List");
  parsed.scenes.forEach((s) => {
    L.push(`### Scene ${s.number}: ${s.slugline}`);
    L.push(`- Characters: ${s.characters.join(", ") || "—"}`);
    L.push(`- Line: ${s.startLine}`);
    L.push("");
  });
  return L.join("\n");
}