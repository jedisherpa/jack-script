import { z } from "zod";
import { PRODUCTION_STAGE_IDS } from "@/lib/production/types";

const briefSchema = z.object({
  idea: z.string().max(8000).optional(),
  audience: z.string().max(500).optional(),
  goal: z.string().max(2000).optional(),
  tone: z.string().max(500).optional(),
  aspectRatio: z.string().max(32).optional(),
});

const audioSchema = z.object({
  voiceScript: z.string().max(200_000).optional(),
  voiceName: z.string().max(120).optional(),
  mediaJobId: z.string().uuid().nullable().optional(),
  notes: z.string().max(4000).optional(),
});

const storyboardFrameSchema = z.object({
  sceneNumber: z.number().int().positive(),
  slugline: z.string().max(500),
  prompt: z.string().max(8000),
  cameraNote: z.string().max(1000),
  durationSec: z.number().min(1).max(600),
  mediaJobId: z.string().uuid().nullable().optional(),
});

const animaticSceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  slugline: z.string().max(500),
  durationSec: z.number().min(1).max(600),
  transition: z.string().max(64),
});

export const patchProductionSchema = z
  .object({
    brief: briefSchema.optional(),
    audio: audioSchema.optional(),
    storyboard: z.array(storyboardFrameSchema).optional(),
    animatic: z
      .object({
        scenes: z.array(animaticSceneSchema).optional(),
        totalDurationSec: z.number().optional(),
        notes: z.string().max(4000).optional(),
      })
      .optional(),
    currentStage: z.enum(PRODUCTION_STAGE_IDS).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Provide at least one field." });

export const approveProductionSchema = z.object({
  stageId: z.enum(PRODUCTION_STAGE_IDS),
});