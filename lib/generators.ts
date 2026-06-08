/**
 * Screenplay artifact generators — server port of the output-generation pattern
 * from Pillar Press, specialized for Jack Script deliverables.
 */
import type { AI } from "@/lib/llm";

export interface StakeholderPreset {
  id: string;
  name: string;
}

export const STAKEHOLDER_PRESETS: readonly StakeholderPreset[] = [
  { id: "studio_exec", name: "Studio Executive" },
  { id: "director", name: "Director" },
  { id: "lead_actor", name: "Lead Actor" },
  { id: "producer", name: "Producer" },
  { id: "festival", name: "Festival Programmer" },
  { id: "general", name: "General Reader" },
];

/** @deprecated Use STAKEHOLDER_PRESETS — kept for route compatibility */
export const AUDIENCE_PRESETS = STAKEHOLDER_PRESETS;

export interface Artifact {
  id: string;
  name: string;
  order: number;
  derivesFrom: string[];
  role: string;
}

/** Fixed generation order for screenplay deliverables. */
export const ARTIFACTS: readonly Artifact[] = [
  { id: "logline", name: "Logline", order: 1, derivesFrom: [],
    role: "Canonical hook. Short, medium, and high-concept variants from script + Bible." },
  { id: "one_page_synopsis", name: "One-Page Synopsis", order: 2, derivesFrom: ["logline"],
    role: "Single-page prose synopsis for buyers and contests." },
  { id: "full_treatment", name: "Full Treatment", order: 3, derivesFrom: ["one_page_synopsis"],
    role: "Sectioned treatment (8–15 pages prose) with act breaks." },
  { id: "pitch_deck_text", name: "Pitch Deck Text", order: 4, derivesFrom: ["logline", "one_page_synopsis"],
    role: "Slide-by-slide pitch deck copy (title, hook, comps, cast wishlist, look, ending)." },
  { id: "character_breakdowns", name: "Character Breakdowns", order: 5, derivesFrom: ["full_treatment"],
    role: "Casting-ready breakdowns merging Bible bios with script evidence." },
  { id: "scene_outline", name: "Scene Outline / Beat Sheet", order: 6, derivesFrom: ["full_treatment"],
    role: "Numbered scene list with sluglines, purpose, and stakes per scene." },
  { id: "production_breakdown", name: "Production Breakdown Notes", order: 7, derivesFrom: ["scene_outline"],
    role: "Locations, props, wardrobe, stunts, VFX flags per scene." },
  { id: "table_read_script", name: "Table Read Script", order: 8, derivesFrom: ["character_breakdowns"],
    role: "Dialogue-only script with character cues for table reads and audio." },
];

/** @deprecated Use ARTIFACTS — kept for route compatibility */
export const PLATFORMS = ARTIFACTS;

export interface ArtifactOutput {
  platform: string;
  selectedAudience: string;
  throughlineTag: string;
  strategicPurpose: string;
  draftPost: string;
  hooks: string[];
  ctas: string[];
  mediaRec: string;
  riskCheck: string;
  relatedOffering: string;
  followUp: string;
  _platform: string;
  _audienceId: string;
}

/** @deprecated */
export type PlatformOutput = ArtifactOutput;
/** @deprecated */
export type Platform = Artifact;

export interface GeneratorPiece {
  original?: string | null;
  revision?: { text?: string | null; revision?: string | null } | null;
}

export function canonicalSource(piece: GeneratorPiece): string {
  if (piece.revision?.text) return piece.revision.text;
  if (piece.revision?.revision) return piece.revision.revision;
  return piece.original || "";
}

