/**
 * Proposed Revision — VERBATIM port of
 * prototype-reference/generators.js#generateRevision (+ chunkText, parseDelimited).
 *
 * Applies ONLY clarity, tone, and inoculation (screenshot-test) findings.
 * Strategy / audience / rigor / identity findings stay in the report — this is
 * the FIREWALL: only the clarity/tone/stress-screenshot slices of the packet may
 * inform the revision. The pure functions here (chunkText, parseDelimited,
 * collectFirewallFindings, buildFindingsBlock, REVISION_SYSTEM) take no database
 * and no network, so they are unit-testable with a fake AI.
 *
 * Parity notes:
 *  - chunkText: ≤260 words, paragraph split then sentence split, ported verbatim.
 *  - DELIMITER format @@REVISION@@ / @@CHANGELOG@@ / @@END@@ + parseDelimited,
 *    changelog finding ids C#/T#/I#, ported verbatim.
 *  - The system prompt is byte-identical to the prototype.
 *  - Each passage is processed in its own call so no single call exceeds the
 *    output budget; on a failed passage the original chunk is kept.
 *  - Output uses DATA_MODEL field name "text" (not the prototype's "revision"
 *    key): the route persists revision = { text, changelog }.
 */

import type { AI } from "@/lib/llm";

/* ------------------------------------------------------------------ *
 * Packet shapes (the FIREWALL inputs). Every field optional/guarded — the
 * prototype reads them with `|| []` truthiness checks.
 * ------------------------------------------------------------------ */

export type Severity = "must" | "consider" | "note";

export interface GateFinding {
  severity: Severity;
  title: string;
  detail: string;
  anchor?: string | null;
}

export interface ScreenshotTest {
  quote: string;
  misread?: string;
  inoculation: string;
}

export interface GateResult {
  summary?: string;
  findings?: GateFinding[];
  screenshotTests?: ScreenshotTest[];
}

/**
 * The packet the reviser may read. There are two passes:
 *  - LIGHT (default): collectFirewallFindings()/buildFindingsBlock() read ONLY
 *    clarity, tone, and stress.screenshotTests — the FIREWALL. strategy /
 *    audience / rigor / self never inform this pass.
 *  - FULL (opt-in): a preceding restructure step (buildFullFindingsBlock /
 *    restructureDraft) ALSO applies strategy / audience / rigor / self and may
 *    reorganize the document; the light pass then polishes the result.
 * The firewall for the light pass is enforced in those functions and in
 * REVISION_SYSTEM — not by this type.
 */
export interface RevisionPacket {
  format?: GateResult;
  character?: GateResult;
  dialogue?: GateResult;
  pacing?: GateResult;
  visual?: GateResult;
  theme?: GateResult;
  market?: GateResult;
}

export interface RevisionPieceInput {
  original?: string;
  packet?: RevisionPacket | null;
  // The author's explicit guidance — overrides findings where they conflict (as
  // long as voice is preserved). gateNotes is keyed by gate id (all seven), so it
  // can carry intent for strategy/identity gates the firewall excludes from findings.
  gateNotes?: Record<string, string> | null;
  direction?: string | null;
}

const GATE_LABELS: Record<string, string> = {
  format: "Format & Structure", character: "Character Voice", dialogue: "Dialogue & Subtext",
  pacing: "Pacing & Acts", visual: "Visual Storytelling", theme: "Theme & Arc", market: "Market & Originality",
};

/** Build the author-guidance blocks (creative direction + per-gate commentary). */
export function buildGuidance(piece: RevisionPieceInput): { direction: string; notesBlock: string; hasGuidance: boolean } {
  const noteEntries = Object.entries(piece.gateNotes ?? {}).filter(([, v]) => (v || "").trim());
  const notesBlock = noteEntries.map(([id, v]) => `• ${GATE_LABELS[id] ?? id}: ${(v as string).trim()}`).join("\n");
  const direction = (piece.direction ?? "").trim();
  return { direction, notesBlock, hasGuidance: !!direction || !!notesBlock };
}

export interface ChangelogEntry {
  finding: string;
  change: string;
  note: string;
}

export interface RevisionResult {
  text: string;
  changelog: ChangelogEntry[];
}

export type OnProgress = (done: number, total: number) => void;

/* ------------------------------------------------------------------ *
 * chunkText — VERBATIM from generators.js
 * ------------------------------------------------------------------ */

