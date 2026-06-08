/**
 * Screenplay → narration script for voiceover (no video editing).
 * Regex-first extractor; optional LLM polish via craftVoiceScript.
 */
import { craftVoiceScript } from "@/lib/ai/voiceScript";

const SLUG_RE = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i;
const CHARACTER_RE = /^[A-Z][A-Z0-9 .'\-()]{0,30}$/;

function slugToSpoken(line: string): string {
  const t = line.trim();
  const m = t.match(/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s*(.+?)(?:\s*[-–—]\s*(.+))?$/i);
  if (!m) return t;
  const where = m[1].toUpperCase().startsWith("INT") ? "Interior" : "Exterior";
  const loc = (m[2] || "").replace(/\./g, " ").trim();
  const time = (m[3] || "").trim();
  return [where + ".", loc + ".", time ? time + "." : ""].filter(Boolean).join(" ");
}

/** Extract a speakable voiceover script from screenplay plain text. */
export function extractScreenplayVoiceScript(text: string, title?: string): string {
  const lines = (text || "").split(/\r?\n/);
  const out: string[] = [];
  if (title?.trim()) out.push(title.trim() + ".", "");

  let prev: "slug" | "character" | "dialogue" | "action" | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      prev = null;
      continue;
    }
    if (SLUG_RE.test(line)) {
      out.push(slugToSpoken(line));
      prev = "slug";
      continue;
    }
    if (/^\([^)]+\)$/.test(line)) continue;
    if (CHARACTER_RE.test(line) && !line.endsWith(".") && line.length < 35) {
      prev = "character";
      continue;
    }
    if (prev === "character" || prev === "dialogue") {
      out.push(line);
      prev = "dialogue";
      continue;
    }
    out.push(line);
    prev = "action";
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function draftProductionVoiceScript(input: {
  title?: string;
  text: string;
  refContext?: string;
  voiceName?: string;
  useLlm?: boolean;
}): Promise<string> {
  const base = extractScreenplayVoiceScript(input.text, input.title);
  if (!input.useLlm || !base.trim()) return base;

  try {
    const polished = await craftVoiceScript({
      article: { title: input.title, text: base },
      refContext: input.refContext,
      voiceName: input.voiceName,
    });
    return polished || base;
  } catch {
    return base;
  }
}