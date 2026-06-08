/** Skill 11 — stage-gated video production (pre-edit phases). */

export const PRODUCTION_STAGE_IDS = [
  "brief",
  "script",
  "audio",
  "storyboard",
  "animatic",
  "edit",
  "render",
] as const;

export type ProductionStageId = (typeof PRODUCTION_STAGE_IDS)[number];

export type StageStatus = "locked" | "active" | "draft" | "ready" | "approved";

export interface StageMeta {
  status: StageStatus;
  approvedAt: string | null;
  assumptions?: string[];
}

export interface ProductionBrief {
  idea: string;
  audience: string;
  goal: string;
  tone: string;
  aspectRatio: string;
}

export interface ProductionAudio {
  voiceScript: string;
  voiceName: string;
  mediaJobId: string | null;
  notes: string;
}

export interface StoryboardFrame {
  sceneNumber: number;
  slugline: string;
  prompt: string;
  cameraNote: string;
  durationSec: number;
  mediaJobId: string | null;
}

export interface AnimaticScene {
  sceneNumber: number;
  slugline: string;
  durationSec: number;
  transition: string;
}

export interface ProductionAnimatic {
  scenes: AnimaticScene[];
  totalDurationSec: number;
  notes: string;
}

export interface ProductionAuditEntry {
  at: string;
  action: string;
  stage: ProductionStageId;
  detail?: string;
}

export interface ProductionState {
  version: 1;
  currentStage: ProductionStageId;
  stages: Record<ProductionStageId, StageMeta>;
  brief: ProductionBrief;
  audio: ProductionAudio;
  storyboard: StoryboardFrame[];
  animatic: ProductionAnimatic;
  auditLog: ProductionAuditEntry[];
}

export interface ParsedSceneRef {
  number: number;
  slugline: string;
  characters?: string[];
  startLine?: number;
}