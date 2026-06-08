/* App root — topbar, routing, role + theme, and the piece Workspace
   that orchestrates the sequential gate run. */

function useStore() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => window.Store.subscribe(force), []);
  return window.Store.getState();
}

function EditableTitle({ value, onCommit }) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => { setV(value); }, [value]);
  return (
    <input value={v} onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() && v !== value && onCommit(v.trim())}
      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
      style={{
        fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, letterSpacing: "-0.01em",
        border: "1px solid transparent", background: "transparent", color: "var(--ink)",
        padding: "2px 6px", marginInline: -6, borderRadius: 6, width: "min(560px, 50vw)",
      }}
      onFocus={(e) => { e.target.style.background = "var(--paper-sunk)"; e.target.style.borderColor = "var(--hair)"; }}
      onMouseLeave={(e) => { if (document.activeElement !== e.target) { e.target.style.borderColor = "transparent"; } }}
    />
  );
}

function Workspace({ piece, refs, onBack, onGoStudio, onUpdatePiece }) {
  return (
    <ProductionWorkspace piece={piece} refs={refs} onBack={onBack} onGoStudio={onGoStudio}
      onUpdatePiece={(p) => onUpdatePiece && onUpdatePiece(p)} />
  );
}

function MediaTab({ piece, onGoStudio }) {
  const items = window.Store.mediaForPiece(piece.id);
  const pieces = window.Store.getState().pieces.filter((p) => p.campaignId === piece.campaignId);
  const newInStudio = (type) => { window.__studioPrefill = { type, pieceId: piece.id, script: (piece.revision && piece.revision.text) || piece.original || "" }; onGoStudio && onGoStudio(); };
  return (
    <div className="scroll-y" style={{ flex: 1 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "30px 32px 90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Attached media</div>
            <p className="muted" style={{ fontSize: 15, margin: 0 }}>Imagery, voiceovers, and video generated for this piece.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => newInStudio("image")}><Icon name="image" size={14} /> New image</button>
            <button className="btn primary" onClick={() => newInStudio("avatar")}><Icon name="film" size={14} /> New video</button>
          </div>
        </div>
        <MediaLibrary items={items} pieces={pieces}
          empty={"No media attached yet. Generate some in the Studio — it'll link back here."}
          onAttach={(id, pid) => window.Store.attachMediaToPiece(id, pid)}
          onDelete={(m) => window.Store.removeMedia(m.id)} />
      </div>
    </div>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "typeface": "Literary",
  "accent": "oklch(0.520 0.118 38)",
  "readingSize": 17.5
}/*EDITMODE-END*/;

const TYPEFACES = {
  Literary: { display: '"Newsreader", Georgia, serif', body: '"Spectral", Georgia, serif', note: "Newsreader + Spectral" },
  Newsroom: { display: '"Source Serif 4", Georgia, serif', body: '"Source Serif 4", Georgia, serif', note: "Source Serif" },
  Quiet:    { display: '"Spectral", Georgia, serif', body: '"Spectral", Georgia, serif', note: "Spectral throughout" },
};

function TweaksLayer({ theme }) {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => {
    const root = document.documentElement;
    const f = TYPEFACES[t.typeface] || TYPEFACES.Literary;
    root.style.setProperty("--font-display", f.display);
    root.style.setProperty("--font-body", f.body);
  }, [t.typeface]);
  React.useEffect(() => {
    const DARK_ACCENT = {
      "oklch(0.520 0.118 38)": "oklch(0.660 0.120 42)",
      "oklch(0.500 0.090 250)": "oklch(0.660 0.090 250)",
      "oklch(0.480 0.080 150)": "oklch(0.660 0.085 150)",
      "oklch(0.480 0.110 330)": "oklch(0.660 0.105 330)",
    };
    const v = (theme === "dark" && DARK_ACCENT[t.accent]) ? DARK_ACCENT[t.accent] : t.accent;
    document.documentElement.style.setProperty("--accent", v);
  }, [t.accent, theme]);
  React.useEffect(() => {
    document.body.style.fontSize = (t.readingSize || 17.5) + "px";
  }, [t.readingSize]);

  return (
    <window.TweaksPanel title="Tweaks">
      <window.TweakSection label="Typeface" />
      <window.TweakRadio label="Pairing" value={t.typeface}
        options={["Literary", "Newsroom", "Quiet"]}
        onChange={(v) => setTweak("typeface", v)} />
      <window.TweakSlider label="Reading size" value={t.readingSize} min={15} max={20} step={0.5} unit="px"
        onChange={(v) => setTweak("readingSize", v)} />
      <window.TweakSection label="Accent" />
      <window.TweakColor label="House color" value={t.accent}
        options={["oklch(0.520 0.118 38)", "oklch(0.500 0.090 250)", "oklch(0.480 0.080 150)", "oklch(0.480 0.110 330)"]}
        onChange={(v) => setTweak("accent", v)} />
    </window.TweaksPanel>
  );
}

function RoleSwitch({ role, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, background: "var(--paper-sunk)", borderRadius: 999, padding: 3 }}>
      {[["author", "Author"], ["assistant", "Assistant"]].map(([id, l]) => (
        <button key={id} onClick={() => onChange(id)} className="mono" title={id === "assistant" ? "Assistant can edit drafts & outputs, but not References" : "Full access"}
          style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", padding: "5px 11px", borderRadius: 999, border: "none", cursor: "pointer",
            background: role === id ? "var(--paper-2)" : "transparent", color: role === id ? "var(--ink)" : "var(--ink-3)",
            boxShadow: role === id ? "var(--shadow-sm)" : "none" }}>{l}</button>
      ))}
    </div>
  );
}

