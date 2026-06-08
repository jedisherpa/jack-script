/* Per-task LLM provider picker — write, review, revise. */

function LlmSettingsModal({ open, onClose }) {
  const [status, setStatus] = React.useState(null);
  const [roles, setRoles] = React.useState({ write: {}, review: {}, revise: {} });
  const [tests, setTests] = React.useState({});
  const [providerModels, setProviderModels] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const desktop = window.JACK_DESKTOP || window.KINGS_DESKTOP;

  const load = React.useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/llm/status", { credentials: "same-origin", headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error("Could not load LLM status.");
      const data = await r.json();
      setStatus(data);
      const saved = (window.Store.getPref("llmRoles", {}) || {});
      const desktopSaved = desktop && desktop.isDesktop && desktop.isDesktop() && desktop.getModelChoice
        ? await desktop.getModelChoice().catch(() => null)
        : null;
      const desktopRoles = (desktopSaved && desktopSaved.roles) || {};
      const merged = { write: {}, review: {}, revise: {} };
      ["write", "review", "revise"].forEach((role) => {
        const active = (data.roles && data.roles[role]) || {};
        const pref = saved[role] || {};
        const desk = desktopRoles[role] || {};
        merged[role] = {
          provider: desk.provider || pref.provider || active.provider || (data.provider && role === "write" ? data.provider : "") || "",
          model: desk.model || pref.model || active.model || "",
          baseUrl: desk.baseUrl || pref.baseUrl || "",
          apiKey: desk.apiKey || "",
        };
      });
      setRoles(merged);
    } catch (e) {
      setMessage((e && e.message) || "Failed to load providers.");
    }
    setBusy(false);
  }, []);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  const knownProviders = [
    { id: "anthropic", label: "Anthropic", defaultModel: "claude-haiku-4-5" },
    { id: "xai", label: "xAI", defaultModel: "grok-3-mini", baseUrl: "https://api.x.ai/v1" },
    { id: "grok", label: "Grok (xAI)", defaultModel: "grok-3-mini", baseUrl: "https://api.x.ai/v1" },
    { id: "groq", label: "Groq", defaultModel: "llama-3.3-70b-versatile" },
    { id: "gemini", label: "Google Gemini", defaultModel: "gemini-2.5-flash" },
    { id: "ollama", label: "Ollama (local)", defaultModel: "llama3.2", baseUrl: "http://127.0.0.1:11434" },
    { id: "docker-model-runner", label: "Docker Model Runner", defaultModel: "ai/smollm2", baseUrl: "http://localhost:12434/engines/v1" },
    { id: "morpheus", label: "Morpheus", defaultModel: "llama-3.3-70b", baseUrl: "https://api.mor.org/api/v1" },
    { id: "kimi", label: "Kimi / Kimmy (Moonshot)", defaultModel: "kimi-k2.6", baseUrl: "https://api.moonshot.ai/v1" },
    { id: "openai", label: "OpenAI", defaultModel: "gpt-4o-mini" },
    { id: "openai-compatible", label: "OpenAI-compatible", defaultModel: "" },
  ];
  const serverProviders = (status && status.availableProviders) || [];
  const byId = {};
  knownProviders.concat(serverProviders).forEach((p) => { byId[p.id] = Object.assign({}, byId[p.id] || {}, p); });
  const providerOptions = knownProviders.map((p) => byId[p.id]);
  const keylessProviders = new Set(["ollama", "docker-model-runner"]);
  const requiresApiKey = (provider) => provider && !keylessProviders.has(provider);
  const showsBaseUrl = (provider) => ["docker-model-runner", "openai-compatible", "xai", "grok", "morpheus", "kimi"].includes(provider);

  const setRole = (role, patch) => {
    setRoles((prev) => Object.assign({}, prev, { [role]: Object.assign({}, prev[role], patch) }));
  };

  const loadProviderModels = async (role, provider, baseUrl) => {
    if (provider !== "docker-model-runner") return;
    try {
      const r = await fetch(`/api/llm/models?provider=docker-model-runner&baseUrl=${encodeURIComponent(baseUrl || "http://localhost:12434/engines/v1")}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const data = await r.json().catch(() => ({}));
      const list = Array.isArray(data.models) ? data.models : [];
      if (!list.length) return;
      setProviderModels((prev) => Object.assign({}, prev, { [role]: list }));
      setRoles((prev) => {
        const row = prev[role] || {};
        if (list.includes(row.model)) return prev;
        return Object.assign({}, prev, { [role]: Object.assign({}, row, { model: list[0] }) });
      });
    } catch (_) {}
  };

  const onProviderChange = (role, provider) => {
    const meta = providerOptions.find((p) => p.id === provider);
    const baseUrl = (meta && meta.baseUrl) || (roles[role] && roles[role].baseUrl) || "";
    setRole(role, {
      provider,
      model: (roles[role] && roles[role].model) || (meta && meta.defaultModel) || "",
      baseUrl,
      apiKey: roles[role] && roles[role].apiKey,
    });
    loadProviderModels(role, provider, baseUrl);
  };

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      const payload = {};
      ["write", "review", "revise"].forEach((role) => {
        const row = roles[role] || {};
        if (row.provider) {
          payload[role] = {
            provider: row.provider,
            model: (row.model || "").trim() || undefined,
            baseUrl: row.baseUrl || (providerOptions.find((p) => p.id === row.provider) || {}).baseUrl,
            apiKey: (row.apiKey || "").trim() || undefined,
          };
        }
      });
      if (desktop && desktop.isDesktop && desktop.isDesktop() && desktop.saveAiRoles) {
        await desktop.saveAiRoles(payload);
      }
      const publicPayload = {};
      ["write", "review", "revise"].forEach((role) => {
        const row = payload[role] || {};
        if (row.provider) publicPayload[role] = { provider: row.provider, model: row.model, baseUrl: row.baseUrl };
      });
      window.Store.setLlmRoles(publicPayload);
      await load();
      setMessage(desktop && desktop.isDesktop && desktop.isDesktop()
        ? "Saved. API keys are stored in the local desktop settings file, not the settings database."
        : "Saved provider names. API keys entered here are only used by Test unless they are also in server env.");
    } catch (e) {
      setMessage((e && e.message) || "Could not save.");
    }
    setBusy(false);
  };

  const testRole = async (role) => {
    const row = roles[role] || {};
    const payload = {
      role,
      provider: row.provider || undefined,
      model: (row.model || "").trim() || undefined,
      baseUrl: row.baseUrl || (providerOptions.find((p) => p.id === row.provider) || {}).baseUrl || undefined,
      apiKey: (row.apiKey || "").trim() || undefined,
    };
    setTests((prev) => Object.assign({}, prev, { [role]: { busy: true, ok: false, message: "Testing model..." } }));
    try {
      const r = await fetch("/api/llm/test", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Model test failed.");
      setTests((prev) => Object.assign({}, prev, {
        [role]: {
          busy: false,
          ok: true,
          message: `${data.provider}${data.model ? " · " + data.model : ""} replied in ${data.elapsedMs}ms: ${data.reply || "OK"}`,
        },
      }));
    } catch (e) {
      setTests((prev) => Object.assign({}, prev, {
        [role]: { busy: false, ok: false, message: (e && e.message) || "Model test failed." },
      }));
    }
  };

  if (!open) return null;

  const roleMeta = {
    write: { title: "Write", blurb: "Drafting, polish, artifacts, weave, voice scripts" },
    review: { title: "Review", blurb: "Script coverage gates (7-pass analysis)" },
    revise: { title: "Revise", blurb: "Proposed revision from coverage findings" },
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 210, background: "oklch(0 0 0 / 0.28)", display: "grid", placeItems: "center", padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width: "min(720px, 100%)", padding: "24px 26px", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>AI providers</div>
            <h2 style={{ fontSize: 28, margin: 0 }}>Task-specific models</h2>
            <p className="muted" style={{ fontSize: 15, lineHeight: 1.5, margin: "8px 0 0" }}>
              Assign a different provider to writing, coverage review, and revision. API keys stay server-side; desktop keys save only to the local desktop settings file.
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close"><Icon name="xLogo" size={16} /></button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {["write", "review", "revise"].map((role) => {
            const meta = roleMeta[role];
            const row = roles[role] || {};
            const active = status && status.roles && status.roles[role];
            const test = tests[role] || {};
            const provider = row.provider || "";
            return (
              <div key={role} className="card" style={{ padding: "14px 16px", borderRadius: "var(--radius)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{meta.title}</div>
                    <div className="muted" style={{ fontSize: 13 }}>{meta.blurb}</div>
                  </div>
                  {active && active.configured && (
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", alignSelf: "center" }}>
                      Active: {active.provider}{active.model ? " · " + active.model : ""}
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto", gap: 10, alignItems: "end" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span className="eyebrow">Provider</span>
                    <select className="field" value={row.provider || ""} disabled={busy}
                      onChange={(e) => onProviderChange(role, e.target.value)}>
                      <option value="">Default (main)</option>
                      {providerOptions.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span className="eyebrow">Model</span>
                    <input className="field" value={row.model || ""} disabled={busy} list={`llm-model-options-${role}`}
                      placeholder={(providerOptions.find((p) => p.id === row.provider) || {}).defaultModel || "model name"}
                      onChange={(e) => setRole(role, { model: e.target.value })} />
                  </label>
                  <button className="btn" disabled={busy || test.busy} onClick={() => testRole(role)} title={`Test ${meta.title} model`}>
                    {test.busy ? <Spinner size={14} /> : <Icon name="sparkle" size={14} />} Test
                  </button>
                </div>
                <datalist id={`llm-model-options-${role}`}>
                  {(providerModels[role] || []).map((m) => <option key={m} value={m} />)}
                </datalist>
                {(requiresApiKey(provider) || showsBaseUrl(provider)) && (
                  <div style={{ display: "grid", gridTemplateColumns: requiresApiKey(provider) && showsBaseUrl(provider) ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 10, marginTop: 10 }}>
                    {requiresApiKey(provider) && (
                      <label style={{ display: "grid", gap: 6 }}>
                        <span className="eyebrow">API key</span>
                        <input className="field" type="password" value={row.apiKey || ""} disabled={busy}
                          placeholder={provider === "grok" || provider === "xai" ? "XAI_API_KEY / GROK_API_KEY" : "Provider API key"}
                          onChange={(e) => setRole(role, { apiKey: e.target.value })} />
                      </label>
                    )}
                    {showsBaseUrl(provider) && (
                      <label style={{ display: "grid", gap: 6 }}>
                        <span className="eyebrow">Base URL</span>
                        <input className="field" value={row.baseUrl || (providerOptions.find((p) => p.id === provider) || {}).baseUrl || ""} disabled={busy}
                          placeholder="https://.../v1"
                          onChange={(e) => {
                            setRole(role, { baseUrl: e.target.value });
                            loadProviderModels(role, provider, e.target.value);
                          }} />
                      </label>
                    )}
                  </div>
                )}
                {test.message && (
                  <div style={{ marginTop: 9, fontSize: 12.5, color: test.ok ? "var(--accent-ink)" : "var(--sev-must)" }}>
                    {test.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="muted" style={{ fontSize: 13, marginTop: 14, lineHeight: 1.5 }}>
          Providers: Anthropic, xAI, Gemini, Docker Model Runner, Ollama, Morpheus, Grok, Groq, and Kimi / Kimmy. Configure cloud keys in <span className="mono">.env.local</span> (e.g. <span className="mono">ANTHROPIC_API_KEY</span>, <span className="mono">XAI_API_KEY</span>, <span className="mono">GROQ_API_KEY</span>, <span className="mono">GEMINI_API_KEY</span>, <span className="mono">MORPHEUS_API_KEY</span>, <span className="mono">KIMI_API_KEY</span>) or use Ollama / Docker locally. Env overrides: <span className="mono">LLM_WRITE_*</span>, <span className="mono">LLM_REVIEW_*</span>, <span className="mono">LLM_REVISE_*</span>.
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn primary" disabled={busy} onClick={save}><Icon name="sparkle" size={14} /> Save providers</button>
          <button className="btn ghost" disabled={busy} onClick={load}>Refresh</button>
          {message && <span style={{ fontSize: 14, color: "var(--accent-ink)" }}>{message}</span>}
        </div>
      </div>
    </div>
  );
}