export function chunkText(text: string, maxWords = 260): string[] {
  const paras = (text || "").split(/\n{2,}/);
  const chunks: string[] = [];
  let cur: string[] = [];
  let curW = 0;
  const flush = () => {
    if (cur.length) {
      chunks.push(cur.join("\n\n"));
      cur = [];
      curW = 0;
    }
  };
  const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  for (const p of paras) {
    const w = wc(p);
    if (w > maxWords) {
      flush();
      const sents = p.match(/[^.!?]+[.!?]+[\s"”’)]*|[^.!?]+$/g) || [p];
      let sc: string[] = [];
      let scw = 0;
      for (const s of sents) {
        const sw = wc(s);
        if (scw + sw > maxWords && sc.length) {
          chunks.push(sc.join("").trim());
          sc = [];
          scw = 0;
        }
        sc.push(s);
        scw += sw;
      }
      if (sc.length) chunks.push(sc.join("").trim());
    } else if (curW + w > maxWords && cur.length) {
      flush();
      cur.push(p);
      curW = w;
    } else {
      cur.push(p);
      curW += w;
    }
  }
  flush();
  return chunks.length ? chunks : [text || ""];
}

/* ------------------------------------------------------------------ *
 * parseDelimited — VERBATIM from generators.js
 * ------------------------------------------------------------------ */

/** Light-pass finding ids: D# dialogue, V# character voice. */
const DEFAULT_ID_RE = /^\[?\s*([DV]\s*\d+)\s*\]?/i;
/** Full-pass restructure ids: F/P/L/H/M/STRUCT. */
const RESTRUCTURE_ID_RE = /^\[\s*([A-Za-z0-9]{1,12})\s*\]/;

export function parseDelimited(
  out: string,
  idRegex: RegExp = DEFAULT_ID_RE,
): { revision: string; changelog: ChangelogEntry[] } {
  let body = out || "";
  let changelog: ChangelogEntry[] = [];
  const rev = (out || "").split(/@@\s*REVISION\s*@@/i);
  if (rev.length > 1) {
    const after = rev[1].split(/@@\s*CHANGELOG\s*@@/i);
    body = after[0];
    const cl = (after[1] || "").split(/@@\s*END\s*@@/i)[0];
    changelog = cl
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => /^[-•]/.test(l))
      .map((l) => {
        l = l.replace(/^[-•]\s*/, "");
        let finding = "—";
        const idm = l.match(idRegex);
        if (idm) {
          finding = idm[1].replace(/\s+/g, "").toUpperCase();
          l = l.slice(idm[0].length);
        }
        l = l.replace(/^\s*\[[^\]]*\]\s*/, ""); // drop an optional [severity] tag
        const parts = l.split(/\s*::\s*/);
        return {
          finding,
          change: (parts[0] || "").replace(/^[—:\-\s]+/, "").trim(),
          note: (parts[1] || "").trim(),
        };
      })
      .filter((c) => c.change);
  }
  body = body
    .replace(/@@\s*END\s*@@[\s\S]*$/i, "")
    .replace(/@@\s*CHANGELOG\s*@@[\s\S]*$/i, "")
    .trim();
  return { revision: body, changelog };
}

/* ------------------------------------------------------------------ *
 * FIREWALL — only clarity / tone / inoculation findings may pass.
 * collectFirewallFindings reads ONLY packet.clarity, packet.tone, and
 * packet.stress.screenshotTests; it can never see strategy/audience/rigor/self.
 * ------------------------------------------------------------------ */

export function collectFirewallFindings(packet: RevisionPacket | null | undefined) {
  const p = packet || {};
  const dialogue = (p.dialogue && p.dialogue.findings) || [];
  const character = (p.character && p.character.findings) || [];
  return { dialogue, character };
}

export function buildFindingsBlock(packet: RevisionPacket | null | undefined): string {
  const { dialogue, character } = collectFirewallFindings(packet);
  return [
    "DIALOGUE FINDINGS:",
    ...dialogue.map(
      (f, i) =>
        `D${i + 1} [${f.severity}] ${f.title} — ${f.detail}${f.anchor ? ` (re: "${f.anchor}")` : ""}`,
    ),
    "\nCHARACTER VOICE FINDINGS:",
    ...character.map(
      (f, i) =>
        `V${i + 1} [${f.severity}] ${f.title} — ${f.detail}${f.anchor ? ` (re: "${f.anchor}")` : ""}`,
    ),
  ].join("\n");
}

/* ------------------------------------------------------------------ *
 * FULL pass — the restructure step. Reads the dimensions the firewall
 * excludes (strategy / audience / rigor / self) and may reorganize the
 * whole document. Runs BEFORE the light per-passage pass when mode:"full".
 * ------------------------------------------------------------------ */

