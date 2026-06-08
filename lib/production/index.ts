import { enrichScriptFromText } from "@/lib/screenplay/enrich";
import type {
  AnimaticScene,
  ParsedSceneRef,
  ProductionAnimatic,
  ProductionBrief,
  ProductionStageId,
  ProductionState,
  StageMeta,
  StageStatus,
  StoryboardFrame,
} from "./types";
import { PRODUCTION_STAGE_IDS } from "./types";

export * from "./types";
export * from "./voiceScript";

const STAGE_LABELS: Record<ProductionStageId, string> = {
  brief: "Brief",
  script: "Script",
  audio: "Audio",
  storyboard: "Storyboard",
  animatic: "Animatic",
  edit: "Edit",
  render: "Render",
};

export const PRODUCTION_STAGES = PRODUCTION_STAGE_IDS.map((id, i) => ({
  id,
  n: i + 1,
  name: STAGE_LABELS[id],
  gated: id !== "brief",
  comingSoon: id === "edit" || id === "render",
}));

const DEFAULT_BRIEF: ProductionBrief = {
  idea: "",
  audience: "General audience",
  goal: "Explain or tell a visual story",
  tone: "Clear and engaging",
  aspectRatio: "16:9",
};

function stageMeta(status: StageStatus, approvedAt: string | null = null): StageMeta {
  return { status, approvedAt, assumptions: [] };
}

export function createInitialProduction(): ProductionState {
  const stages = Object.fromEntries(
    PRODUCTION_STAGE_IDS.map((id) => [
      id,
      id === "brief"
        ? stageMeta("active")
        : id === "edit" || id === "render"
          ? stageMeta("locked")
          : stageMeta("locked"),
    ]),
  ) as Record<ProductionStageId, StageMeta>;

  return {
    version: 1,
    currentStage: "brief",
    stages,
    brief: { ...DEFAULT_BRIEF },
    audio: { voiceScript: "", voiceName: "Narrator", mediaJobId: null, notes: "" },
    storyboard: [],
    animatic: { scenes: [], totalDurationSec: 0, notes: "" },
    auditLog: [],
  };
}

export function normalizeProduction(raw: unknown): ProductionState {
  if (!raw || typeof raw !== "object") return createInitialProduction();
  const p = raw as Partial<ProductionState>;
  const base = createInitialProduction();
  return {
    version: 1,
    currentStage: (p.currentStage as ProductionStageId) || base.currentStage,
    stages: { ...base.stages, ...(p.stages as Record<ProductionStageId, StageMeta>) },
    brief: { ...base.brief, ...(p.brief as ProductionBrief) },
    audio: { ...base.audio, ...(p.audio as ProductionState["audio"]) },
    storyboard: Array.isArray(p.storyboard) ? (p.storyboard as StoryboardFrame[]) : [],
    animatic: { ...base.animatic, ...(p.animatic as ProductionAnimatic) },
    auditLog: Array.isArray(p.auditLog) ? (p.auditLog as ProductionState["auditLog"]) : [],
  };
}

function logAction(state: ProductionState, stage: ProductionStageId, action: string, detail?: string): void {
  state.auditLog.unshift({
    at: new Date().toISOString(),
    action,
    stage,
    detail,
  });
  if (state.auditLog.length > 50) state.auditLog.length = 50;
}

const ORDER: ProductionStageId[] = ["brief", "script", "audio", "storyboard", "animatic"];

function isStageApproved(state: ProductionState, id: ProductionStageId): boolean {
  return state.stages[id]?.status === "approved";
}

/** Recompute locked/active from approval chain. */
export function syncProductionStages(state: ProductionState, scriptText = ""): ProductionState {
  const next = normalizeProduction(state);
  const hasBrief = !!(next.brief.idea?.trim() || next.brief.goal?.trim());
  const hasScript = !!(scriptText || "").trim();

  for (const id of PRODUCTION_STAGE_IDS) {
    if (id === "edit" || id === "render") {
      next.stages[id] = { ...next.stages[id], status: "locked" };
      continue;
    }
  }

  const unlockIndex = (target: ProductionStageId): boolean => {
    const idx = ORDER.indexOf(target);
    if (idx <= 0) return true;
    for (let i = 0; i < idx; i++) {
      if (!isStageApproved(next, ORDER[i])) return false;
    }
    return true;
  };

  if (!isStageApproved(next, "brief")) {
    next.stages.brief.status = hasBrief ? (next.stages.brief.status === "approved" ? "approved" : "ready") : "active";
  }

  if (unlockIndex("script")) {
    if (!isStageApproved(next, "script")) {
      next.stages.script.status = hasScript ? "ready" : "active";
    }
  } else {
    next.stages.script.status = "locked";
  }

  for (const id of ["audio", "storyboard", "animatic"] as ProductionStageId[]) {
    if (!unlockIndex(id)) {
      next.stages[id].status = "locked";
    } else if (!isStageApproved(next, id)) {
      if (id === "audio" && next.audio.voiceScript.trim()) next.stages.audio.status = "ready";
      else if (id === "storyboard" && next.storyboard.length > 0) next.stages.storyboard.status = "ready";
      else if (id === "animatic" && next.animatic.scenes.length > 0) next.stages.animatic.status = "ready";
      else if (next.stages[id].status === "locked") next.stages[id].status = "active";
    }
  }

  const firstOpen = ORDER.find((id) => next.stages[id].status !== "approved" && next.stages[id].status !== "locked");
  next.currentStage = firstOpen || "animatic";
  return next;
}

