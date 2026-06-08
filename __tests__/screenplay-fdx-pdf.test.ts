import { describe, expect, it } from "vitest";
import { enrichScriptFromText } from "@/lib/screenplay/enrich";
import { fdxToText, textToFdx, parseScriptFile } from "@/lib/screenplay/fdx";
import { toScreenplayPdf, pdfPageEstimate } from "@/lib/screenplay/pdf";

const SAMPLE = `INT. COFFEE SHOP - DAY

MARA
Hello.

EXT. STREET - NIGHT

MARA
Goodbye.`;

describe("fdx import/export", () => {
  it("round-trips through FDX XML", () => {
    const fdx = textToFdx(SAMPLE, "Test Script");
    expect(fdx).toContain("FinalDraft");
    expect(fdx).toContain("Scene Heading");
    const back = fdxToText(fdx);
    expect(back).toContain("INT. COFFEE SHOP");
    expect(back).toContain("MARA");
  });

  it("parseScriptFile handles fdx extension", () => {
    const xml = textToFdx(SAMPLE, "T");
    const text = parseScriptFile("script.fdx", Buffer.from(xml, "utf8"));
    expect(text).toContain("COFFEE SHOP");
  });

  it("parses FDX with nested Text nodes", () => {
    const xml = `<?xml version="1.0"?>
<FinalDraft DocumentType="Script">
  <Content>
    <Paragraph Type="Scene Heading"><Text>INT. WAREHOUSE - DAY</Text></Paragraph>
    <Paragraph Type="Character"><Text>REX</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>We need to go.</Text></Paragraph>
  </Content>
</FinalDraft>`;
    const text = fdxToText(xml);
    expect(text).toContain("INT. WAREHOUSE");
    expect(text).toContain("REX");
    expect(text).toContain("We need to go.");
  });
});

describe("enrichScriptFromText", () => {
  it("populates page and scene metadata", () => {
    const e = enrichScriptFromText(SAMPLE);
    expect(e.sceneCount).toBe(2);
    expect(e.pageEstimate).toBeGreaterThan(0);
    expect(e.parsedScenes[0].slugline).toContain("COFFEE");
    expect(e.characters).toContain("MARA");
  });
});

describe("screenplay PDF", () => {
  it("generates a non-empty PDF buffer", async () => {
    const buf = await toScreenplayPdf(SAMPLE, { title: "Test", author: "Writer" });
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("estimates pages from text", () => {
    expect(pdfPageEstimate(SAMPLE)).toBeGreaterThan(0);
  });
});