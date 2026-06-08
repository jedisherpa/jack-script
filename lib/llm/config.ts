import { readFileSync } from "node:fs";
import { LLMError } from "@/lib/llm/errors";
import type { LLMCapabilities, LLMConfig, LLMProvider } from "@/lib/llm/types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_XAI_BASE_URL = "https://api.x.ai/v1";
export const DEFAULT_MAX_TOKENS = 32000;
export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

const PROVIDERS = new Set<LLMProvider>(["anthropic", "openai", "openai-compatible", "xai", "ollama", "gemini"]);

export const PROVIDER_CAPABILITIES: Record<LLMProvider, LLMCapabilities> = {
  anthropic: { text: true, json: true, vision: true, pdf: true },
  openai: { text: true, json: true, vision: false, pdf: false },
  "openai-compatible": { text: true, json: true, vision: false, pdf: false },
  xai: { text: true, json: true, vision: false, pdf: false },
  ollama: { text: true, json: true, vision: false, pdf: false },
  gemini: { text: true, json: true, vision: true, pdf: true },
};

type Env = Record<string, string | undefined>;
interface DesktopLLMSettings {
  provider?: LLMProvider;
  model?: string;
  baseUrl?: string;
}

function asProvider(value: string | undefined, fallback?: LLMProvider): LLMProvider {
  const v = (value || fallback || "").trim();
  if (PROVIDERS.has(v as LLMProvider)) return v as LLMProvider;
  throw new LLMError(500, "llm_config", `Unsupported LLM provider: ${v || "(empty)"}.`);
}

function trim(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

function trimBaseUrl(value: string | undefined): string | undefined {
  return trim(value)?.replace(/\/+$/, "");
}

function isLocalFirstEnv(env: Env): boolean {
  return (
    env.KINGS_PRESS_LOCAL_FIRST === "true" ||
    env.DATA_BACKEND === "sqlite" ||
    Boolean(trim(env.KINGS_PRESS_DB_PATH))
  );
}

function readDesktopLLMSettings(env: Env): DesktopLLMSettings | null {
  const path = trim(env.KINGS_PRESS_LLM_SETTINGS_PATH);
  if (!path) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const provider = typeof parsed.provider === "string" && PROVIDERS.has(parsed.provider as LLMProvider)
      ? (parsed.provider as LLMProvider)
      : undefined;
    const model = typeof parsed.model === "string" ? trim(parsed.model) : undefined;
    const baseUrl = typeof parsed.baseUrl === "string" ? trimBaseUrl(parsed.baseUrl) : undefined;
    return { provider, model, baseUrl };
  } catch {
    return null;
  }
}