export function approveProductionStage(
  state: ProductionState,
  stageId: ProductionStageId,
  scriptText = "",
): { state: ProductionState; error?: string } {
  const next = syncProductionStages(normalizeProduction(state), scriptText);

  if (stageId === "edit" || stageId === "render") {
    return { state: next, error: "Video editing and final render are not available yet." };
  }

  const idx = ORDER.indexOf(stageId);
  if (idx > 0) {
    for (let i = 0; i < idx; i++) {
      if (!isStageApproved(next, ORDER[i])) {
        return { state: next, error: `Approve ${STAGE_LABELS[ORDER[i]]} before ${STAGE_LABELS[stageId]}.` };
      }
    }
  }

  if (stageId === "brief" && !next.brief.idea?.trim()) {
    return { state: next, error: "Add a brief idea before approving." };
  }
  if (stageId === "script" && !scriptText.trim()) {
    return { state: next, error: "Write a script before approving." };
  }
  if (stageId === "audio" && !next.audio.voiceScript.trim()) {
    return { state: next, error: "Generate or write a voice script before approving." };
  }
  if (stageId === "storyboard" && next.storyboard.length === 0) {
    return { state: next, error: "Initialize storyboard frames before approving." };
  }
  if (stageId === "animatic" && next.animatic.scenes.length === 0) {
    return { state: next, error: "Build animatic timing before approving." };
  }

  next.stages[stageId] = {
    ...next.stages[stageId],
    status: "approved",
    approvedAt: new Date().toISOString(),
  };
  logAction(next, stageId, "approved");

  const synced = syncProductionStages(next, scriptText);
  return { state: synced };
}

export function buildStoryboardFromScenes(
  scenes: ParsedSceneRef[],
  scriptText: string,
  visualLanguage = "",
): StoryboardFrame[] {
  const lines = (scriptText || "").split(/\r?\n/);
  return scenes.map((s) => {
    const start = Math.max(0, (s.startLine || 1) - 1);
    const excerpt = lines.slice(start, start + 14).join("\n").slice(0, 500);
    const prompt = [
      "Cinematic storyboard frame.",
      `Scene ${s.number}: ${s.slugline}`,
      excerpt ? `Action: ${excerpt}` : "",
      visualLanguage ? `Visual style: ${visualLanguage}` : "",
      (s.characters || []).length ? `Characters: ${(s.characters || []).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      sceneNumber: s.number,
      slugline: s.slugline,
      prompt,
      cameraNote: "Medium shot — adjust per scene",
      durationSec: 5,
      mediaJobId: null,
    };
  });
}

export function buildAnimaticFromStoryboard(frames: StoryboardFrame[]): ProductionAnimatic {
  const scenes: AnimaticScene[] = frames.map((f) => ({
    sceneNumber: f.sceneNumber,
    slugline: f.slugline,
    durationSec: f.durationSec || 5,
    transition: "cut",
  }));
  const totalDurationSec = scenes.reduce((n, s) => n + s.durationSec, 0);
  return {
    scenes,
    totalDurationSec,
    notes: "Animatic preview — video assembly and editing coming in a future release.",
  };
}

export function initStoryboardForPiece(
  state: ProductionState,
  scriptText: string,
  visualLanguage = "",
): ProductionState {
  const enriched = enrichScriptFromText(scriptText);
  const scenes = (enriched.parsedScenes || []) as ParsedSceneRef[];
  const next = normalizeProduction(state);
  next.storyboard = buildStoryboardFromScenes(scenes, scriptText, visualLanguage);
  logAction(next, "storyboard", "initialized", `${next.storyboard.length} frames`);
  return syncProductionStages(next, scriptText);
}

export function initAnimaticForPiece(state: ProductionState, scriptText: string): ProductionState {
  const next = normalizeProduction(state);
  next.animatic = buildAnimaticFromStoryboard(next.storyboard);
  logAction(next, "animatic", "initialized", `${next.animatic.scenes.length} scenes`);
  return syncProductionStages(next, scriptText);
}
