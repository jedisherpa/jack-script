/**
 * buildRefContext — injects the Project Bible into every AI call.
 *
 * Intelligently surfaces logline, characters, tone, visual language, beats,
 * and world rules for gate-specific analysis. Legacy editorial keys are still
 * read if present (migration compatibility from Pillar Press data).
 */

export interface BibleCharacter {
  name: string;
  bio?: string;
  voice?: string;
  arc?: string;
  relationships?: string;
  sampleDialogue?: string;
}

export interface BibleLocation {
  name: string;
  description?: string;
  mood?: string;
}

export interface ReferencesDoc {
  logline?: string;
  synopsis?: string;
  genre?: string;
  toneBible?: string;
  visualLanguage?: string;
  beatSheet?: string;
  worldRules?: string | readonly string[];
  themes?: readonly string[];
  characters?: readonly BibleCharacter[];
  locations?: readonly BibleLocation[];
  competitorReferences?: readonly string[];
  /** Legacy Pillar Press keys — still rendered if Bible sections absent */
  strategy?: {
    throughlines?: Array<{ tag: string; name: string; note: string }>;
    body?: string;
  };
  audiences?: { list?: Array<{ id: string; name: string; note: string }> };
  registers?: {
    list?: Array<{ id: string; name: string; note: string }>;
    body?: string;
  };
  voiceRules?: { rules?: readonly string[] };
  redLines?: { rules?: readonly string[] };
  selfVision?: { body?: string };
  gateSpec?: { body?: string };
  [key: string]: unknown;
}

export type RefContextSections = {
  characters?: boolean;
  visual?: boolean;
  beats?: boolean;
  tone?: boolean;
  market?: boolean;
};

export function buildRefContext(
  references?: ReferencesDoc | null,
  sections?: RefContextSections,
): string {
  const r: ReferencesDoc = references || {};
  const lines: string[] = [];
  const all = !sections;

  if (r.logline) lines.push(`LOGLINE:\n${r.logline}`);
  if (r.synopsis) lines.push(`\nSYNOPSIS:\n${r.synopsis}`);
  if (r.genre) lines.push(`\nGENRE: ${r.genre}`);
  if (all || sections?.tone) {
    if (r.toneBible) lines.push(`\nTONE BIBLE:\n${r.toneBible}`);
    if (r.themes?.length) {
      lines.push("\nTHEMES:");
      r.themes.forEach((t) => lines.push(`- ${t}`));
    }
  }
  if (all || sections?.characters) {
    if (r.characters?.length) {
      lines.push("\nCHARACTERS:");
      r.characters.forEach((c) => {
        lines.push(`\n• ${c.name}`);
        if (c.bio) lines.push(`  Bio: ${c.bio}`);
        if (c.voice) lines.push(`  Voice: ${c.voice}`);
        if (c.arc) lines.push(`  Arc: ${c.arc}`);
        if (c.relationships) lines.push(`  Relationships: ${c.relationships}`);
        if (c.sampleDialogue) lines.push(`  Sample dialogue: "${c.sampleDialogue}"`);
      });
    }
  }
  if (r.locations?.length) {
    lines.push("\nLOCATIONS:");
    r.locations.forEach((loc) => {
      lines.push(`- ${loc.name}${loc.mood ? ` (${loc.mood})` : ""}: ${loc.description || ""}`);
    });
  }
  if (all || sections?.visual) {
    if (r.visualLanguage) lines.push(`\nVISUAL LANGUAGE:\n${r.visualLanguage}`);
  }
  if (all || sections?.beats) {
    if (r.beatSheet) lines.push(`\nBEAT SHEET / OUTLINE:\n${r.beatSheet}`);
  }
  if (r.worldRules) {
    const rules = Array.isArray(r.worldRules) ? r.worldRules : [r.worldRules];
    lines.push("\nWORLD RULES:");
    rules.forEach((rule) => lines.push(`- ${rule}`));
  }
  if (all || sections?.market) {
    if (r.competitorReferences?.length) {
      lines.push("\nCOMPARABLE TITLES / REFERENCES:");
      r.competitorReferences.forEach((t) => lines.push(`- ${t}`));
    }
  }
  if (r.redLines?.rules?.length) {
    lines.push("\nRED LINES (never violate):");
    r.redLines.rules.forEach((x) => lines.push(`- ${x}`));
  }
  if (r.gateSpec?.body) lines.push(`\nCOVERAGE SPEC:\n${r.gateSpec.body}`);

  // Legacy editorial blocks for imported Pillar Press bibles
  if (r.strategy) {
    lines.push("\n[LEGACY] THROUGHLINES:");
    (r.strategy.throughlines || []).forEach((t) =>
      lines.push(`- [${t.tag}] ${t.name}: ${t.note}`),
    );
    if (r.strategy.body) lines.push("Strategy note: " + r.strategy.body);
  }
  if (r.audiences) {
    lines.push("\n[LEGACY] STAKEHOLDER AUDIENCES:");
    (r.audiences.list || []).forEach((a) =>
      lines.push(`- [${a.id}] ${a.name}: ${a.note}`),
    );
  }
  if (r.registers) {
    lines.push("\n[LEGACY] VOICE REGISTERS:");
    (r.registers.list || []).forEach((x) =>
      lines.push(`- [${x.id}] ${x.name}: ${x.note}`),
    );
    if (r.registers.body) lines.push(r.registers.body);
  }
  if (r.voiceRules?.rules?.length) {
    lines.push("\n[LEGACY] CLARITY RULES:");
    r.voiceRules.rules.forEach((x, i) => lines.push(`${i + 1}. ${x}`));
  }
  if (r.selfVision?.body) {
    lines.push("\n[LEGACY] WRITER IDENTITY:\n" + r.selfVision.body);
  }

  return lines.join("\n");
}

/** Gate-specific Bible injection for tighter prompts. */
export function buildGateRefContext(references: ReferencesDoc | null | undefined, gateId: string): string {
  switch (gateId) {
    case "character":
    case "dialogue":
      return buildRefContext(references, { characters: true, tone: true });
    case "visual":
      return buildRefContext(references, { visual: true, tone: true });
    case "pacing":
    case "theme":
      return buildRefContext(references, { beats: true, tone: true, characters: true });
    case "market":
      return buildRefContext(references, { market: true, tone: true });
    case "format":
    default:
      return buildRefContext(references);
  }
}