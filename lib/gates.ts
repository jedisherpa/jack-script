/**
 * Script Coverage Gates — seven sequential screenplay review passes.
 *
 * Each gate is a separate AI call returning structured JSON. The review route
 * persists piece.packet[gateId] incrementally after each gate completes.
 */
import type { AI } from "@/lib/llm";

export type Severity = "must" | "consider" | "note";

export type GateKind =
  | "format"
  | "character"
  | "dialogue"
  | "pacing"
  | "visual"
  | "theme"
  | "market";

export interface Finding {
  severity: Severity;
  title: string;
  detail: string;
  /** Verbatim phrase from the script, or null. */
  anchor: string | null;
  sceneRef?: string | null;
  category?: string | null;
  suggestion?: string | null;
  bibleAlignment?: string | null;
}

export interface Gate {
  id: GateKind;
  n: number;
  name: string;
  kind: GateKind;
  blurb: string;
  task: (draft: string) => string;
}

export type GateResult = Record<string, unknown> & { findings: Finding[] };

const FINDING_SHAPE =
  `Each finding: {"severity":"must"|"consider"|"note","title":"<=8 words","detail":"1-2 sentences","anchor":"<verbatim script phrase or null>","sceneRef":"<e.g. Scene 7A, approx line 42>","category":"<format|voice|dialogue|pacing|visual|theme|market>","suggestion":"<specific rewrite or direction>","bibleAlignment":"<how this helps or hurts Bible rules>"}. ` +
  `severity: "must" = Must-fix, "consider" = Consider, "note" = Note. Order findings by severity (must first). Aim for 2-5 findings.`;

export const PREAMBLE = (refCtx: string): string =>
`You are one gate in a professional script coverage system for a working screenwriter. You never recommend abandoning the script. You respect the writer's voice and craft. Be specific, film-literate, and constructive — you have a limited output budget, so prioritize the highest-impact notes.

PROJECT BIBLE (authoritative — cross-reference character voices, tone, themes, visual language, beat sheet):
${refCtx}

Use standard screenplay conventions: sluglines INT./EXT., present-tense action, ALL CAPS character cues, parentheticals for delivery only. Return ONLY valid JSON. No prose outside the JSON. No code fences.`;

