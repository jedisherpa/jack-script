import { describe, expect, it, vi } from "vitest";
import {
  chunkText,
  parseDelimited,
  collectFirewallFindings,
  buildFindingsBlock,
  buildFullFindingsBlock,
  REVISION_SYSTEM,
  RESTRUCTURE_SYSTEM,
  buildGuidance,
  generateRevision,
  type RevisionPacket,
} from "@/lib/revision";
import type { AI } from "@/lib/llm";

describe("author guidance (direction + gate commentary)", () => {
  it("builds a labelled commentary block and skips empty notes", () => {
    const g = buildGuidance({ direction: "  Lead with stakes ", gateNotes: { dialogue: "punchy", visual: "  ", character: "sound like Mara" } });
    expect(g.hasGuidance).toBe(true);
    expect(g.direction).toBe("Lead with stakes");
    expect(g.notesBlock).toContain("• Dialogue & Subtext: punchy");
    expect(g.notesBlock).toContain("• Character Voice: sound like Mara");
    expect(g.notesBlock).not.toContain("Visual Storytelling");
  });

  it("injects the (e) clause + blocks only when guidance is present", () => {
    const withG = REVISION_SYSTEM("REF", buildGuidance({ direction: "D", gateNotes: { dialogue: "c" } }));
    expect(withG).toContain("(e)");
    expect(withG).toContain("[DIR]");
    expect(withG).toContain("AUTHOR'S CREATIVE DIRECTION");
    expect(withG).toContain("AUTHOR COMMENTARY BY REVIEW SECTION");
    const without = REVISION_SYSTEM("REF", buildGuidance({}));
    expect(without).not.toContain("(e)");
    expect(without).not.toContain("AUTHOR COMMENTARY BY REVIEW SECTION");
  });
});

describe("chunkText", () => {
  it("returns the original (single chunk) for empty / short text", () => {
    expect(chunkText("")).toEqual([""]);
    expect(chunkText("hello world")).toEqual(["hello world"]);
  });

  it("packs paragraphs up to the word budget", () => {
    const p = (n: number) => Array(n).fill("word").join(" ");
    const text = `${p(200)}\n\n${p(200)}`;
    const chunks = chunkText(text, 260);
    expect(chunks).toHaveLength(2);
  });
});

describe("parseDelimited", () => {
  it("extracts the revision body and strips delimiters", () => {
    const out = `@@REVISION@@
The revised line, kept clean.

A second paragraph.
@@CHANGELOG@@
- [D1] tightened the opening :: was wordy
@@END@@`;
    const { revision, changelog } = parseDelimited(out);
    expect(revision).toBe("The revised line, kept clean.\n\nA second paragraph.");
    expect(changelog).toEqual([
      { finding: "D1", change: "tightened the opening", note: "was wordy" },
    ]);
  });

  it("parses D#/V# finding ids", () => {
    const out = `@@REVISION@@
body
@@CHANGELOG@@
- [V2] [must] softened the jab :: tone
- [d10] lowercased id normalizes :: x
@@END@@`;
    const { changelog } = parseDelimited(out);
    expect(changelog).toEqual([
      { finding: "V2", change: "softened the jab", note: "tone" },
      { finding: "D10", change: "lowercased id normalizes", note: "x" },
    ]);
  });
});

const FULL_PACKET = {
  format: { findings: [{ severity: "must", title: "FMT", detail: "no", anchor: null }] },
  pacing: { findings: [{ severity: "must", title: "PACE", detail: "no", anchor: null }] },
  visual: { findings: [{ severity: "must", title: "VIS", detail: "no", anchor: null }] },
  theme: { findings: [{ severity: "must", title: "THEME", detail: "no", anchor: null }] },
  market: { findings: [{ severity: "must", title: "MKT", detail: "no", anchor: null }] },
  dialogue: {
    findings: [{ severity: "must", title: "Tighten", detail: "wordy", anchor: "the thing" }],
  },
  character: { findings: [{ severity: "consider", title: "Voice drift", detail: "cold" }] },
} as unknown as RevisionPacket;

