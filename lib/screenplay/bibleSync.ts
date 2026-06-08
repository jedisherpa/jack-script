/**
 * Merge script-detected characters and locations into the Project Bible.
 * Only adds entries that are not already present (case-insensitive name match).
 */
import type { BibleCharacter, BibleLocation, ReferencesDoc } from "../refContext";

export interface BibleSyncResult {
  patch: { characters: BibleCharacter[]; locations: BibleLocation[] };
  addedCharacters: string[];
  addedLocations: string[];
}

function normName(s: string): string {
  return s.trim().toUpperCase();
}

export function mergeScriptIntoBible(
  doc: ReferencesDoc | Record<string, unknown> | null | undefined,
  scriptCharacters: string[],
  scriptLocations: string[],
): BibleSyncResult | null {
  const existing = (doc || {}) as ReferencesDoc;
  const chars = [...(existing.characters || [])];
  const locs = [...(existing.locations || [])];
  const existingCharNames = new Set(chars.map((c) => normName(c.name)));
  const existingLocNames = new Set(locs.map((l) => normName(l.name)));

  const addedCharacters: string[] = [];
  const addedLocations: string[] = [];

  for (const raw of scriptCharacters) {
    const name = raw.trim();
    if (!name || existingCharNames.has(normName(name))) continue;
    chars.push({
      name,
      bio: "Auto-detected from script — add voice notes, arc, and relationships.",
    });
    existingCharNames.add(normName(name));
    addedCharacters.push(name);
  }

  for (const raw of scriptLocations) {
    const name = raw.trim();
    if (!name || existingLocNames.has(normName(name))) continue;
    locs.push({
      name,
      description: "Auto-detected from slugline — add mood and visual notes.",
    });
    existingLocNames.add(normName(name));
    addedLocations.push(name);
  }

  if (!addedCharacters.length && !addedLocations.length) return null;

  return {
    patch: { characters: chars, locations: locs },
    addedCharacters,
    addedLocations,
  };
}