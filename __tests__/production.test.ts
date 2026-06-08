import { describe, expect, it } from "vitest";
import {
  approveProductionStage,
  buildStoryboardFromScenes,
  createInitialProduction,
  initAnimaticForPiece,
  initStoryboardForPiece,
  syncProductionStages,
} from "@/lib/production";
import { extractScreenplayVoiceScript } from "@/lib/production/voiceScript";

const SAMPLE = `INT. COFFEE SHOP - DAY

MARA
Hello there.

EXT. STREET - NIGHT

MARA
Goodbye.`;

describe("production pipeline", () => {
  it("creates initial state with brief active", () => {
    const p = createInitialProduction();
    expect(p.stages.brief.status).toBe("active");
    expect(p.stages.script.status).toBe("locked");
  });

  it("approves stages in order", () => {
    let p = syncProductionStages(createInitialProduction());
    p.brief.idea = "Explainer about coffee";
    let r = approveProductionStage(p, "brief");
    expect(r.error).toBeUndefined();
    expect(r.state.stages.brief.status).toBe("approved");

    r = approveProductionStage(r.state, "script", "");
    expect(r.error).toContain("Write a script");

    p = syncProductionStages(r.state, SAMPLE);
    p = initStoryboardForPiece(p, SAMPLE);
    r = approveProductionStage(p, "script", SAMPLE);
    expect(r.state.stages.script.status).toBe("approved");
  });

  it("blocks edit and render stages", () => {
    const r = approveProductionStage(createInitialProduction(), "edit");
    expect(r.error).toContain("not available");
  });

  it("keeps completed productions on animatic", () => {
    let p = createInitialProduction();
    p.brief.idea = "Explainer about coffee";
    let r = approveProductionStage(p, "brief");
    r = approveProductionStage(r.state, "script", SAMPLE);
    p = initStoryboardForPiece(r.state, SAMPLE);
    r = approveProductionStage(p, "audio", SAMPLE);
    expect(r.error).toContain("voice script");
    p.audio.voiceScript = "Interior coffee shop. Hello there. Exterior street. Goodbye.";
    r = approveProductionStage(p, "audio", SAMPLE);
    p = initAnimaticForPiece(r.state, SAMPLE);
    r = approveProductionStage(p, "storyboard", SAMPLE);
    r = approveProductionStage(r.state, "animatic", SAMPLE);

    expect(r.error).toBeUndefined();
    expect(r.state.currentStage).toBe("animatic");
  });

  it("builds storyboard frames from scenes", () => {
    const frames = buildStoryboardFromScenes(
      [
        { number: 1, slugline: "INT. COFFEE SHOP - DAY", startLine: 1, characters: ["MARA"] },
        { number: 2, slugline: "EXT. STREET - NIGHT", startLine: 6, characters: ["MARA"] },
      ],
      SAMPLE,
      "Warm naturalistic",
    );
    expect(frames).toHaveLength(2);
    expect(frames[0].prompt).toContain("COFFEE");
    expect(frames[0].durationSec).toBe(5);
  });

  it("extracts voice script from screenplay", () => {
    const script = extractScreenplayVoiceScript(SAMPLE, "Test");
    expect(script).toContain("Interior");
    expect(script).toContain("Hello there");
  });
});