describe("firewall (collectFirewallFindings / buildFindingsBlock)", () => {
  it("collects ONLY dialogue and character voice findings", () => {
    const { dialogue, character } = collectFirewallFindings(FULL_PACKET);
    expect(dialogue).toHaveLength(1);
    expect(character).toHaveLength(1);
  });

  it("never leaks structural gates into the findings block", () => {
    const block = buildFindingsBlock(FULL_PACKET);
    for (const forbidden of ["FMT", "PACE", "VIS", "THEME", "MKT"]) {
      expect(block).not.toContain(forbidden);
    }
    expect(block).toContain('D1 [must] Tighten — wordy (re: "the thing")');
    expect(block).toContain("V1 [consider] Voice drift — cold");
  });

  it("tolerates a missing / empty packet", () => {
    expect(buildFindingsBlock(null)).toContain("DIALOGUE FINDINGS:");
    expect(buildFindingsBlock({})).toContain("CHARACTER VOICE FINDINGS:");
  });
});

describe("REVISION_SYSTEM", () => {
  it("interpolates refCtx and states the dialogue firewall", () => {
    const sys = REVISION_SYSTEM("REF-CONTEXT-HERE");
    expect(sys).toContain("REF-CONTEXT-HERE");
    expect(sys).toContain("do NOT restructure acts or scenes");
    expect(sys).toContain("WRITER'S LINE WINS");
    expect(sys).toContain("@@REVISION@@");
  });
});

describe("generateRevision", () => {
  it("processes each chunk and joins the revised passages", async () => {
    const ai = {
      text: vi.fn(async () => `@@REVISION@@\nrevised 1\n@@CHANGELOG@@\n- [D1] change 1 :: why\n@@END@@`),
    } as unknown as AI;
    const result = await generateRevision(
      { original: "chunk one words here\n\nchunk two words here", packet: FULL_PACKET },
      "REF",
      ai,
    );
    expect(result.text).toContain("revised");
    expect(result.changelog.length).toBeGreaterThan(0);
  });
});

describe("buildFullFindingsBlock", () => {
  it("includes format / pacing / visual / theme / market with F/P/L/H/M ids", () => {
    const block = buildFullFindingsBlock(FULL_PACKET);
    expect(block).toContain("F1 [must] FMT — no");
    expect(block).toContain("P1 [must] PACE — no");
    expect(block).toContain("L1 [must] VIS — no");
    expect(block).toContain("H1 [must] THEME — no");
    expect(block).toContain("M1 [must] MKT — no");
  });
});

describe("RESTRUCTURE_SYSTEM", () => {
  it("permits reorganization and protects the writer's voice", () => {
    const sys = RESTRUCTURE_SYSTEM("REFX");
    expect(sys).toContain("REFX");
    expect(sys).toMatch(/reorganize|reorder/i);
    expect(sys).toContain("PRESERVE the writer's VOICE");
    expect(sys).toContain("@@REVISION@@");
  });
});

describe("generateRevision — full mode", () => {
  it("runs restructure when packet has structural findings", async () => {
    const calls: string[] = [];
    const ai = {
      text: vi.fn(async (prompt: string) => {
        calls.push(prompt.includes("STRUCTURAL COVERAGE") ? "restructure" : "passage");
        if (prompt.includes("STRUCTURAL COVERAGE")) {
          return `@@REVISION@@\nrestructured\n@@CHANGELOG@@\n- [F1] moved act break :: pacing\n@@END@@`;
        }
        return `@@REVISION@@\npolished passage\n@@CHANGELOG@@\n- [D1] tweak :: clarity\n@@END@@`;
      }),
    } as unknown as AI;

    const result = await generateRevision({ original: "some original text here", packet: FULL_PACKET }, "REF", ai, undefined, { mode: "full" });

    expect(calls[0]).toBe("restructure");
    expect(result.text).toContain("polished");
  });
});