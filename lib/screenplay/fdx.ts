/**
 * Final Draft (.fdx) import and export via fast-xml-parser.
 */
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import type { BlockType } from "./parser";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_", format: true, suppressEmptyNode: true });

const FDX_TYPE_MAP: Record<BlockType, string> = {
  slugline: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
  shot: "Shot",
  title_page: "Action",
  unknown: "Action",
};

function blockTypeFromFdx(type: string): BlockType {
  const t = (type || "").toLowerCase();
  if (t.includes("scene")) return "slugline";
  if (t.includes("character")) return "character";
  if (t.includes("parenthetical")) return "parenthetical";
  if (t.includes("dialogue")) return "dialogue";
  if (t.includes("transition")) return "transition";
  if (t.includes("shot")) return "shot";
  return "action";
}

function extractFdxText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node).trim();
  if (Array.isArray(node)) return node.map(extractFdxText).filter(Boolean).join(" ").trim();
  if (typeof node !== "object") return "";
  const obj = node as Record<string, unknown>;
  if (obj["#text"] != null) return String(obj["#text"]).trim();
  const text = obj.Text ?? obj.text;
  if (text != null) return extractFdxText(text);
  return "";
}

/** Parse FDX XML buffer into plain screenplay text. */
export function fdxToText(xml: string): string {
  const doc = parser.parse(xml);
  const root = doc.FinalDraft || doc.finaldraft || doc;
  const content = root.Content || root.content || {};
  let paragraphs = content.Paragraph || content.paragraph || [];
  if (!Array.isArray(paragraphs)) paragraphs = [paragraphs];

  const lines: string[] = [];
  for (const p of paragraphs) {
    const text = extractFdxText(p);
    if (!text) continue;
    const type = typeof p === "object" && p ? ((p as Record<string, unknown>)["@_Type"] || (p as Record<string, unknown>).Type || "Action") : "Action";
    const kind = blockTypeFromFdx(String(type));
    if (kind === "slugline") lines.push("", text.toUpperCase());
    else if (kind === "character") lines.push("", text.toUpperCase());
    else if (kind === "parenthetical") lines.push(text);
    else lines.push(text);
  }
  return lines.join("\n").trim();
}

/** Export plain screenplay text to FDX XML string. */
export function textToFdx(text: string, title: string): string {
  const lines = (text || "").split(/\r?\n/);
  const paragraphs: Array<{ "@_Type": string; "#text": string }> = [];

  let prev: BlockType | null = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { prev = null; continue; }
    let type: BlockType = "action";
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i.test(line.trim())) type = "slugline";
    else if (/^(CUT TO:|FADE IN:|FADE OUT\.|FADE TO BLACK\.)/i.test(line.trim())) type = "transition";
    else if (/^\([^)]+\)$/.test(line.trim())) type = "parenthetical";
    else if (/^[A-Z][A-Z0-9 .'\-()]{0,30}$/.test(line.trim()) && !line.trim().endsWith(".") && line.trim().length < 35) {
      type = prev === "slugline" || prev === "action" || prev === "transition" ? "character" : "action";
    } else if (prev === "character" || prev === "parenthetical") type = "dialogue";

    paragraphs.push({ "@_Type": FDX_TYPE_MAP[type], "#text": line.trim() });
    prev = type;
  }

  const doc = {
    FinalDraft: {
      "@_DocumentType": "Script",
      "@_Template": "No",
      Content: { Paragraph: paragraphs },
      TitlePage: {
        Content: {
          Paragraph: [
            { "@_Type": "Title", "#text": title },
          ],
        },
      },
    },
  };
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(doc);
}

/** Detect and parse uploaded script files. */
export function parseScriptFile(name: string, bytes: Buffer): string | null {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "fdx" || ext === "xml") {
    const xml = bytes.toString("utf8");
    if (xml.includes("FinalDraft") || xml.includes("Paragraph")) return fdxToText(xml);
  }
  if (ext === "fountain" || ext === "txt") return bytes.toString("utf8");
  return null;
}