function maxTokens(value: string | undefined): number {
  const n = Number.parseInt(value || "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_TOKENS;
}

export function resolveMainLLMConfig(env: Env = process.env): LLMConfig {
  const desktop = readDesktopLLMSettings(env);
  const provider = env.LLM_PROVIDER
    ? asProvider(env.LLM_PROVIDER)
    : env.ANTHROPIC_API_KEY
      ? "anthropic"
      : isLocalFirstEnv(env)
        ? asProvider(desktop?.provider, "ollama")
        : asProvider(undefined, "anthropic");

  const desktopModel =
    !env.LLM_PROVIDER || desktop?.provider === provider || (!desktop?.provider && provider === "ollama")
      ? desktop?.model
      : undefined;
  const model =
    trim(env.LLM_MODEL) ||
    desktopModel ||
    (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : provider === "gemini" ? DEFAULT_GEMINI_MODEL : "");
  if (!model) throw new LLMError(500, "llm_config", "Missing LLM_MODEL in server environment.", provider);

  const apiKey =
    trim(env.LLM_API_KEY) ||
    (provider === "anthropic" ? trim(env.ANTHROPIC_API_KEY) : undefined) ||
    (provider === "openai" ? trim(env.OPENAI_API_KEY) : undefined) ||
    (provider === "xai" ? trim(env.XAI_API_KEY) || trim(env.GROK_API_KEY) : undefined) ||
    (provider === "gemini" ? trim(env.GEMINI_API_KEY) || trim(env.GOOGLE_API_KEY) : undefined);
  const baseUrl =
    provider === "ollama"
      ? trimBaseUrl(env.LLM_BASE_URL) || desktop?.baseUrl || DEFAULT_OLLAMA_BASE_URL
      : provider === "openai"
        ? trimBaseUrl(env.LLM_BASE_URL) || DEFAULT_OPENAI_BASE_URL
        : provider === "xai"
          ? trimBaseUrl(env.LLM_BASE_URL) || DEFAULT_XAI_BASE_URL
      : provider === "gemini"
        ? trimBaseUrl(env.LLM_BASE_URL) || DEFAULT_GEMINI_BASE_URL
        : trimBaseUrl(env.LLM_BASE_URL) || (desktop?.provider === provider ? desktop.baseUrl : undefined);

  if (provider === "anthropic" && !apiKey) {
    throw new LLMError(500, "llm_config", "Missing LLM_API_KEY or ANTHROPIC_API_KEY in server environment.", provider);
  }
  if (provider === "openai-compatible" && !baseUrl) {
    throw new LLMError(500, "llm_config", "Missing LLM_BASE_URL for openai-compatible provider.", provider);
  }
  if (provider === "openai" && !apiKey) {
    throw new LLMError(500, "llm_config", "Missing LLM_API_KEY or OPENAI_API_KEY in server environment.", provider);
  }
  if (provider === "xai" && !apiKey) {
    throw new LLMError(500, "llm_config", "Missing LLM_API_KEY, XAI_API_KEY, or GROK_API_KEY in server environment.", provider);
  }
  if (provider === "gemini" && !apiKey) {
    throw new LLMError(500, "llm_config", "Missing LLM_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY in server environment.", provider);
  }

  return { provider, model, maxTokens: maxTokens(env.LLM_MAX_TOKENS), apiKey, baseUrl };
}

export function resolveFileLLMConfig(env: Env = process.env): LLMConfig | null {
  const main = resolveMainLLMConfig(env);
  const explicitProvider = trim(env.LLM_FILE_PROVIDER);
  const provider = explicitProvider ? asProvider(explicitProvider) : main.provider;

  const model =
    trim(env.LLM_FILE_MODEL) ||
    (provider === main.provider ? main.model : undefined) ||
    (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : provider === "gemini" ? DEFAULT_GEMINI_MODEL : "");
  if (!model) throw new LLMError(500, "llm_config", "Missing LLM_FILE_MODEL for file provider.", provider);

  const apiKey =
    trim(env.LLM_FILE_API_KEY) ||
    (provider === main.provider ? main.apiKey : undefined) ||
    (provider === "anthropic" ? trim(env.ANTHROPIC_API_KEY) : undefined) ||
    (provider === "openai" ? trim(env.OPENAI_API_KEY) : undefined) ||
    (provider === "xai" ? trim(env.XAI_API_KEY) || trim(env.GROK_API_KEY) : undefined) ||
    (provider === "gemini" ? trim(env.GEMINI_API_KEY) || trim(env.GOOGLE_API_KEY) : undefined);
  const baseUrl =
    provider === "ollama"
      ? trimBaseUrl(env.LLM_FILE_BASE_URL) || (provider === main.provider ? main.baseUrl : undefined) || DEFAULT_OLLAMA_BASE_URL
      : provider === "openai"
        ? trimBaseUrl(env.LLM_FILE_BASE_URL) || (provider === main.provider ? main.baseUrl : undefined) || DEFAULT_OPENAI_BASE_URL
        : provider === "xai"
          ? trimBaseUrl(env.LLM_FILE_BASE_URL) || (provider === main.provider ? main.baseUrl : undefined) || DEFAULT_XAI_BASE_URL
      : provider === "gemini"
        ? trimBaseUrl(env.LLM_FILE_BASE_URL) || (provider === main.provider ? main.baseUrl : undefined) || DEFAULT_GEMINI_BASE_URL
        : trimBaseUrl(env.LLM_FILE_BASE_URL) || (provider === main.provider ? main.baseUrl : undefined);

  if (provider === "anthropic" && !apiKey) {
    return null;
  }
  if (provider === "openai-compatible" && !baseUrl) {
    throw new LLMError(500, "llm_config", "Missing LLM_FILE_BASE_URL for openai-compatible file provider.", provider);
  }
  if ((provider === "openai" || provider === "xai") && !apiKey) {
    return null;
  }
  if (provider === "gemini" && !apiKey) {
    return null;
  }

  return { provider, model, maxTokens: maxTokens(env.LLM_MAX_TOKENS), apiKey, baseUrl };
}

export function resolveAnthropicFileFallback(env: Env = process.env): LLMConfig | null {
  const apiKey = trim(env.LLM_FILE_API_KEY) || trim(env.ANTHROPIC_API_KEY);
  if (!apiKey) return null;
  return {
    provider: "anthropic",
    model: trim(env.LLM_FILE_MODEL) || DEFAULT_ANTHROPIC_MODEL,
    maxTokens: maxTokens(env.LLM_MAX_TOKENS),
    apiKey,
  };
}

export function publicLLMStatus(env: Env = process.env) {
  let main: LLMConfig | { provider: LLMProvider; model: string | null };
  try {
    main = resolveMainLLMConfig(env);
  } catch (err) {
    if (!(err instanceof LLMError) || err.code !== "llm_config" || !isLocalFirstEnv(env)) {
      throw err;
    }
    const desktop = readDesktopLLMSettings(env);
    const provider = env.LLM_PROVIDER
      ? asProvider(env.LLM_PROVIDER)
      : env.ANTHROPIC_API_KEY
        ? "anthropic"
        : asProvider(desktop?.provider, "ollama");
    const model =
      trim(env.LLM_MODEL) ||
      desktop?.model ||
      (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : provider === "gemini" ? DEFAULT_GEMINI_MODEL : null);
    main = { provider, model };
  }

  let fileFallback: LLMConfig | null = null;
  try {
    const file = resolveFileLLMConfig(env);
    fileFallback = file && PROVIDER_CAPABILITIES[file.provider].pdf && PROVIDER_CAPABILITIES[file.provider].vision
      ? file
      : resolveAnthropicFileFallback(env);
  } catch (err) {
    if (!(err instanceof LLMError) || err.code !== "llm_config" || !isLocalFirstEnv(env)) {
      throw err;
    }
    fileFallback = resolveAnthropicFileFallback(env);
  }

  return {
    provider: main.provider,
    model: main.model,
    fileProvider: fileFallback?.provider ?? null,
    fileModel: fileFallback?.model ?? null,
    capabilities: {
      ...PROVIDER_CAPABILITIES[main.provider],
      file: fileFallback ? PROVIDER_CAPABILITIES[fileFallback.provider] : { text: false, json: false, vision: false, pdf: false },
    },
  };
}
