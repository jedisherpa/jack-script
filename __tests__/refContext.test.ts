import { describe, expect, it } from "vitest";
import { buildRefContext, buildGateRefContext } from "@/lib/refContext";
import { SEED_REFERENCES } from "@/lib/seed";

describe("buildRefContext — Project Bible", () => {
  it("includes logline, characters, and tone for SEED_REFERENCES", () => {
    const out = buildRefContext(SEED_REFERENCES);
    expect(out).toContain("LOGLINE:");
    expect(out).toContain("MARA VANCE");
    expect(out).toContain("TONE BIBLE:");
    expect(out).toContain("VISUAL LANGUAGE:");
    expect(out).toContain("RED LINES");
  });

  it("returns empty string for nullish input", () => {
    expect(buildRefContext({})).toBe("");
    expect(buildRefContext(null)).toBe("");
    expect(buildRefContext(undefined)).toBe("");
  });

  it("buildGateRefContext narrows Bible for dialogue gate", () => {
    const out = buildGateRefContext(SEED_REFERENCES, "dialogue");
    expect(out).toContain("MARA VANCE");
    expect(out).not.toContain("COMPARABLE TITLES");
  });
});