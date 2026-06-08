import { LLMError } from "@/lib/llm/errors";
import { extractJSON, repairJSON } from "@/lib/llm/json";
import {
  PROVIDER_CAPABILITIES,
  publicLLMStatus,
  resolveAnthropicFileFallback,
  resolveFileLLMConfig,
  resolveMainLLMConfig,
  resolveRoleLLMConfig,
} from "@/lib/llm/config";
import { anthropicProvider } from "@/lib/llm/providers/anthropic";
import { geminiProvider } from "@/lib/llm/providers/gemini";
import { openAICompatibleProvider } from "@/lib/llm/providers/openaiCompatible";
import { ollamaProvider } from "@/lib/llm/providers/ollama";
import type {
  AI,
  AIMessage,
  AIOptions,
  LLMAdapter,
  LLMConfig,
  LLMRole,
  LLMRolesPrefs,
  MultimodalContentBlock,
} from "@/lib/llm/types";

export type {
  AI,
  AIMessage,
  AIOptions,
  AnthropicContentBlock,
  LLMAdapter,
  LLMConfig,
  LLMProvider,
  LLMRole,
  LLMRoleSelection,
  LLMRolesPrefs,
  MultimodalContentBlock,
} from "@/lib/llm/types";
export { LLMError } from "@/lib/llm/errors";
export { extractJSON, repairJSON } from "@/lib/llm/json";
export {
  listAvailableProviders,
  publicLLMStatus,
  resolveMainLLMConfig,
  resolveFileLLMConfig,
  resolveRoleLLMConfig,
} from "@/lib/llm/config";
export { loadUserLlmRoles } from "@/lib/llm/userPrefs";

function createAdapter(config: LLMConfig): LLMAdapter {
  if (config.provider === "anthropic") return anthropicProvider(config);
  if (config.provider === "gemini") return geminiProvider(config);
  if (
    config.provider === "openai" ||
    config.provider === "openai-compatible" ||
    config.provider === "xai" ||
    config.provider === "grok" ||
    config.provider === "groq" ||
    config.provider === "docker-model-runner" ||
    config.provider === "morpheus" ||
    config.provider === "kimi"
  ) {
    return openAICompatibleProvider(config);
  }
  return ollamaProvider(config);
}

export function createAIFromConfig(config: LLMConfig): AI {
  return createAI(createAdapter(config));
}

function withSystemPreamble(messages: AIMessage[], system?: string): AIMessage[] {
  return system
    ? [
        { role: "user", content: system },
        { role: "assistant", content: "Understood. I will follow these instructions exactly and reply only in the specified format." },
        ...messages,
      ]
    : messages;
}

export function createAI(adapter: LLMAdapter): AI {
  async function complete(messages: AIMessage[], system?: string): Promise<string> {
    return adapter.complete(withSystemPreamble(messages, system));
  }

  async function json<T = unknown>(prompt: string, { system }: AIOptions = {}): Promise<T> {
    const messages: AIMessage[] = [{ role: "user", content: prompt }];
    let out = await complete(messages, system);
    let parsed = extractJSON<T>(out) || repairJSON<T>(out);
    if (parsed) return parsed;

    messages.push({ role: "assistant", content: out });
    messages.push({ role: "user", content: "Return ONLY valid JSON matching the schema. Be concise so it fits. No prose, no code fences." });
    out = await complete(messages, system);
    parsed = extractJSON<T>(out) || repairJSON<T>(out);
    if (parsed) return parsed;
    throw new LLMError(502, "llm_parse", "Could not parse JSON from model output.", adapter.provider);
  }

  async function text(prompt: string, { system }: AIOptions = {}): Promise<string> {
    return complete([{ role: "user", content: prompt }], system);
  }

  return { complete, json, text, extractJSON, repairJSON };
}

const roleAICache = new Map<string, AI>();

function roleCacheKey(role: LLMRole, config: LLMConfig): string {
  const keyMarker = config.apiKey ? `key:${config.apiKey.length}:${config.apiKey.slice(-4)}` : "no-key";
  return `${role}:${config.provider}:${config.model}:${config.baseUrl || ""}:${keyMarker}`;
}

/** Task-specific AI client. Uses settings.prefs.llmRoles when provided. */
export function getAIForRole(role: LLMRole, rolePrefs?: LLMRolesPrefs): AI {
  const config = resolveRoleLLMConfig(role, process.env, rolePrefs);
  const key = roleCacheKey(role, config);
  let cached = roleAICache.get(key);
  if (!cached) {
    cached = createAI(createAdapter(config));
    roleAICache.set(key, cached);
  }
  return cached;
}

/** Load user prefs and return the AI client for a task role. */
export async function getUserAI(
  role: LLMRole,
  user: { id: string; workspaceId?: string },
): Promise<AI> {
  const { loadUserLlmRoles } = await import("@/lib/llm/userPrefs");
  const prefs = await loadUserLlmRoles(user.id, user.workspaceId);
  return getAIForRole(role, prefs);
}

/** @deprecated Prefer getAIForRole("write") — kept for backward compatibility. */
export function getAI(): AI {
  return getAIForRole("write");
}

export function getFileAI(required: "vision" | "pdf"): LLMAdapter {
  const fileConfig = resolveFileLLMConfig();
  const candidates: LLMConfig[] = [];
  if (fileConfig) candidates.push(fileConfig);
  const fallback = resolveAnthropicFileFallback();
  if (fallback && !candidates.some((c) => c.provider === fallback.provider && c.model === fallback.model)) {
    candidates.push(fallback);
  }

  for (const config of candidates) {
    const caps = PROVIDER_CAPABILITIES[config.provider];
    if (caps[required]) {
      const adapter = createAdapter(config);
      if (adapter.completeBlocks) return adapter;
    }
  }

  throw new LLMError(
    422,
    "llm_unsupported",
    `${required === "pdf" ? "PDF" : "Image"} extraction requires a configured multimodal LLM provider.`,
  );
}

export async function completeBlocks(content: MultimodalContentBlock[], system?: string): Promise<string> {
  return getFileAI("vision").completeBlocks!(content, system);
}

export function resetLLMForTests() {
  roleAICache.clear();
}

export const ai: AI = {
  complete(messages, system) {
    return getAIForRole("write").complete(messages, system);
  },
  json(prompt, opts) {
    return getAIForRole("write").json(prompt, opts);
  },
  text(prompt, opts) {
    return getAIForRole("write").text(prompt, opts);
  },
  extractJSON,
  repairJSON,
};
