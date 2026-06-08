import { describe, expect, it } from "vitest";
import { parseScreenplay, estimatePageCount } from "@/lib/screenplay/parser";
import { toFountain, toBreakdownMarkdown } from "@/lib/screenplay/export";

const SAMPLE = `FADE IN:

INT. COFFEE SHOP - DAY

MARA stirs an untouched latte.

MARA
You don't fix a third act by yelling at it.

DIEGO
Your father hated endings.

EXT. ALBUQUERQUE STREET - NIGHT

Mara walks alone.
`;

describe("parseScreenplay", () => {
  it("detects sluglines and characters", () => {
    const r = parseScreenplay(SAMPLE);
    expect(r.sceneCount).toBe(2);
    expect(r.characters).toContain("MARA");
    expect(r.characters).toContain("DIEGO");
    expect(r.locations.some((l) => l.includes("COFFEE"))).toBe(true);
  });

  it("estimates page count from line density", () => {
    expect(estimatePageCount(SAMPLE)).toBeGreaterThan(0);
    expect(estimatePageCount(SAMPLE)).toBeLessThan(2);
  });
});

describe("screenplay export", () => {
  it("produces Fountain with title metadata", () => {
    const f = toFountain(SAMPLE, { title: "The Last Stunt", author: "Mara Vance" });
    expect(f).toContain("Title: The Last Stunt");
    expect(f).toContain("INT. COFFEE SHOP");
  });

  it("produces breakdown markdown", () => {
    const md = toBreakdownMarkdown(SAMPLE, "The Last Stunt");
    expect(md).toContain("# Production Breakdown");
    expect(md).toContain("Scene 1");
  });
});