export function resolveSources(activeIds: string[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  ARTIFACTS.forEach((a) => {
    if (!activeIds.includes(a.id)) return;
    const present = a.derivesFrom.filter((d) => activeIds.includes(d));
    map[a.id] = present.length ? present : ["__source__"];
  });
  return map;
}

export interface GenerateArtifactInput {
  sourceText: string;
  priorOutputs: Record<string, ArtifactOutput>;
  sourceIds: string[];
  audienceId?: string;
  refCtx: string;
}

interface ArtifactMeta {
  throughlineTag?: string;
  strategicPurpose?: string;
  hooks?: unknown;
  ctas?: unknown;
  mediaRec?: string;
  riskCheck?: string;
  relatedOffering?: string;
  followUp?: string;
}

export async function generateArtifact(
  artifact: Artifact,
  { sourceText, priorOutputs, sourceIds, audienceId, refCtx }: GenerateArtifactInput,
  ai: AI,
): Promise<ArtifactOutput> {
  const stakeholder = STAKEHOLDER_PRESETS.find((a) => a.id === audienceId) || STAKEHOLDER_PRESETS[0];

  const derivationText = sourceIds[0] === "__source__"
    ? "Derive from the CANONICAL SCRIPT below."
    : `Derive from these prior artifacts: ${sourceIds.join(", ")}. Synthesize — do not merely excerpt.`;

  const priorBlock = sourceIds[0] === "__source__"
    ? `CANONICAL SCRIPT:\n"""${sourceText}"""`
    : sourceIds
        .map((s) => `=== ${s.toUpperCase()} ===\n${priorOutputs[s]?.draftPost || sourceText}`)
        .join("\n\n");

  const bodySystem =
`You produce professional screenplay development documents for a working writer. ${artifact.role}
${derivationText}
Write for a ${stakeholder.name} reader. Respect the writer's voice. Use industry-standard terminology.

PROJECT BIBLE:
${refCtx}

Return EXACTLY this and nothing else (no JSON, no preamble):
@@POST@@
<the full artifact as plain prose; use headings where appropriate; keep paragraph breaks>
@@END@@`;

  const bodyPrompt =
`ARTIFACT: ${artifact.name}
TARGET READER: ${stakeholder.name}

${priorBlock}

Write the artifact now in the delimited format.`;

  const bodyOut = await ai.text(bodyPrompt, { system: bodySystem });
  let draftPost = bodyOut || "";
  const pm = bodyOut.split(/@@\s*POST\s*@@/i);
  if (pm.length > 1) draftPost = pm[1].split(/@@\s*END\s*@@/i)[0];
  draftPost = draftPost.replace(/@@\s*END\s*@@[\s\S]*$/i, "").trim();

  const metaSystem =
`You produce metadata for a FINISHED screenplay development artifact. Base every field on the actual text provided.

PROJECT BIBLE:
${refCtx}

Return ONLY compact valid JSON (no prose, no code fences):
{"throughlineTag":"<primary theme tag>","strategicPurpose":"1 sentence","hooks":["2-3 alternate hooks or angles"],"ctas":["2-3 next-step suggestions for the writer"],"mediaRec":"<visual/storyboard note if relevant, else 'N/A'>","riskCheck":"<'Clear' or specific concern>","relatedOffering":"<related deliverable>","followUp":"<suggested next artifact or revision>"}`;

  const metaPrompt =
`ARTIFACT: ${artifact.name}
TARGET READER: ${stakeholder.name}

THE ARTIFACT:
"""${draftPost}"""

Return the metadata JSON now.`;

  let meta: ArtifactMeta = {};
  try { meta = await ai.json<ArtifactMeta>(metaPrompt, { system: metaSystem }); }
  catch (e) { console.warn("Artifact metadata failed:", artifact.id, e); }

  return {
    platform: artifact.name,
    selectedAudience: stakeholder.name,
    throughlineTag: (meta.throughlineTag || "").replace(/^#/, "") || "—",
    strategicPurpose: meta.strategicPurpose || "—",
    draftPost: draftPost || "—",
    hooks: Array.isArray(meta.hooks) ? meta.hooks : [],
    ctas: Array.isArray(meta.ctas) ? meta.ctas : [],
    mediaRec: meta.mediaRec || "—",
    riskCheck: meta.riskCheck || "Clear",
    relatedOffering: meta.relatedOffering || "—",
    followUp: meta.followUp || "—",
    _platform: artifact.id,
    _audienceId: stakeholder.id,
  };
}

/** @deprecated Use generateArtifact */
export const generatePlatform = generateArtifact;

export interface GenerateOutputsResult {
  outputs: Record<string, ArtifactOutput>;
  order: string[];
}

export type OutputsProgress = (
  platformId: string,
  state: "running" | "done" | "error",
  output?: ArtifactOutput | null,
  error?: unknown,
) => void;

export async function generateOutputs(
  piece: GeneratorPiece,
  activeIds: string[],
  audienceMap: Record<string, string | undefined>,
  refCtx: string,
  ai: AI,
  onProgress?: OutputsProgress,
): Promise<GenerateOutputsResult> {
  const ordered = ARTIFACTS.filter((a) => activeIds.includes(a.id));
  const sources = resolveSources(activeIds);
  const sourceText = canonicalSource(piece);
  const outputs: Record<string, ArtifactOutput> = {};
  const order: string[] = [];
  for (const artifact of ordered) {
    if (onProgress) onProgress(artifact.id, "running");
    try {
      const res = await generateArtifact(artifact, {
        sourceText,
        priorOutputs: outputs,
        sourceIds: sources[artifact.id],
        audienceId: audienceMap[artifact.id],
        refCtx,
      }, ai);
      outputs[artifact.id] = res;
      order.push(artifact.id);
      if (onProgress) onProgress(artifact.id, "done", res);
    } catch (e) {
      if (onProgress) onProgress(artifact.id, "error", null, e);
      throw e;
    }
  }
  return { outputs, order };
}