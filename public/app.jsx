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

function Workspace({ piece, refs, onBack, onGoStudio }) {
  const [tab, setTab] = React.useState("draft");
  const [running, setRunning] = React.useState(false);
  const [gateStatus, setGateStatus] = React.useState({});
  const isMobile = window.useIsMobile();

  const update = (patch) => window.Store.updatePiece(piece.id, patch);

  const runGates = async () => {
    setRunning(true); setTab("draft");
    // First gate is "running", rest "pending"; the rail advances as completed[] grows.
    const init = {}; window.GATES.forEach((g, i) => init[g.id] = i === 0 ? "running" : "pending"); setGateStatus(init);

    // Apply the completed[] list from /review/status onto the per-gate rail: each
    // listed gate is done, and the first not-yet-completed gate shows as running.
    const applyCompleted = (completed) => {
      const set = new Set(completed || []);
      setGateStatus(() => {
        const next = {}; let runningMarked = false;
        window.GATES.forEach((g) => {
          if (set.has(g.id)) { next[g.id] = "done"; }
          else if (!runningMarked) { next[g.id] = "running"; runningMarked = true; }
          else { next[g.id] = "pending"; }
        });
        return next;
      });
    };

    let polling = true;
    const poll = async () => {
      while (polling) {
        await new Promise((r) => setTimeout(r, 900));
        if (!polling) break;
        try {
          const r = await fetch("/api/pieces/" + piece.id + "/review/status", { headers: { Accept: "application/json" } });
          if (!r.ok) continue;
          const st = await r.json();
          applyCompleted(st.completed);
          if (st.done) break;
        } catch (e) { /* transient — keep polling */ }
      }
    };

    try {
      // Persist the latest draft before review so the server reviews current text.
      await fetch("/api/pieces/" + piece.id, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ original: piece.original }),
      });

      const pollPromise = poll();
      const r = await fetch("/api/pieces/" + piece.id + "/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      polling = false;
      await pollPromise;
      if (!r.ok) throw new Error("review failed: " + r.status);
      const { packet, status } = await r.json();
      // All gates done; sync the local cache (packet already persisted server-side).
      const finalStatus = {}; window.GATES.forEach((g) => finalStatus[g.id] = (packet && packet[g.id]) ? "done" : "pending"); setGateStatus(finalStatus);
      window.Store.updatePiece(piece.id, { packet, status: status || "Reviewed" });
      setRunning(false);
      if (packet && Object.keys(packet).length) setTab("review");
    } catch (e) {
      polling = false;
      console.error("Review failed:", e);
      setGateStatus((s) => {
        const next = { ...s };
        window.GATES.forEach((g) => { if (next[g.id] === "running") next[g.id] = "error"; });
        return next;
      });
      setRunning(false);
    }
  };

  const refCtx = window.AI.refContext(refs);
  const findingCount = piece.packet ? window.GATES.reduce((n, g) => n + (piece.packet[g.id] ? piece.packet[g.id].findings.length : 0), 0) : null;

  const tabs = [
    { id: "draft", label: "Script" },
    { id: "review", label: "Coverage", badge: findingCount },
    { id: "revision", label: "Revision" },
    { id: "breakdown", label: "Breakdown", badge: piece.sceneCount || null },
    { id: "outputs", label: "Artifacts", badge: (piece.outputOrder || []).length || null },
    { id: "media", label: "Media", badge: window.Store.mediaForPiece(piece.id).length || null },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* piece header */}
      <div style={{ padding: isMobile ? "12px 16px 0" : "18px 32px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <button className="icon-btn" onClick={onBack} title="Back to Library"><Icon name="back" size={16} /></button>
            <EditableTitle value={piece.title} onCommit={(t) => update({ title: t })} />
          </div>
          <StatusPipeline piece={piece} onSet={(s) => window.Store.setStatus(piece.id, s)} />
        </div>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {/* tab body */}
      {tab === "draft" && (
        <DraftTab piece={piece} running={running} gateStatus={gateStatus}
          onRun={runGates} onChangeOriginal={(t) => update({ original: t })}
          onGoReview={() => setTab("review")} />
      )}
      {tab === "review" && (piece.packet
        ? <ReviewTab piece={piece} />
        : <EmptyState icon="flag" title="No coverage packet yet" body="Write your script on the Script tab and run Script Coverage. Findings appear here beside your draft." />)}
      {tab === "revision" && <RevisionTab piece={piece} onUpdate={update} refCtx={refCtx} />}
      {tab === "breakdown" && <BreakdownTab piece={piece} refs={refs} onGoStudio={onGoStudio} />}
      {tab === "outputs" && <OutputsTab piece={piece} onUpdate={update} refCtx={refCtx} onGoStudio={onGoStudio} />}
      {tab === "media" && <MediaTab piece={piece} onGoStudio={onGoStudio} />}
    </div>
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
  const [model, setModel] = React.useState("llama3.2");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const desktop = window.KINGS_DESKTOP;
  const modelOptions = ["llama3.2", "mistral", "qwen2.5:7b", "gemma3:4b"];

  React.useEffect(() => {
    if (!desktop || !desktop.isDesktop()) return;
    const done = window.localStorage.getItem("kingspress.desktopSetupComplete") === "true";
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
      if (saved && saved.model) setModel(saved.model);
      else if (list && list.length) setModel(list[0]);
    } catch (e) {
      setMessage((e && e.message) || "Desktop setup check failed.");
    }
  };

  const pullModel = async () => {
    if (!model.trim()) return;
    setBusy(true); setMessage("Downloading " + model + ". This can take a while.");
    try {
      await desktop.pullOllamaModel(model.trim());
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
    try {
      await desktop.saveModelChoice(model.trim());
      window.localStorage.setItem("kingspress.desktopSetupComplete", "true");
      setOpen(false);
    } catch (e) {
      setMessage((e && e.message) || "Could not save the model choice.");
    }
    setBusy(false);
  };

  if (!open) return null;
  const installed = !!(status && status.installed);
  const running = !!(status && status.running);
  const hasModel = models.includes(model);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "oklch(0 0 0 / 0.28)", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ width: "min(620px, 100%)", padding: "24px 26px", boxShadow: "var(--shadow-lg)" }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Jack Script desktop setup</div>
        <h2 style={{ fontSize: 30, marginBottom: 10 }}>Choose your local writing model</h2>
        <p className="muted" style={{ fontSize: 15.5, lineHeight: 1.55 }}>
          Jack Script works best with a local Ollama model. The desktop app keeps your scripts, bibles, and assets in a local data folder and uses your selected model for sovereign, offline-capable screenwriting.
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
        {!installed && (
          <p style={{ marginTop: 14, fontSize: 14.5 }}>
            Install Ollama from <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">ollama.com/download</a>, then reopen this setup. The packaged installer will use this same check during first run.
          </p>
        )}
        {installed && !running && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: 14.5 }}>Ollama is installed but not running.</p>
            <button className="btn" disabled={busy} onClick={startOllama}><Icon name="play" size={14} /> Start Ollama</button>
          </div>
        )}
        <label className="eyebrow" style={{ display: "block", marginTop: 18, marginBottom: 6 }}>Model</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
          <input className="field" value={model} onChange={(e) => setModel(e.target.value)} list="desktop-model-options" placeholder="llama3.2" />
          <datalist id="desktop-model-options">{modelOptions.map((m) => <option key={m} value={m} />)}</datalist>
          <button className="btn" disabled={busy || !installed || !running || hasModel} onClick={pullModel}><Icon name="doc" size={14} /> Pull</button>
          <button className="btn primary" disabled={busy || !model.trim()} onClick={finish}>Use model</button>
        </div>
        {message && <p style={{ marginTop: 12, color: "var(--accent-ink)", fontSize: 14 }}>{message}</p>}
      </div>
    </div>
  );
}

