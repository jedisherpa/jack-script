import { describe, expect, it, vi } from "vitest";
import {
  ARTIFACTS,
  STAKEHOLDER_PRESETS,
  resolveSources,
  canonicalSource,
  generateArtifact,
  generateOutputs,
} from "@/lib/generators";
import type { AI } from "@/lib/llm";

function fakeAI(): AI {
  return {
    complete: vi.fn(),
    extractJSON: vi.fn(),
    repairJSON: vi.fn(),
    text: vi.fn(async (prompt: string) =>
      `@@POST@@\nBODY for prompt len ${prompt.length}\n@@END@@`,
    ),
    json: vi.fn(async () => ({
      throughlineTag: "legacy-vs-authorship",
      strategicPurpose: "Purpose.",
      hooks: ["h1", "h2"],
      ctas: ["c1", "c2"],
      mediaRec: "storyboard frame",
      riskCheck: "Clear",
      relatedOffering: "treatment",
      followUp: "next artifact",
    })),
  } as unknown as AI;
}

describe("resolveSources — artifact provenance", () => {
  it("logline derives from canonical source", () => {
    const m = resolveSources(["logline", "one_page_synopsis", "full_treatment"]);
    expect(m.logline).toEqual(["__source__"]);
    expect(m.one_page_synopsis).toEqual(["logline"]);
    expect(m.full_treatment).toEqual(["one_page_synopsis"]);
  });

  it("table_read chains from character_breakdowns when all on", () => {
    const ids = ARTIFACTS.map((a) => a.id);
    const m = resolveSources(ids);
    expect(m.table_read_script).toEqual(["character_breakdowns"]);
  });
});

describe("canonicalSource", () => {
  it("prefers revision.text over original", () => {
    expect(canonicalSource({ original: "orig", revision: { text: "rev" } })).toBe("rev");
  });
});

describe("generateOutputs", () => {
  it("runs artifacts in fixed order", async () => {
    const ai = fakeAI();
    const active = ["logline", "one_page_synopsis"];
    const { outputs, order } = await generateOutputs(
      { original: "INT. ROOM - DAY\n\nAction." },
      active,
      {},
      "LOGLINE: test",
      ai,
    );
    expect(order).toEqual(["logline", "one_page_synopsis"]);
    expect(outputs.logline.draftPost).toContain("BODY for");
    expect(outputs.one_page_synopsis.selectedAudience).toBe(STAKEHOLDER_PRESETS[0].name);
  });
});

describe("generateArtifact", () => {
  it("produces artifact output with metadata", async () => {
    const ai = fakeAI();
    const artifact = ARTIFACTS[0];
    const out = await generateArtifact(
      artifact,
      {
        sourceText: "FADE IN:",
        priorOutputs: {},
        sourceIds: ["__source__"],
        refCtx: "GENRE: Drama",
      },
      ai,
    );
    expect(out._platform).toBe("logline");
    expect(out.hooks.length).toBeGreaterThan(0);
  });
});