function CampaignSwitcher({ campaigns, activeId, onSelect, onAdd }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const active = campaigns.find((c) => c.id === activeId) || campaigns[0];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} title="Switch project"
        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          border: "1px solid var(--hair-2)", background: "var(--paper-2)", color: "var(--ink)",
          borderRadius: 999, padding: "6px 12px", height: 34 }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--accent)" }} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: 15, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active && active.name}</span>
        <Icon name="chevD" size={14} style={{ color: "var(--ink-3)" }} />
      </button>
      {open && (
        <div className="card" style={{ position: "absolute", top: 42, right: 0, width: 248, padding: 6, zIndex: 60, boxShadow: "var(--shadow-lg)", maxHeight: "70vh", overflowY: "auto" }}>
          <div className="eyebrow" style={{ padding: "6px 10px 4px" }}>Project</div>
          {campaigns.map((c) => {
            const on = c.id === activeId;
            return (
              <button key={c.id} onClick={() => { onSelect(c.id); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  border: "none", background: on ? "var(--accent-soft)" : "transparent", cursor: "pointer",
                  borderRadius: "var(--radius)", padding: "9px 10px", color: on ? "var(--accent-ink)" : "var(--ink)",
                  fontFamily: "var(--font-body)", fontSize: 15, textAlign: "left" }}
                onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--paper-sunk)"; }}
                onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: on ? "var(--accent)" : "var(--hair-2)" }} />
                  {c.name}
                </span>
                {on && <Icon name="check" size={15} />}
              </button>
            );
          })}
          <hr className="rule" style={{ margin: "5px 4px" }} />
          <button onClick={() => { const n = prompt("New project name"); if (n && n.trim()) onAdd(n.trim()); setOpen(false); }}
            className="mono" style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--ink-3)", fontSize: 12, letterSpacing: "0.04em" }}>
            <Icon name="plus" size={13} /> NEW PROJECT
          </button>
        </div>
      )}
    </div>
  );
}