function App() {
  const state = useStore();
  const [view, setView] = React.useState("library");
  const isMobile = window.useIsMobile();
  const role = state.role || "author";

  const campaigns = state.campaigns || [];
  const activeCampaign = campaigns.find((c) => c.id === state.activeCampaignId) || campaigns[0];
  const refs = (activeCampaign && activeCampaign.references) || {};
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
          <span className="sub">Screenwriting Workstation</span>
        </div>
        <nav className="topnav">
          <button className={view === "library" ? "active" : ""} onClick={goLibrary}>Scripts</button>
          <button className={view === "book" ? "active" : ""} onClick={() => setView("book")}>Export</button>
          <button className={view === "gather" ? "active" : ""} onClick={() => setView("gather")}>Research</button>
          <button className={view === "weave" ? "active" : ""} onClick={() => setView("weave")}>Synthesis</button>
          <button className={view === "studio" ? "active" : ""} onClick={() => setView("studio")}>Visual Bible</button>
          <button className={view === "references" ? "active" : ""} onClick={() => setView("references")}>Bible</button>
        </nav>
        <div className="spacer" />
        <CampaignSwitcher campaigns={campaigns} activeId={state.activeCampaignId}
          onSelect={(id) => window.Store.setActiveCampaign(id)} onAdd={(n) => window.Store.addCampaign(n)} />
        {!isMobile && <RoleSwitch role={role} onChange={(r) => window.Store.setRole(r)} />}
        <button className="icon-btn" onClick={() => window.Store.toggleTheme()} title="Toggle light / dark">
          <Icon name={state.theme === "dark" ? "sun" : "moon"} size={16} />
        </button>
      </div>

      {view === "references" && <References refs={refs} role={role} campaignName={activeCampaign && activeCampaign.name} />}
      {view === "weave" && (
        <Weave weave={window.Store.getWeave()} refCtx={refCtx} onOpenPiece={openPiece} />
      )}
      {view === "gather" && (
        <Gather campaignId={state.activeCampaignId} refCtx={refCtx} onGoWeave={() => setView("weave")} />
      )}
      {view === "studio" && (
        <Studio campaignId={state.activeCampaignId} pieces={campaignPieces} onOpenPiece={openPiece} />
      )}
      {view === "book" && (
        <ScriptExport pieces={campaignPieces} campaignName={activeCampaign && activeCampaign.name}
          onOpenPiece={openPiece} />
      )}
      {view === "library" && (
        <Library pieces={campaignPieces} campaignName={activeCampaign && activeCampaign.name} onOpen={openPiece}
          onNew={() => { window.Store.createPiece("Untitled Script"); setView("workspace"); }}
          onDelete={(id) => window.Store.deletePiece(id)} />
      )}
      {inWorkspace && <Workspace piece={active} refs={refs} onBack={goLibrary} onGoStudio={() => setView("studio")} />}
      {view === "workspace" && !active && (
        <EmptyState icon="doc" title="No script open" body="Head back to Scripts to open or start one." />
      )}
      <TweaksLayer theme={state.theme} />
      <DesktopOnboarding />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
