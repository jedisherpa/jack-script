import { describe, expect, it, vi } from "vitest";
import { GATES, runGate, type GateResult } from "@/lib/gates";
import type { AI } from "@/lib/llm";

describe("script coverage gates", () => {
  it("defines seven screenplay gates in order", () => {
    expect(GATES).toHaveLength(7);
    expect(GATES.map((g) => g.id)).toEqual([
      "format", "character", "dialogue", "pacing", "visual", "theme", "market",
    ]);
  });

  it("runGate normalizes findings with scene refs", async () => {
    const ai = {
      json: vi.fn(async () => ({
        summary: "ok",
        findings: [{
          severity: "must",
          title: "On-the-nose",
          detail: "Line explains subtext",
          anchor: "I love you",
          sceneRef: "Scene 3, line 12",
          category: "dialogue",
          suggestion: "Cut the line",
          bibleAlignment: "Mara voice is spare",
        }],
      })),
    } as unknown as AI;

    const result = await runGate(GATES[2], "INT. ROOM - DAY", "LOGLINE: test", ai);
    const f = (result as GateResult).findings[0];
    expect(f.sceneRef).toBe("Scene 3, line 12");
    expect(f.suggestion).toBe("Cut the line");
  });
});