/** [gate key, changelog id prefix, label] for the dimensions the restructure applies. */
const FULL_GATES: Array<[keyof RevisionPacket, string, string]> = [
  ["format", "F", "FORMAT & STRUCTURE"],
  ["pacing", "P", "PACING & ACT STRUCTURE"],
  ["visual", "L", "VISUAL STORYTELLING"],
  ["theme", "H", "THEME & EMOTIONAL ARC"],
  ["market", "M", "MARKET & POSITIONING"],
];

export function buildFullFindingsBlock(packet: RevisionPacket | null | undefined): string {
  const p = (packet || {}) as Record<string, GateResult | undefined>;
  const blocks: string[] = [];
  for (const [key, prefix, label] of FULL_GATES) {
    const findings = (p[key as string] && p[key as string]!.findings) || [];
    blocks.push(`${label} FINDINGS:`);
    findings.forEach((f, i) =>
      blocks.push(`${prefix}${i + 1} [${f.severity}] ${f.title} — ${f.detail}${f.anchor ? ` (re: "${f.anchor}")` : ""}`),
    );
  }
  return blocks.join("\n");
}

export function RESTRUCTURE_SYSTEM(refCtx: string, guidance?: { direction: string; notesBlock: string; hasGuidance: boolean }): string {
  const g = guidance ?? { direction: "", notesBlock: "", hasGuidance: false };
  const eClause = g.hasGuidance
    ? `\n(f) HONOR THE AUTHOR'S DIRECTION & SECTION COMMENTARY below — they govern the approach and emphasis and take precedence over the findings where they conflict. When a change is driven by author guidance (not a finding), tag its changelog line [DIR].`
    : "";
  const directionBlock = g.direction ? `\n\nAUTHOR'S CREATIVE DIRECTION (apply throughout):\n${g.direction}` : "";
  const notesBlock = g.notesBlock ? `\n\nAUTHOR COMMENTARY BY REVIEW SECTION (apply where relevant):\n${g.notesBlock}` : "";
  return `You are the structural script doctor for a working screenwriter. You revise the WHOLE screenplay at once. Your job is FORMAT, PACING, VISUAL STORYTELLING, THEME, and MARKET POSITIONING — not line-level dialogue polish (dialogue and character voice are applied in a later pass).
(a) You MAY reorganize: reorder, merge, split, or add/cut scenes; sharpen act breaks and dramatic momentum;
(b) apply the format, pacing, visual, theme, and market findings below;
(c) PRESERVE the writer's VOICE — keep distinctive lines verbatim; never flatten character voices;
(d) do NOT invent plot points, characters, or facts not implied by the draft or Project Bible;
(e) if the structure is already sound, return it unchanged with an empty changelog.${eClause}

PROJECT BIBLE:
${refCtx}${directionBlock}${notesBlock}

Return EXACTLY this format and NOTHING else (no JSON, no preamble):
@@REVISION@@
<the restructured screenplay; preserve sluglines, character cues, and screenplay formatting>
@@CHANGELOG@@
- [id] what changed :: short why (include scene ref when possible)
@@END@@
(One line per structural change. id like [F1] format, [P1] pacing, [L1] visual, [H1] theme, [M1] market, or [STRUCT]. Omit if nothing changed.)`;
}

/**
 * restructureDraft — the FULL pass's first step: one whole-document call that
 * applies strategy/audience/rigor/self and may reorganize the piece. Returns the
 * restructured text + a structural changelog. On failure the caller falls back
 * to the original text (light pass only).
 */
export async function restructureDraft(
  piece: RevisionPieceInput,
  refCtx: string,
  ai: AI,
): Promise<{ text: string; changelog: ChangelogEntry[] }> {
  const system = RESTRUCTURE_SYSTEM(refCtx, buildGuidance(piece));
  const prompt = `STRUCTURAL COVERAGE FINDINGS — apply these and improve the screenplay's structure (dialogue and character voice are handled in a later polishing pass):
${buildFullFindingsBlock(piece.packet || {})}

FULL SCRIPT DRAFT:
"""${piece.original || ""}"""

Return the delimited format now.`;
  const out = await ai.text(prompt, { system });
  const parsed = parseDelimited(out, RESTRUCTURE_ID_RE);
  return { text: parsed.revision, changelog: parsed.changelog };
}

