import { readFileSync } from "node:fs";
import { LLMError } from "@/lib/llm/errors";
import type {
  LLMCapabilities,
  LLMConfig,
  LLMProvider,
  LLMRole,
  LLMRoleSelection,
  LLMRolesPrefs,
} from "@/lib/llm/types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_XAI_BASE_URL = "https://api.x.ai/v1";
export const DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const DEFAULT_KIMI_BASE_URL = "https://api.moonshot.ai/v1";
export const DEFAULT_MORPHEUS_BASE_URL = "https://api.mor.org/api/v1";
export const DEFAULT_DOCKER_MODEL_RUNNER_BASE_URL = "http://localhost:12434/engines/v1";
export const DEFAULT_MAX_TOKENS = 32000;
export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

const PROVIDER_LIST: LLMProvider[] = [
  "anthropic",
  "xai",
  "grok",
  "groq",
  "gemini",
  "ollama",
  "docker-model-runner",
  "morpheus",
  "kimi",
  "openai",
  "openai-compatible",
];
const PROVIDERS = new Set<LLMProvider>(PROVIDER_LIST);

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  ollama: "Ollama (local)",
  anthropic: "Anthropic",
  openai: "OpenAI",
  "openai-compatible": "OpenAI-compatible",
  xai: "xAI",
  grok: "Grok (xAI)",
  groq: "Groq",
  gemini: "Google Gemini",
  "docker-model-runner": "Docker Model Runner",
  morpheus: "Morpheus",
  kimi: "Kimi / Kimmy (Moonshot)",
};

const ROLE_ENV_PREFIX: Record<LLMRole, string> = {
  write: "LLM_WRITE",
  review: "LLM_REVIEW",
  revise: "LLM_REVISE",
};

export const PROVIDER_CAPABILITIES: Record<LLMProvider, LLMCapabilities> = {
  anthropic: { text: true, json: true, vision: true, pdf: true },
  openai: { text: true, json: true, vision: false, pdf: false },
  "openai-compatible": { text: true, json: true, vision: false, pdf: false },
  xai: { text: true, json: true, vision: false, pdf: false },
  grok: { text: true, json: true, vision: false, pdf: false },
  groq: { text: true, json: true, vision: false, pdf: false },
  ollama: { text: true, json: true, vision: false, pdf: false },
  "docker-model-runner": { text: true, json: true, vision: false, pdf: false },
  gemini: { text: true, json: true, vision: true, pdf: true },
  morpheus: { text: true, json: true, vision: false, pdf: false },
  kimi: { text: true, json: true, vision: false, pdf: false },
};

type Env = Record<string, string | undefined>;
interface DesktopLLMSettings {
  provider?: LLMProvider;
  model?: string;
  baseUrl?: string;
  roles?: Partial<Record<LLMRole, LLMRoleSelection>>;
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
    env.JACK_SCRIPT_LOCAL_FIRST === "true" ||
    env.DATA_BACKEND === "sqlite" ||
    Boolean(trim(env.JACK_SCRIPT_DB_PATH)) ||
    Boolean(trim(env.KINGS_PRESS_DB_PATH))
  );
}

function readDesktopLLMSettings(env: Env): DesktopLLMSettings | null {
  const path = trim(env.JACK_SCRIPT_LLM_SETTINGS_PATH) || trim(env.KINGS_PRESS_LLM_SETTINGS_PATH);
  if (!path) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const provider = typeof parsed.provider === "string" && PROVIDERS.has(parsed.provider as LLMProvider)
      ? (parsed.provider as LLMProvider)
      : undefined;
    const model = typeof parsed.model === "string" ? trim(parsed.model) : undefined;
    const baseUrl = typeof parsed.baseUrl === "string" ? trimBaseUrl(parsed.baseUrl) : undefined;
    const rolesRaw = parsed.roles;
    let roles: DesktopLLMSettings["roles"];
    if (rolesRaw && typeof rolesRaw === "object") {
      roles = {};
      for (const role of ["write", "review", "revise"] as LLMRole[]) {
        const entry = (rolesRaw as Record<string, unknown>)[role];
        if (!entry || typeof entry !== "object") continue;
        const row = entry as Record<string, unknown>;
        const rowProvider =
          typeof row.provider === "string" && PROVIDERS.has(row.provider as LLMProvider)
            ? (row.provider as LLMProvider)
            : undefined;
        const rowModel = typeof row.model === "string" ? trim(row.model) : undefined;
        const rowBaseUrl = typeof row.baseUrl === "string" ? trimBaseUrl(row.baseUrl) : undefined;
        const rowApiKey = typeof row.apiKey === "string" ? trim(row.apiKey) : undefined;
        if (rowProvider || rowModel || rowBaseUrl || rowApiKey) {
          roles[role] = { provider: rowProvider, model: rowModel, baseUrl: rowBaseUrl, apiKey: rowApiKey };
        }
      }
    }
    return { provider, model, baseUrl, roles };
  } catch {
    return null;
  }
}