export const GATES: Gate[] = [
  {
    id: "format", n: 1, name: "Format, Structure & Page Count", kind: "format",
    blurb: "Sluglines, scene balance, act breaks, runtime estimate.",
    task: (draft) =>
`TASK — Format, Structure & Page Count. Evaluate screenplay formatting and macro-structure: slugline correctness (INT./EXT., location, time of day), action vs dialogue balance, scene length outliers, act-break placement, estimated page count and runtime (~1 page ≈ 1 minute). Flag formatting errors that would fail a professional read.

Schema: {"summary":"1-2 sentences","estimatedPages":<number>,"estimatedRuntimeMinutes":<number>,"actNotes":"<act structure observations>","findings":[ ${FINDING_SHAPE} ]}

SCRIPT DRAFT:
"""${draft}"""`,
  },
  {
    id: "character", n: 2, name: "Character Voice & Consistency", kind: "character",
    blurb: "Bible voice alignment; flag drift across scenes.",
    task: (draft) =>
`TASK — Character Voice & Consistency. Cross-reference every speaking character against the Project Bible's character bios, voice notes, arcs, and sample dialogue. Flag voice drift, inconsistent diction, anachronistic speech, or characters who sound interchangeable. Note where a character's arc is under-served.

Schema: {"summary":"1-2 sentences","charactersPresent":["NAME",...],"voiceDrift":[{"character":"<name>","sceneRef":"<ref>","issue":"<observation>"}],"findings":[ ${FINDING_SHAPE} ]}

SCRIPT DRAFT:
"""${draft}"""`,
  },
  {
    id: "dialogue", n: 3, name: "Dialogue, Subtext & Naturalism", kind: "dialogue",
    blurb: "On-the-nose lines, subtext, speakability.",
    task: (draft) =>
`TASK — Dialogue, Subtext & Naturalism. Analyze ONLY dialogue and parentheticals. Flag on-the-nose exposition, weak subtext, unnatural speech rhythms, overwritten monologues, and lines that explain what the scene already shows. Suggest specific rewrites that preserve intent while deepening subtext.

Schema: {"summary":"1-2 sentences","speakabilityScore":<0-100>,"findings":[ ${FINDING_SHAPE} ]}

SCRIPT DRAFT:
"""${draft}"""`,
  },
  {
    id: "pacing", n: 4, name: "Pacing, Tension & Act Structure", kind: "pacing",
    blurb: "Stakes, momentum, midpoint, climax placement.",
    task: (draft) =>
`TASK — Pacing, Tension, Stakes & Act Structure. Evaluate dramatic momentum: inciting incident timing, rising stakes, midpoint turn, climax placement, and denouement length. Reference Save the Cat / three-act / hero's journey beats where relevant to the genre declared in the Bible. Flag sagging sequences and rushed payoffs.

Schema: {"summary":"1-2 sentences","beatMap":[{"beat":"<e.g. Midpoint>","sceneRef":"<ref>","assessment":"<strong|weak|missing>"}],"findings":[ ${FINDING_SHAPE} ]}

SCRIPT DRAFT:
"""${draft}"""`,
  },
  {
    id: "visual", n: 5, name: "Visual Storytelling & Cinematic Language", kind: "visual",
    blurb: "Show-don't-tell; action-line camera thinking.",
    task: (draft) =>
`TASK — Visual Storytelling, Show-Don't-Tell & Cinematic Language. Evaluate action lines for visual clarity, cinematic thinking, and show-don't-tell discipline. Flag unfilmable prose, camera-direction overreach, telling in action what dialogue should carry, and missed visual opportunities aligned with the Bible's visual_language section.

Schema: {"summary":"1-2 sentences","unfilmableCount":<number>,"findings":[ ${FINDING_SHAPE} ]}

SCRIPT DRAFT:
"""${draft}"""`,
  },
  {
    id: "theme", n: 6, name: "Theme, Emotional Arc & Resolution", kind: "theme",
    blurb: "Theme echoes, emotional throughline, ending resonance.",
    task: (draft) =>
`TASK — Theme, Emotional Arc, Theme Echoes & Resolution. Trace the central theme(s) from the Bible through the script. Flag weak theme echoes, emotional flatlines, unearned transformations, and endings that don't resonate with the opening image or stated themes.

Schema: {"summary":"1-2 sentences","themeEchoes":[{"theme":"<name>","sceneRef":"<ref>","strength":"strong|weak|absent"}],"findings":[ ${FINDING_SHAPE} ]}

SCRIPT DRAFT:
"""${draft}"""`,
  },
  {
    id: "market", n: 7, name: "Originality, Genre Fit & Commercial Viability", kind: "market",
    blurb: "High concept, twists, market positioning.",
    task: (draft) =>
`TASK — Originality, Market/Genre Fit, Twists, High Concept & Commercial Viability. Assess how the script positions in its declared genre and market. Identify the high-concept hook, freshness vs familiarity, twist effectiveness, and commercial strengths/risks. Be honest but never dismissive — suggest positioning pivots, not abandonment.

Schema: {"summary":"1-2 sentences","highConcept":"<one sentence>","genreFit":<0-100>,"comparableTitles":["<title>",...],"findings":[ ${FINDING_SHAPE} ]}

SCRIPT DRAFT:
"""${draft}"""`,
  },
];

export async function runGate(
  gate: Gate,
  draft: string,
  refCtx: string,
  ai: AI,
): Promise<GateResult> {
  const system = PREAMBLE(refCtx);
  const result = await ai.json<GateResult>(gate.task(draft), { system });
  result.findings = ((result.findings as Finding[] | undefined) || []).map((f) => ({
    severity: (["must", "consider", "note"] as const).includes(f.severity) ? f.severity : "note",
    title: f.title || "Finding",
    detail: f.detail || "",
    anchor: f.anchor || null,
    sceneRef: f.sceneRef || null,
    category: f.category || gate.kind,
    suggestion: f.suggestion || null,
    bibleAlignment: f.bibleAlignment || null,
  }));
  return result;
}

export const SEVERITY: Record<
  Severity,
  { label: string; varc: string; bg: string; rank: number }
> = {
  must: { label: "Must-fix", varc: "--sev-must", bg: "--sev-must-bg", rank: 0 },
  consider: { label: "Consider", varc: "--sev-consider", bg: "--sev-consider-bg", rank: 1 },
  note: { label: "Note", varc: "--sev-note", bg: "--sev-note-bg", rank: 2 },
};