/* ------------------------------------------------------------------ *
 * System prompt — byte-identical to generators.js (refCtx interpolated).
 * ------------------------------------------------------------------ */

export function REVISION_SYSTEM(refCtx: string, guidance?: { direction: string; notesBlock: string; hasGuidance: boolean }): string {
  const g = guidance ?? { direction: "", notesBlock: "", hasGuidance: false };
  const eClause = g.hasGuidance
    ? `\n(e) HONOR THE AUTHOR'S DIRECTION & SECTION COMMENTARY below — they govern the approach, emphasis, and tone of the rewrite and take precedence over the findings where they conflict, as long as you stay in the author's voice. When a change is driven by author guidance (not a finding), tag its changelog line [DIR].`
    : "";
  const directionBlock = g.direction ? `\n\nAUTHOR'S CREATIVE DIRECTION (apply throughout):\n${g.direction}` : "";
  const notesBlock = g.notesBlock ? `\n\nAUTHOR COMMENTARY BY REVIEW SECTION (the author's specific notes on each gate — apply where relevant to this passage):\n${g.notesBlock}` : "";
  return `You are the dialogue reviser for a working screenwriter. You revise ONE PASSAGE of a longer screenplay at a time. For the passage you are given:
(a) PRESERVE screenplay formatting (sluglines, character cues, parentheticals);
(b) apply ONLY the dialogue and character-voice findings relevant to THIS passage — do NOT restructure acts or scenes;
(c) where a finding would flatten a distinctive line, the WRITER'S LINE WINS — keep it verbatim;
(d) make the smallest changes that satisfy the findings; reference scenes in changelog when possible.${eClause}

PROJECT BIBLE:
${refCtx}${directionBlock}${notesBlock}

Return EXACTLY this format and NOTHING else (no JSON, no preamble):
@@REVISION@@
<the revised passage; preserve screenplay block structure>
@@CHANGELOG@@
- [findingId] what changed :: short why (scene ref if known)
@@END@@
(One changelog line per change. findingId is D# (dialogue) or V# (voice). Omit if nothing changed.)`;
}

/* ------------------------------------------------------------------ *
 * generateRevision — VERBATIM port of generators.js#generateRevision.
 * Pure: takes (piece, refCtx, ai, onProgress). No db, no network beyond `ai`.
 * Returns { text, changelog } (DATA_MODEL field name "text").
 * ------------------------------------------------------------------ */

export interface RevisionOptions {
  /** "light" (default): firewall pass only. "full": restructure (strategy /
   *  audience / rigor / self + reorganization) THEN the firewall polish pass. */
  mode?: "light" | "full";
}

export async function generateRevision(
  piece: RevisionPieceInput,
  refCtx: string,
  ai: AI,
  onProgress?: OnProgress,
  opts?: RevisionOptions,
): Promise<RevisionResult> {
  const mode = opts?.mode === "full" ? "full" : "light";
  const packet = piece.packet || {};
  const findingsBlock = buildFindingsBlock(packet);
  const system = REVISION_SYSTEM(refCtx, buildGuidance(piece));

  // FULL mode: a whole-document restructure pass first (strategy/structure/etc.),
  // then the per-passage firewall polish runs over the restructured text.
  let baseText = piece.original || "";
  let preChangelog: ChangelogEntry[] = [];
  if (mode === "full") {
    try {
      const r = await restructureDraft(piece, refCtx, ai);
      if (r.text && r.text.trim().length > 2) baseText = r.text;
      preChangelog = r.changelog;
    } catch (e) {
      console.warn("Restructure pass failed; falling back to per-passage polish only:", e);
    }
  }

  const chunks = chunkText(baseText, 260);
  const revisions: string[] = [];
  let changelog: ChangelogEntry[] = preChangelog.slice();
  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) onProgress(i, chunks.length);
    const prompt = `FINDINGS AVAILABLE (apply only those relevant to this passage):
${findingsBlock}

PASSAGE ${i + 1} OF ${chunks.length}:
"""${chunks[i]}"""

Return the delimited format now.`;
    try {
      const out = await ai.text(prompt, { system });
      const parsed = parseDelimited(out);
      revisions.push(parsed.revision && parsed.revision.length > 2 ? parsed.revision : chunks[i]);
      changelog = changelog.concat(parsed.changelog);
    } catch (e) {
      console.warn("Revision passage failed, keeping original:", i, e);
      revisions.push(chunks[i]);
    }
  }
  if (onProgress) onProgress(chunks.length, chunks.length);
  return { text: revisions.join("\n\n"), changelog };
}
