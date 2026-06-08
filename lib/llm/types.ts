export type LLMProvider =
  | "anthropic"
  | "openai"
  | "openai-compatible"
  | "xai"
  | "grok"
  | "groq"
  | "ollama"
  | "docker-model-runner"
  | "gemini"
  | "morpheus"
  | "kimi";

/** Task-specific LLM routing — write, review (coverage), revise (rewrite pass). */
export type LLMRole = "write" | "review" | "revise";

export interface LLMRoleSelection {
  provider?: LLMProvider;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
}

export type LLMRolesPrefs = Partial<Record<LLMRole, LLMRoleSelection>>;

export interface LLMCapabilities {
  text: boolean;
  json: boolean;
  vision: boolean;
  pdf: boolean;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIOptions {
  system?: string;
}

export interface AI {
  complete(messages: AIMessage[], system?: string): Promise<string>;
  json<T = unknown>(prompt: string, opts?: AIOptions): Promise<T>;
  text(prompt: string, opts?: AIOptions): Promise<string>;
  extractJSON<T = unknown>(text: string): T | null;
  repairJSON<T = unknown>(text: string): T | null;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  maxTokens: number;
  apiKey?: string;
  baseUrl?: string;
}

export type MultimodalContentBlock =
  | { type: "text"; text: string }
  | {
      type: "document" | "image";
      source: {
        type: "base64";
        media_type: string;
        data: string;
      };
    };

/** @deprecated Use MultimodalContentBlock. */
export type AnthropicContentBlock = MultimodalContentBlock;

export interface LLMAdapter {
  provider: LLMProvider;
  model: string;
  capabilities: LLMCapabilities;
  complete(messages: AIMessage[]): Promise<string>;
  completeBlocks?(content: MultimodalContentBlock[], system?: string): Promise<string>;
}
