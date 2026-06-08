/**
 * Screenplay parser — detects sluglines, action, dialogue, and scene structure.
 * Supports plain text and Fountain-style input.
 */

export type BlockType =
  | "slugline"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition"
  | "shot"
  | "title_page"
  | "unknown";

export interface ScreenplayBlock {
  type: BlockType;
  text: string;
  lineNumber: number;
}

export interface ParsedScene {
  number: number;
  slugline: string;
  blocks: ScreenplayBlock[];
  characters: string[];
  startLine: number;
}

export interface ParseResult {
  scenes: ParsedScene[];
  blocks: ScreenplayBlock[];
  sceneCount: number;
  pageEstimate: number;
  characters: string[];
  locations: string[];
}

const SLUGLINE_RE = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i;
const TRANSITION_RE = /^(CUT TO:|FADE IN:|FADE OUT\.|FADE TO BLACK\.|DISSOLVE TO:)/i;
const CHARACTER_RE = /^[A-Z][A-Z0-9 .'\-()]{0,30}$/;
const PAREN_RE = /^\([^)]+\)$/;
const SHOT_RE = /^(CLOSE ON|WIDE ON|ANGLE ON|POV)/i;

const LINES_PER_PAGE = 55;

function classifyLine(line: string, prevType: BlockType | null): BlockType {
  const trimmed = line.trim();
  if (!trimmed) return "unknown";
  if (SLUGLINE_RE.test(trimmed)) return "slugline";
  if (TRANSITION_RE.test(trimmed)) return "transition";
  if (SHOT_RE.test(trimmed)) return "shot";
  if (PAREN_RE.test(trimmed)) return "parenthetical";
  if (CHARACTER_RE.test(trimmed) && !trimmed.endsWith(".") && trimmed.length < 35) {
    return "character";
  }
  if (prevType === "character" || prevType === "parenthetical") return "dialogue";
  return "action";
}

export function parseScreenplay(text: string): ParseResult {
  const lines = (text || "").split(/\r?\n/);
  const blocks: ScreenplayBlock[] = [];
  let prevType: BlockType | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const type: BlockType = line.trim() ? classifyLine(line, prevType) : "unknown";
    if (type !== "unknown") {
      blocks.push({ type, text: line, lineNumber: i + 1 });
      prevType = type;
    } else {
      prevType = null;
    }
  }

  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  const allCharacters = new Set<string>();
  const locations = new Set<string>();

  for (const block of blocks) {
    if (block.type === "slugline") {
      if (current) scenes.push(current);
      const loc = block.text.replace(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s*/i, "").split(/\s*[-–—]/)[0].trim();
      if (loc) locations.add(loc.toUpperCase());
      current = {
        number: scenes.length + 1,
        slugline: block.text.trim(),
        blocks: [block],
        characters: [],
        startLine: block.lineNumber,
      };
    } else if (current) {
      current.blocks.push(block);
      if (block.type === "character") {
        const name = block.text.trim().replace(/\s*\(.*\)$/, "");
        if (!allCharacters.has(name)) current.characters.push(name);
        allCharacters.add(name);
      }
    }
  }
  if (current) scenes.push(current);

  const nonEmptyLines = lines.filter((l) => l.trim()).length;
  const pageEstimate = Math.max(1, Math.round((nonEmptyLines / LINES_PER_PAGE) * 10) / 10);

  return {
    scenes,
    blocks,
    sceneCount: scenes.length,
    pageEstimate,
    characters: [...allCharacters],
    locations: [...locations],
  };
}

export function estimatePageCount(text: string): number {
  return parseScreenplay(text).pageEstimate;
}