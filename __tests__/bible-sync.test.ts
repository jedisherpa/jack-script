import { describe, expect, it } from "vitest";
import { mergeScriptIntoBible } from "@/lib/screenplay/bibleSync";

describe("mergeScriptIntoBible", () => {
  it("adds new characters and locations from script detection", () => {
    const result = mergeScriptIntoBible({}, ["MARA", "JACK"], ["COFFEE SHOP", "STREET"]);
    expect(result).not.toBeNull();
    expect(result!.addedCharacters).toEqual(["MARA", "JACK"]);
    expect(result!.addedLocations).toEqual(["COFFEE SHOP", "STREET"]);
    expect(result!.patch.characters).toHaveLength(2);
    expect(result!.patch.locations).toHaveLength(2);
  });

  it("skips names already in the Bible", () => {
    const doc = {
      characters: [{ name: "Mara", bio: "Lead" }],
      locations: [{ name: "Coffee Shop", description: "Warm" }],
    };
    const result = mergeScriptIntoBible(doc, ["MARA", "JACK"], ["COFFEE SHOP"]);
    expect(result!.addedCharacters).toEqual(["JACK"]);
    expect(result!.addedLocations).toEqual([]);
    expect(result!.patch.characters).toHaveLength(2);
  });

  it("returns null when nothing new to add", () => {
    const doc = {
      characters: [{ name: "MARA" }],
      locations: [{ name: "STREET" }],
    };
    expect(mergeScriptIntoBible(doc, ["MARA"], ["STREET"])).toBeNull();
  });
});