function DesktopOnboarding() {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const [models, setModels] = React.useState([]);
  const [roles, setRoles] = React.useState({
    write: { provider: "ollama", model: "llama3.2" },
    review: { provider: "ollama", model: "llama3.2" },
    revise: { provider: "ollama", model: "llama3.2" },
  });
  const [tests, setTests] = React.useState({});
  const [providerModels, setProviderModels] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const desktop = window.JACK_DESKTOP || window.KINGS_DESKTOP;
  const providerOptions = [
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
  const keylessProviders = new Set(["ollama", "docker-model-runner"]);
  const requiresApiKey = (provider) => provider && !keylessProviders.has(provider);
  const showsBaseUrl = (provider) => ["docker-model-runner", "openai-compatible", "xai", "grok", "morpheus", "kimi"].includes(provider);
  const modelOptions = ["llama3.2", "mistral", "qwen2.5:7b", "gemma3:4b"];
  const roleMeta = {
    write: { title: "Write", blurb: "Drafting, polish, voice scripts, artifacts" },
    review: { title: "Review", blurb: "Seven screenplay coverage gates" },
    revise: { title: "Revise", blurb: "Dialogue, tone, and structural passes" },
  };

  React.useEffect(() => {
    if (!desktop || !desktop.isDesktop()) return;
    const done =
      window.localStorage.getItem("jackscript.desktopSetupComplete") === "true" ||
      window.localStorage.getItem("kingspress.desktopSetupComplete") === "true";
    setOpen(!done);
    refresh();

    let active = true;
    let unlisten = null;
    desktop.onShowModelSetup((() => {
      if (!active) return;
      setOpen(true);
      refresh();
    })).then((fn) => {
      unlisten = fn;
      if (!active && typeof unlisten === "function") unlisten();
    }).catch(() => {});

    return () => {
      active = false;
      if (typeof unlisten === "function") unlisten();
    };
  }, []);

  const refresh = async () => {
    if (!desktop || !desktop.isDesktop()) return;
    try {
      await desktop.initLocalDatabase();
      const [s, list, saved] = await Promise.all([
        desktop.ollamaStatus().catch((e) => ({ installed: false, running: false, message: e.message })),
        desktop.listOllamaModels().catch(() => []),
        desktop.getModelChoice().catch(() => null),
      ]);
      setStatus(s);
      setModels(list || []);
      const savedRoles = (saved && saved.roles) || null;
      if (savedRoles && typeof savedRoles === "object") {
        setRoles((prev) => {
          const next = Object.assign({}, prev);
          ["write", "review", "revise"].forEach((role) => {
            next[role] = Object.assign({}, prev[role], savedRoles[role] || {});
          });
          return next;
        });
      } else if (saved && saved.model) {
        setRoles({
          write: { provider: saved.provider || "ollama", model: saved.model },
          review: { provider: saved.provider || "ollama", model: saved.model },
          revise: { provider: saved.provider || "ollama", model: saved.model },
        });
      } else if (list && list.length) {
        setRoles({
          write: { provider: "ollama", model: list[0] },
          review: { provider: "ollama", model: list[0] },
          revise: { provider: "ollama", model: list[0] },
        });
      }
    } catch (e) {
      setMessage((e && e.message) || "Desktop setup check failed.");
    }
  };

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
    const baseUrl = meta && meta.baseUrl;
    setRole(role, {
      provider,
      model: (meta && meta.defaultModel) || roles[role].model || "",
      baseUrl,
      apiKey: roles[role] && roles[role].apiKey,
    });
    loadProviderModels(role, provider, baseUrl);
  };

  const primaryOllamaModel = (() => {
    const found = ["write", "review", "revise"].map((role) => roles[role]).find((row) => row.provider === "ollama" && row.model);
    return (found && found.model) || "llama3.2";
  })();

  const pullModel = async () => {
    if (!primaryOllamaModel.trim()) return;
    setBusy(true); setMessage("Downloading " + primaryOllamaModel + ". This can take a while.");
    try {
      await desktop.pullOllamaModel(primaryOllamaModel.trim());
      await refresh();
      setMessage("Model is ready.");
    } catch (e) {
      setMessage((e && e.message) || "Could not download the model.");
    }
    setBusy(false);
  };

  const startOllama = async () => {
    setBusy(true); setMessage("Starting Ollama.");
    try {
      await desktop.startOllama();
      await refresh();
      setMessage("Ollama is running.");
    } catch (e) {
      setMessage((e && e.message) || "Could not start Ollama.");
    }
    setBusy(false);
  };

  const finish = async () => {
    setBusy(true);
    const payload = {};
    ["write", "review", "revise"].forEach((role) => {
      const row = roles[role] || {};
      payload[role] = {
        provider: row.provider || "ollama",
        model: (row.model || "").trim() || undefined,
        baseUrl: row.baseUrl || (providerOptions.find((p) => p.id === row.provider) || {}).baseUrl,
        apiKey: (row.apiKey || "").trim() || undefined,
      };
    });
    try {
      if (desktop.saveAiRoles) await desktop.saveAiRoles(payload);
      else await desktop.saveModelChoice((payload.write && payload.write.model) || "llama3.2");
      if (window.Store && window.Store.setLlmRoles) {
        const publicPayload = {};
        ["write", "review", "revise"].forEach((role) => {
          const row = payload[role] || {};
          publicPayload[role] = { provider: row.provider, model: row.model, baseUrl: row.baseUrl };
        });
        window.Store.setLlmRoles(publicPayload);
      }
      window.localStorage.setItem("jackscript.desktopSetupComplete", "true");
      setOpen(false);
    } catch (e) {
      if (window.Store && window.Store.setLlmRoles) {
        const publicPayload = {};
        ["write", "review", "revise"].forEach((role) => {
          const row = payload[role] || {};
          publicPayload[role] = { provider: row.provider, model: row.model, baseUrl: row.baseUrl };
        });
        window.Store.setLlmRoles(publicPayload);
      }
      window.localStorage.setItem("jackscript.desktopSetupComplete", "true");
      setOpen(false);
      console.warn("[DesktopSetup] Could not save provider choices:", e);
    }
    setBusy(false);
  };

  const testRole = async (role) => {
    const row = roles[role] || {};
    const payload = {
      role,
      provider: row.provider || undefined,
      model: (row.model || "").trim() || undefined,
      baseUrl: row.baseUrl || (providerOptions.find((p) => p.id === row.provider) || {}).baseUrl,
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
  const installed = !!(status && status.installed);
  const running = !!(status && status.running);
  const hasModel = models.includes(primaryOllamaModel);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "oklch(0 0 0 / 0.28)", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ width: "min(760px, 100%)", padding: "24px 26px", boxShadow: "var(--shadow-lg)" }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Jack Script desktop setup</div>
        <h2 style={{ fontSize: 30, marginBottom: 10 }}>Choose AI providers</h2>
        <p className="muted" style={{ fontSize: 15.5, lineHeight: 1.55 }}>
          Assign models for writing, coverage review, and revision. API keys stay server-side; desktop keys save only to the local desktop settings file.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
          <div className="card" style={{ padding: 12, borderRadius: "var(--radius)" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>OLLAMA</div>
            <div style={{ fontSize: 15 }}>{installed ? (running ? "Installed and running" : "Installed, not running") : "Not detected"}</div>
          </div>
          <div className="card" style={{ padding: 12, borderRadius: "var(--radius)" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>LOCAL MODELS</div>
            <div style={{ fontSize: 15 }}>{models.length ? models.join(", ") : "None found yet"}</div>
          </div>
        </div>
        {!installed && <p style={{ marginTop: 14, fontSize: 14.5 }}>Ollama is optional. Use cloud providers with env keys, or install Ollama from <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">ollama.com/download</a>.</p>}
        {installed && !running && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: 14.5 }}>Ollama is installed but not running.</p>
            <button className="btn" disabled={busy} onClick={startOllama}><Icon name="play" size={14} /> Start Ollama</button>
          </div>
        )}

        <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
          {["write", "review", "revise"].map((role) => {
            const meta = roleMeta[role];
            const row = roles[role] || {};
            const test = tests[role] || {};
            const provider = row.provider || "ollama";
            return (
              <div key={role} className="card" style={{ padding: "12px 14px", borderRadius: "var(--radius)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 180px minmax(0, 1fr) auto", gap: 10, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{meta.title}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>{meta.blurb}</div>
                  </div>
                  <select className="field" value={row.provider || "ollama"} disabled={busy}
                    onChange={(e) => onProviderChange(role, e.target.value)}>
                    {providerOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <input className="field" value={row.model || ""} disabled={busy} list={`desktop-model-options-${role}`}
                    placeholder={(providerOptions.find((p) => p.id === row.provider) || {}).defaultModel || "model name"}
                    onChange={(e) => setRole(role, { model: e.target.value })} />
                  <button className="btn" disabled={busy || test.busy} onClick={() => testRole(role)} title={`Test ${meta.title} model`}>
                    {test.busy ? <Spinner size={14} /> : <Icon name="sparkle" size={14} />} Test
                  </button>
                </div>
                <datalist id={`desktop-model-options-${role}`}>
                  {modelOptions.concat(providerModels[role] || []).map((m) => <option key={m} value={m} />)}
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
                  <div style={{ marginTop: 8, fontSize: 12.5, color: test.ok ? "var(--accent-ink)" : "var(--sev-must)" }}>
                    {test.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="muted" style={{ fontSize: 13, marginTop: 12, lineHeight: 1.45 }}>
          Providers: Anthropic, xAI, Gemini, Docker Model Runner, Ollama, Morpheus, Grok, Groq, and Kimi / Kimmy. Cloud providers require env keys such as <span className="mono">ANTHROPIC_API_KEY</span>, <span className="mono">XAI_API_KEY</span>, <span className="mono">GROQ_API_KEY</span>, <span className="mono">GEMINI_API_KEY</span>, <span className="mono">MORPHEUS_API_KEY</span>, or <span className="mono">KIMI_API_KEY</span>. Per-role env overrides still win.
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
          <button className="btn" disabled={busy || !installed || !running || hasModel} onClick={pullModel}><Icon name="doc" size={14} /> Pull {primaryOllamaModel}</button>
          <button className="btn primary" disabled={busy} onClick={finish}><Icon name="sparkle" size={14} /> Save providers</button>
        </div>
        {message && <p style={{ marginTop: 12, color: "var(--accent-ink)", fontSize: 14 }}>{message}</p>}
      </div>
    </div>
  );
}

function App() {
  const state = useStore();
  const [view, setView] = React.useState("library");
  const [llmOpen, setLlmOpen] = React.useState(false);
  const isMobile = window.useIsMobile();
  const role = state.role || "author";

  const campaigns = state.campaigns || [];
  const activeCampaign = campaigns.find((c) => c.id === state.activeCampaignId) || campaigns[0];
  const refs = window.Store.activeReferences ? window.Store.activeReferences() : ((activeCampaign && activeCampaign.references) || {});
  const refCtx = window.AI.refContext(refs);
  const campaignPieces = state.pieces.filter((p) => p.campaignId === state.activeCampaignId);

  const active = state.pieces.find((p) => p.id === state.activePieceId);
  const inWorkspace = view === "workspace" && active;

  const openPiece = (id) => { window.Store.setActive(id); setView("workspace"); };
  const goLibrary = () => { setView("library"); window.Store.setActive(null); };

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand" onClick={goLibrary}>
          <span className="mark">Jack <span className="em">Script</span></span>
          <span className="sub">Video Production Pipeline</span>
        </div>
        <nav className="topnav">
          <button className={view === "library" ? "active" : ""} onClick={goLibrary}>Productions</button>
          <button className={view === "studio" ? "active" : ""} onClick={() => setView("studio")}>Visual Bible</button>
          <button className={view === "references" ? "active" : ""} onClick={() => setView("references")}>Bible</button>
        </nav>
        <div className="spacer" />
        <CampaignSwitcher campaigns={campaigns} activeId={state.activeCampaignId}
          onSelect={(id) => window.Store.setActiveCampaign(id)} onAdd={(n) => window.Store.addCampaign(n)} />
        {!isMobile && <RoleSwitch role={role} onChange={(r) => window.Store.setRole(r)} />}
        <button className="icon-btn" onClick={() => setLlmOpen(true)} title="AI providers (write / review / revise)">
          <Icon name="sparkle" size={16} />
        </button>
        <button className="icon-btn" onClick={() => window.Store.toggleTheme()} title="Toggle light / dark">
          <Icon name={state.theme === "dark" ? "sun" : "moon"} size={16} />
        </button>
      </div>

      <LlmSettingsModal open={llmOpen} onClose={() => setLlmOpen(false)} />

      {view === "references" && <References refs={refs} role={role} campaignName={activeCampaign && activeCampaign.name} />}
      {view === "studio" && (
        <Studio campaignId={state.activeCampaignId} pieces={campaignPieces} onOpenPiece={openPiece} />
      )}
      {view === "library" && (
        <Library pieces={campaignPieces} campaignName={activeCampaign && activeCampaign.name} onOpen={openPiece}
          onNew={() => { window.Store.createPiece("Untitled Production"); setView("workspace"); }}
          onDelete={(id) => window.Store.deletePiece(id)} />
      )}
      {inWorkspace && (
        <Workspace piece={active} refs={refs} onBack={goLibrary} onGoStudio={() => setView("studio")}
          onUpdatePiece={(p) => window.Store.updatePiece(p.id, p)} />
      )}
      {view === "workspace" && !active && (
        <EmptyState icon="doc" title="No production open" body="Head back to Productions to open or start one." />
      )}
      <TweaksLayer theme={state.theme} />
      <DesktopOnboarding />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