function maxTokens(value: string | undefined): number {
  const n = Number.parseInt(value || "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_TOKENS;
}

function defaultModelForProvider(provider: LLMProvider): string {
  if (provider === "anthropic") return DEFAULT_ANTHROPIC_MODEL;
  if (provider === "gemini") return DEFAULT_GEMINI_MODEL;
  if (provider === "xai" || provider === "grok") return "grok-3-mini";
  if (provider === "groq") return "llama-3.3-70b-versatile";
  if (provider === "docker-model-runner") return "ai/smollm2";
  if (provider === "morpheus") return "llama-3.3-70b";
  if (provider === "kimi") return "kimi-k2.6";
  return "";
}

function providerHasCredentials(provider: LLMProvider, env: Env): boolean {
  if (provider === "ollama") return true;
  if (provider === "docker-model-runner") return true;
  if (provider === "anthropic") return Boolean(trim(env.ANTHROPIC_API_KEY) || trim(env.LLM_API_KEY));
  if (provider === "openai") return Boolean(trim(env.OPENAI_API_KEY) || trim(env.LLM_API_KEY));
  if (provider === "xai" || provider === "grok") {
    return Boolean(trim(env.XAI_API_KEY) || trim(env.GROK_API_KEY) || trim(env.LLM_API_KEY));
  }
  if (provider === "groq") return Boolean(trim(env.GROQ_API_KEY) || trim(env.LLM_API_KEY));
  if (provider === "gemini") {
    return Boolean(trim(env.GEMINI_API_KEY) || trim(env.GOOGLE_API_KEY) || trim(env.LLM_API_KEY));
  }
  if (provider === "morpheus") return Boolean(trim(env.MORPHEUS_API_KEY) || trim(env.MOR_API_KEY) || trim(env.LLM_API_KEY));
  if (provider === "kimi") return Boolean(trim(env.KIMI_API_KEY) || trim(env.MOONSHOT_API_KEY) || trim(env.LLM_API_KEY));
  if (provider === "openai-compatible") return Boolean(trimBaseUrl(env.LLM_BASE_URL));
  return false;
}

export function listAvailableProviders(env: Env = process.env) {
  return PROVIDER_LIST.map((id) => ({
    id,
    label: PROVIDER_LABELS[id],
    defaultModel: defaultModelForProvider(id),
    configured: providerHasCredentials(id, env),
  }));
}

function resolveApiKeyForProvider(
  provider: LLMProvider,
  env: Env,
  prefix?: string,
  main?: LLMConfig,
  selection?: LLMRoleSelection,
): string | undefined {
  const roleKey = prefix ? trim(env[`${prefix}_API_KEY`]) : undefined;
  if (roleKey) return roleKey;
  if (selection?.apiKey) return trim(selection.apiKey);
  if (main?.provider === provider && main.apiKey) return main.apiKey;
  return (
    trim(env.LLM_API_KEY) ||
    (provider === "anthropic" ? trim(env.ANTHROPIC_API_KEY) : undefined) ||
    (provider === "openai" ? trim(env.OPENAI_API_KEY) : undefined) ||
    (provider === "xai" || provider === "grok" ? trim(env.XAI_API_KEY) || trim(env.GROK_API_KEY) : undefined) ||
    (provider === "groq" ? trim(env.GROQ_API_KEY) : undefined) ||
    (provider === "gemini" ? trim(env.GEMINI_API_KEY) || trim(env.GOOGLE_API_KEY) : undefined) ||
    (provider === "morpheus" ? trim(env.MORPHEUS_API_KEY) || trim(env.MOR_API_KEY) : undefined) ||
    (provider === "kimi" ? trim(env.KIMI_API_KEY) || trim(env.MOONSHOT_API_KEY) : undefined)
  );
}

function defaultBaseUrlForProvider(provider: LLMProvider): string | undefined {
  if (provider === "ollama") return DEFAULT_OLLAMA_BASE_URL;
  if (provider === "docker-model-runner") return DEFAULT_DOCKER_MODEL_RUNNER_BASE_URL;
  if (provider === "openai") return DEFAULT_OPENAI_BASE_URL;
  if (provider === "xai" || provider === "grok") return DEFAULT_XAI_BASE_URL;
  if (provider === "groq") return DEFAULT_GROQ_BASE_URL;
  if (provider === "gemini") return DEFAULT_GEMINI_BASE_URL;
  if (provider === "morpheus") return DEFAULT_MORPHEUS_BASE_URL;
  if (provider === "kimi") return DEFAULT_KIMI_BASE_URL;
  return undefined;
}

function resolveBaseUrlForProvider(
  provider: LLMProvider,
  env: Env,
  prefix?: string,
  main?: LLMConfig,
  desktop?: DesktopLLMSettings | null,
  selection?: LLMRoleSelection,
): string | undefined {
  const roleBase = prefix ? trimBaseUrl(env[`${prefix}_BASE_URL`]) : undefined;
  if (roleBase) return roleBase;
  if (selection?.baseUrl) return trimBaseUrl(selection.baseUrl);
  if (main?.provider === provider && main.baseUrl) return main.baseUrl;
  if (provider === "ollama") return desktop?.baseUrl || DEFAULT_OLLAMA_BASE_URL;
  if (provider === "openai-compatible") return trimBaseUrl(env.LLM_BASE_URL) || (desktop?.provider === provider ? desktop.baseUrl : undefined);
  return defaultBaseUrlForProvider(provider) || (desktop?.provider === provider ? desktop.baseUrl : undefined);
}

function assertProviderConfigured(provider: LLMProvider, apiKey: string | undefined, baseUrl: string | undefined) {
  if (provider === "anthropic" && !apiKey) {
    throw new LLMError(500, "llm_config", "Missing LLM_API_KEY or ANTHROPIC_API_KEY in server environment.", provider);
  }
  if (provider === "openai-compatible" && !baseUrl) {
    throw new LLMError(500, "llm_config", "Missing LLM_BASE_URL for openai-compatible provider.", provider);
  }
  if (provider === "docker-model-runner" && !baseUrl) {
    throw new LLMError(500, "llm_config", "Missing Docker Model Runner base URL.", provider);
  }
  if (provider === "openai" && !apiKey) {
    throw new LLMError(500, "llm_config", "Missing LLM_API_KEY or OPENAI_API_KEY in server environment.", provider);
  }
  if ((provider === "xai" || provider === "grok") && !apiKey) {
    throw new LLMError(
      500,
      "llm_config",
      "Missing LLM_API_KEY, XAI_API_KEY, or GROK_API_KEY in server environment.",
      provider,
    );
  }
  if (provider === "groq" && !apiKey) {
    throw new LLMError(500, "llm_config", "Missing LLM_API_KEY or GROQ_API_KEY in server environment.", provider);
  }
  if (provider === "gemini" && !apiKey) {
    throw new LLMError(
      500,
      "llm_config",
      "Missing LLM_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY in server environment.",
      provider,
    );
  }
  if (provider === "morpheus" && !apiKey) {
    throw new LLMError(500, "llm_config", "Missing LLM_API_KEY, MORPHEUS_API_KEY, or MOR_API_KEY in server environment.", provider);
  }
  if (provider === "kimi" && !apiKey) {
    throw new LLMError(500, "llm_config", "Missing LLM_API_KEY, KIMI_API_KEY, or MOONSHOT_API_KEY in server environment.", provider);
  }
}

function buildProviderConfig(
  provider: LLMProvider,
  model: string,
  env: Env,
  opts: {
    prefix?: string;
    main?: LLMConfig;
    desktop?: DesktopLLMSettings | null;
    selection?: LLMRoleSelection;
  } = {},
): LLMConfig {
  const apiKey = resolveApiKeyForProvider(provider, env, opts.prefix, opts.main, opts.selection);
  const baseUrl = resolveBaseUrlForProvider(provider, env, opts.prefix, opts.main, opts.desktop, opts.selection);
  assertProviderConfigured(provider, apiKey, baseUrl);
  return { provider, model, maxTokens: maxTokens(env.LLM_MAX_TOKENS), apiKey, baseUrl };
}

/** Resolve the LLM config for a task role (write / review / revise). Falls back to main when unset. */
export function resolveRoleLLMConfig(
  role: LLMRole,
  env: Env = process.env,
  rolePrefs?: LLMRolesPrefs,
): LLMConfig {
  const main = resolveMainLLMConfig(env);
  const prefix = ROLE_ENV_PREFIX[role];
  const desktop = readDesktopLLMSettings(env);
  const prefSel = rolePrefs?.[role];
  const desktopRole = desktop?.roles?.[role];

  const explicitProvider =
    trim(env[`${prefix}_PROVIDER`]) || prefSel?.provider || desktopRole?.provider || undefined;
  if (!explicitProvider) return main;

  const provider = asProvider(explicitProvider);
  const model =
    trim(env[`${prefix}_MODEL`]) ||
    prefSel?.model ||
    desktopRole?.model ||
    (provider === main.provider ? main.model : undefined) ||
    defaultModelForProvider(provider);
  if (!model) {
    throw new LLMError(500, "llm_config", `Missing model for ${role} role (${provider}).`, provider);
  }

  return buildProviderConfig(provider, model, env, {
    prefix,
    main,
    desktop,
    selection: prefSel || desktopRole,
  });
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
    defaultModelForProvider(provider);
  if (!model) throw new LLMError(500, "llm_config", "Missing LLM_MODEL in server environment.", provider);

  const apiKey = resolveApiKeyForProvider(provider, env);
  const baseUrl =
    trimBaseUrl(env.LLM_BASE_URL) ||
    (desktop?.provider === provider ? desktop.baseUrl : undefined) ||
    defaultBaseUrlForProvider(provider);

  assertProviderConfigured(provider, apiKey, baseUrl);
  return { provider, model, maxTokens: maxTokens(env.LLM_MAX_TOKENS), apiKey, baseUrl };
}

export function resolveFileLLMConfig(env: Env = process.env): LLMConfig | null {
  const main = resolveMainLLMConfig(env);
  const explicitProvider = trim(env.LLM_FILE_PROVIDER);
  const provider = explicitProvider ? asProvider(explicitProvider) : main.provider;

  const model =
    trim(env.LLM_FILE_MODEL) ||
    (provider === main.provider ? main.model : undefined) ||
    defaultModelForProvider(provider);
  if (!model) throw new LLMError(500, "llm_config", "Missing LLM_FILE_MODEL for file provider.", provider);

  const apiKey = trim(env.LLM_FILE_API_KEY) || (provider === main.provider ? main.apiKey : undefined) || resolveApiKeyForProvider(provider, env);
  const baseUrl =
    trimBaseUrl(env.LLM_FILE_BASE_URL) || (provider === main.provider ? main.baseUrl : undefined) || defaultBaseUrlForProvider(provider);

  if (provider === "anthropic" && !apiKey) {
    return null;
  }
  if (provider === "openai-compatible" && !baseUrl) {
    throw new LLMError(500, "llm_config", "Missing LLM_FILE_BASE_URL for openai-compatible file provider.", provider);
  }
  if ((provider === "openai" || provider === "xai" || provider === "grok" || provider === "groq" || provider === "morpheus" || provider === "kimi") && !apiKey) {
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

function safeRoleStatus(role: LLMRole, env: Env, rolePrefs?: LLMRolesPrefs) {
  try {
    const cfg = resolveRoleLLMConfig(role, env, rolePrefs);
    return { provider: cfg.provider, model: cfg.model, configured: true };
  } catch (err) {
    if (err instanceof LLMError && err.code === "llm_config" && isLocalFirstEnv(env)) {
      const pref = rolePrefs?.[role];
      const provider = trim(env[`${ROLE_ENV_PREFIX[role]}_PROVIDER`]) || pref?.provider || null;
      return { provider, model: pref?.model ?? null, configured: false };
    }
    throw err;
  }
}

export function publicLLMStatus(env: Env = process.env, rolePrefs?: LLMRolesPrefs) {
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

  const write = safeRoleStatus("write", env, rolePrefs);
  const review = safeRoleStatus("review", env, rolePrefs);
  const revise = safeRoleStatus("revise", env, rolePrefs);

  return {
    provider: main.provider,
    model: main.model,
    roles: { write, review, revise },
    availableProviders: listAvailableProviders(env),
    fileProvider: fileFallback?.provider ?? null,
    fileModel: fileFallback?.model ?? null,
    capabilities: {
      ...PROVIDER_CAPABILITIES[main.provider],
      file: fileFallback ? PROVIDER_CAPABILITIES[fileFallback.provider] : { text: false, json: false, vision: false, pdf: false },
    },
  };
}
