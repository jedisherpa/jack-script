import { z } from "zod";
import { llmProviderSchema } from "@/lib/schemas-settings";
import { createAIFromConfig, resolveRoleLLMConfig } from "@/lib/llm";
import type { AI, LLMRole, LLMRolesPrefs } from "@/lib/llm/types";

const llmRoleSchema = z.enum(["write", "review", "revise"]);

export const llmTestBodySchema = z
  .object({
    role: llmRoleSchema,
    provider: llmProviderSchema.optional(),
    model: z.string().trim().max(128).optional(),
    baseUrl: z.string().trim().max(512).optional(),
    apiKey: z.string().trim().max(4096).optional(),
  })
  .strict();

export type LLMTestBody = z.infer<typeof llmTestBodySchema>;

interface RunLLMConnectionTestOptions {
  env?: Record<string, string | undefined>;
  basePrefs?: LLMRolesPrefs;
  timeoutMs?: number;
  aiFactory?: (config: ReturnType<typeof resolveRoleLLMConfig>, role: LLMRole, prefs?: LLMRolesPrefs) => AI;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Model test timed out.")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function runLLMConnectionTest(
  body: LLMTestBody,
  {
    env = process.env,
    basePrefs = {},
    timeoutMs = 15000,
    aiFactory = (config) => createAIFromConfig(config),
  }: RunLLMConnectionTestOptions = {},
) {
  const rolePrefs: LLMRolesPrefs = { ...basePrefs };
  if (body.provider || body.model || body.baseUrl || body.apiKey) {
    rolePrefs[body.role] = {
      ...(basePrefs[body.role] || {}),
      provider: body.provider,
      model: body.model || undefined,
      baseUrl: body.baseUrl || undefined,
      apiKey: body.apiKey || undefined,
    };
  }

  const config = { ...resolveRoleLLMConfig(body.role, env, rolePrefs), maxTokens: 256 };
  const ai = aiFactory(config, body.role, rolePrefs);
  const started = Date.now();
  const reply = await withTimeout(
    ai.text("Jack Script model connection test. Reply with exactly: JACK_SCRIPT_MODEL_TEST_OK"),
    timeoutMs,
  );

  return {
    ok: true,
    role: body.role,
    provider: config.provider,
    model: config.model,
    elapsedMs: Date.now() - started,
    reply: reply.trim().slice(0, 500),
  };
}
