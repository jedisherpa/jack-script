/**
 * Compute script metadata from raw text and persist-ready fields.
 */
import { parseScreenplay, type ParsedScene } from "./parser";

export interface ScriptEnrichment {
  pageEstimate: number;
  sceneCount: number;
  parsedScenes: Array<{
    number: number;
    slugline: string;
    characters: string[];
    startLine: number;
  }>;
  characters: string[];
  locations: string[];
}

export function enrichScriptFromText(text: string): ScriptEnrichment {
  const parsed = parseScreenplay(text);
  return {
    pageEstimate: parsed.pageEstimate,
    sceneCount: parsed.sceneCount,
    parsedScenes: parsed.scenes.map((s: ParsedScene) => ({
      number: s.number,
      slugline: s.slugline,
      characters: s.characters,
      startLine: s.startLine,
    })),
    characters: parsed.characters,
    locations: parsed.locations,
  };
}