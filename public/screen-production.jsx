/* Skill 11 — Production Pipeline workspace (pre-video-edit stages). */

function ProductionStageRail({ production, active, onSelect }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {window.PRODUCTION.STAGES.map((s, i) => {
        const st = window.PRODUCTION.stageStatus(production, s.id);
        const on = active === s.id;
        const locked = st === "locked";
        const approved = st === "approved";
        const coming = !!s.comingSoon;
        return (
          <button key={s.id} onClick={() => !locked && !coming && onSelect(s.id)} disabled={locked || coming}
            style={{
              display: "grid", gridTemplateColumns: "36px 1fr", gap: 12, alignItems: "center", textAlign: "left",
              padding: "12px 10px", border: "none", borderRadius: "var(--radius)", cursor: locked || coming ? "not-allowed" : "pointer",
              background: on ? "var(--accent-soft)" : "transparent", opacity: locked ? 0.45 : coming ? 0.55 : 1,
              borderTop: i > 0 ? "1px solid var(--hair)" : "none",
            }}>
            <div style={{
              width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center",
              border: "1px solid " + (approved ? "var(--accent)" : "var(--hair-2)"),
              background: approved ? "var(--accent-soft)" : "transparent",
              fontFamily: "var(--font-mono)", fontSize: 12,
              color: approved ? "var(--accent-ink)" : "var(--ink-3)",
            }}>
              {approved ? <Icon name="check" size={14} /> : coming ? "—" : s.n}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{s.name}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{s.desc}</div>
              {approved && <span className="mono" style={{ fontSize: 10, color: "var(--accent-ink)" }}>approved</span>}
              {coming && <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>coming soon</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AssumptionDisclosure({ assumptions }) {
  if (!assumptions || !assumptions.length) return null;
  return (
    <div className="card" style={{ padding: "12px 14px", marginTop: 14, background: "var(--paper-sunk)" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Assumptions</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--ink-2)" }}>
        {assumptions.map((a, i) => <li key={i}>{a}</li>)}
      </ul>
    </div>
  );
}

function BriefStage({ production, onPatch, onApprove, busy }) {
  const b = production.brief || {};
  const set = (k, v) => onPatch({ brief: Object.assign({}, b, { [k]: v }) });
  const assumptions = [
    "Audience: " + (b.audience || "General audience"),
    "Goal: " + (b.goal || "Visual story"),
    "Tone: " + (b.tone || "Clear and engaging"),
    "Aspect ratio: " + (b.aspectRatio || "16:9"),
  ];
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Stage 1 · Brief</div>
      <h2 style={{ fontSize: 28, marginBottom: 8 }}>Idea intake</h2>
      <p className="muted" style={{ fontSize: 15, marginBottom: 20 }}>Start with a clear brief. Jack Script uses assumption-first defaults — refine after your first pass.</p>
      <label className="eyebrow">Core idea</label>
      <textarea className="field" rows={4} value={b.idea || ""} onChange={(e) => set("idea", e.target.value)} placeholder="What is this video about?" style={{ marginBottom: 14 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div><label className="eyebrow">Audience</label><input className="field" value={b.audience || ""} onChange={(e) => set("audience", e.target.value)} /></div>
        <div><label className="eyebrow">Goal</label><input className="field" value={b.goal || ""} onChange={(e) => set("goal", e.target.value)} /></div>
        <div><label className="eyebrow">Tone</label><input className="field" value={b.tone || ""} onChange={(e) => set("tone", e.target.value)} /></div>
        <div><label className="eyebrow">Aspect ratio</label><input className="field" value={b.aspectRatio || ""} onChange={(e) => set("aspectRatio", e.target.value)} /></div>
      </div>
      <AssumptionDisclosure assumptions={assumptions} />
      <div style={{ marginTop: 20 }}>
        <button className="btn primary" disabled={busy || !(b.idea || "").trim()} onClick={() => onApprove("brief")}>
          {busy ? <Spinner size={14} /> : <Icon name="check" size={14} />} Approve brief
        </button>
      </div>
    </div>
  );
}

function ScriptStage({ piece, production, onSaveScript, onApprove, busy }) {
  const [text, setText] = React.useState(piece.original || "");
  React.useEffect(() => { setText(piece.original || ""); }, [piece.id, piece.original]);
  const dirty = text !== piece.original;
  const assumptions = ["Format: screenplay sluglines (INT./EXT.)", "Coverage gates skipped in production mode"];
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Stage 2 · Script</div>
      <h2 style={{ fontSize: 28, marginBottom: 8 }}>Script</h2>
      <p className="muted" style={{ fontSize: 15, marginBottom: 16 }}>Write or paste your screenplay. Scenes are parsed on save for storyboard and animatic.</p>
      <textarea className="field" value={text} onChange={(e) => setText(e.target.value)} onBlur={() => dirty && onSaveScript(text)}
        placeholder="INT. LOCATION - DAY&#10;&#10;Action and dialogue..."
        style={{ minHeight: 360, fontFamily: "var(--font-mono)", fontSize: 14, lineHeight: 1.55 }} />
      <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
        {dirty && <span className="eyebrow" style={{ color: "var(--accent-ink)" }}>unsaved</span>}
        <button className="btn" disabled={!dirty || busy} onClick={() => onSaveScript(text)}>Save script</button>
        <button className="btn primary" disabled={busy || !text.trim()} onClick={() => { if (dirty) onSaveScript(text); onApprove("script"); }}>
          Approve script
        </button>
      </div>
      <AssumptionDisclosure assumptions={assumptions} />
    </div>
  );
}

function AudioStage({ production, onPatch, onDraft, onApprove, busy }) {
  const a = production.audio || {};
  const setScript = (v) => onPatch({ audio: Object.assign({}, a, { voiceScript: v }) });
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Stage 3 · Audio</div>
      <h2 style={{ fontSize: 28, marginBottom: 8 }}>Voiceover script</h2>
      <p className="muted" style={{ fontSize: 15, marginBottom: 16 }}>Generate a narration script from your screenplay. TTS and audio mastering come later — this stage prepares the voice track text.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button className="btn" disabled={busy} onClick={() => onDraft(false)}><Icon name="doc" size={14} /> Extract from script</button>
        <button className="btn ghost" disabled={busy} onClick={() => onDraft(true)} title="Uses local LLM if configured"><Icon name="sparkle" size={14} /> Polish with AI</button>
      </div>
      <textarea className="field" rows={14} value={a.voiceScript || ""} onChange={(e) => setScript(e.target.value)}
        placeholder="Narration script appears here…" style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.65 }} />
      <AssumptionDisclosure assumptions={["Voice: " + (a.voiceName || "Narrator"), "No audio file generated yet — script only"]} />
      <div style={{ marginTop: 16 }}>
        <button className="btn primary" disabled={busy || !(a.voiceScript || "").trim()} onClick={() => onApprove("audio")}>Approve audio script</button>
      </div>
    </div>
  );
}

function StoryboardStage({ production, onInit, onPatch, onApprove, busy, onGoStudio, pieceId }) {
  const frames = production.storyboard || [];
  const updateFrame = (idx, patch) => {
    const next = frames.slice();
    next[idx] = Object.assign({}, next[idx], patch);
    onPatch({ storyboard: next });
  };
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Stage 4 · Storyboard</div>
      <h2 style={{ fontSize: 28, marginBottom: 8 }}>Storyboard</h2>
      <p className="muted" style={{ fontSize: 15, marginBottom: 16 }}>One frame per scene with prompts and camera notes. Image generation uses Visual Bible when you are ready.</p>
      <button className="btn" disabled={busy} onClick={onInit} style={{ marginBottom: 18 }}>
        <Icon name="image" size={14} /> Initialize from script scenes
      </button>
      {frames.length === 0 ? (
        <EmptyState icon="image" title="No storyboard frames" body="Approve your script, then initialize frames from parsed scenes." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {frames.map((f, i) => (
            <div key={f.sceneNumber} className="card" style={{ padding: "16px 18px" }}>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>Scene {f.sceneNumber}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, marginBottom: 10 }}>{f.slugline}</div>
              <label className="eyebrow">Image prompt</label>
              <textarea className="field" rows={3} value={f.prompt || ""} onChange={(e) => updateFrame(i, { prompt: e.target.value })} style={{ marginBottom: 8, fontSize: 13 }} />
              <label className="eyebrow">Camera</label>
              <input className="field" value={f.cameraNote || ""} onChange={(e) => updateFrame(i, { cameraNote: e.target.value })} style={{ marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label className="eyebrow">Duration (sec)</label>
                <input type="number" className="field" style={{ width: 72 }} min={1} max={120} value={f.durationSec || 5}
                  onChange={(e) => updateFrame(i, { durationSec: Number(e.target.value) || 5 })} />
                <button className="btn ghost sm" onClick={() => {
                  window.__studioPrefill = { type: "image", pieceId, prompt: f.prompt, script: f.slugline };
                  onGoStudio && onGoStudio();
                }}><Icon name="image" size={13} /> Visual Bible</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 18 }}>
        <button className="btn primary" disabled={busy || frames.length === 0} onClick={() => onApprove("storyboard")}>Approve storyboard</button>
      </div>
    </div>
  );
}

function AnimaticStage({ production, onPatch, onRebuild, onApprove, busy }) {
  const anim = production.animatic || { scenes: [], totalDurationSec: 0 };
  const updateScene = (idx, durationSec) => {
    const scenes = (anim.scenes || []).slice();
    scenes[idx] = Object.assign({}, scenes[idx], { durationSec });
    const totalDurationSec = scenes.reduce((n, s) => n + (s.durationSec || 0), 0);
    onPatch({ animatic: { scenes, totalDurationSec, notes: anim.notes || "" } });
  };
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Stage 5 · Animatic</div>
      <h2 style={{ fontSize: 28, marginBottom: 8 }}>Animatic preview</h2>
      <p className="muted" style={{ fontSize: 15, marginBottom: 16 }}>Timed scene sequence synced to your storyboard — preview only. Video assembly and editing are not enabled yet.</p>
      <button className="btn" disabled={busy} onClick={onRebuild} style={{ marginBottom: 16 }}><Icon name="play" size={14} /> Rebuild timing from storyboard</button>
      {(!anim.scenes || anim.scenes.length === 0) ? (
        <EmptyState icon="film" title="No animatic yet" body="Initialize storyboard frames first, then rebuild animatic timing." />
      ) : (
        <>
          <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
            <span className="mono" style={{ fontSize: 13 }}>Total duration: ~{anim.totalDurationSec || 0}s · {anim.scenes.length} scenes</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {anim.scenes.map((s, i) => (
              <div key={s.sceneNumber} style={{ display: "grid", gridTemplateColumns: "48px 1fr 100px", gap: 12, alignItems: "center", padding: "10px 12px", background: "var(--paper-2)", borderRadius: "var(--radius)" }}>
                <div className="mono" style={{ fontSize: 12, color: "var(--accent-ink)" }}>{String(s.sceneNumber).padStart(2, "0")}</div>
                <div style={{ fontSize: 14 }}>{s.slugline}</div>
                <input type="number" className="field" min={1} max={120} value={s.durationSec}
                  onChange={(e) => updateScene(i, Number(e.target.value) || 5)} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: "14px 16px", border: "1px dashed var(--hair-2)", borderRadius: "var(--radius)" }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Timeline preview</div>
            <div style={{ display: "flex", height: 28, borderRadius: 4, overflow: "hidden", border: "1px solid var(--hair)" }}>
              {anim.scenes.map((s) => (
                <div key={s.sceneNumber} title={s.slugline} style={{
                  flex: s.durationSec || 1, background: "var(--accent-soft)", borderRight: "1px solid var(--hair)",
                  minWidth: 8,
                }} />
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 8, marginBottom: 0 }}>Edit and Render stages unlock when video editing ships.</p>
          </div>
        </>
      )}
      <div style={{ marginTop: 18 }}>
        <button className="btn primary" disabled={busy || !(anim.scenes && anim.scenes.length)} onClick={() => onApprove("animatic")}>Approve animatic</button>
      </div>
    </div>
  );
}

function ComingSoonStage({ name }) {
  return (
    <EmptyState icon="film" title={name + " — coming soon"} body="Video editing, clip selection, and final render are planned for a future release. Complete Brief through Animatic to prepare your production package." />
  );
}

function ProductionWorkspace({ piece, refs, onBack, onGoStudio, onUpdatePiece }) {
  const [stage, setStage] = React.useState("brief");
  const [production, setProduction] = React.useState(piece.production || null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const isMobile = window.useIsMobile();

  const load = React.useCallback(async () => {
    try {
      const r = await window.PRODUCTION.get(piece.id);
      const p = r.production;
      p._pieceId = piece.id;
      setProduction(p);
      if (p.currentStage) setStage(p.currentStage);
    } catch (e) {
      setErr((e && e.message) || "Could not load production state.");
    }
  }, [piece.id]);

  React.useEffect(() => { load(); }, [load]);

  const saveProduction = async (patch) => {
    setBusy(true); setErr(null);
    try {
      const r = await window.PRODUCTION.patch(piece.id, patch);
      const p = r.production;
      p._pieceId = piece.id;
      setProduction(p);
      if (r.piece) onUpdatePiece(r.piece);
    } catch (e) {
      setErr((e && e.message) || "Save failed.");
    }
    setBusy(false);
  };

  const approve = async (stageId) => {
    setBusy(true); setErr(null);
    try {
      const r = await window.PRODUCTION.approve(piece.id, stageId);
      const p = r.production;
      p._pieceId = piece.id;
      setProduction(p);
      if (r.piece) onUpdatePiece(r.piece);
      if (p.currentStage) setStage(p.currentStage);
    } catch (e) {
      setErr((e && e.message) || "Approval blocked.");
    }
    setBusy(false);
  };

  const saveScript = async (text) => {
    window.Store.updatePiece(piece.id, { original: text });
    await fetch("/api/pieces/" + piece.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ original: text }),
    });
    onUpdatePiece(Object.assign({}, piece, { original: text }));
    await load();
  };

  const prod = production || { stages: {}, brief: {}, audio: {}, storyboard: [], animatic: { scenes: [] } };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ padding: isMobile ? "12px 16px 0" : "18px 32px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <button className="icon-btn" onClick={onBack} title="Back"><Icon name="back" size={16} /></button>
            <div>
              <div className="eyebrow">Production</div>
              <h1 style={{ fontSize: isMobile ? 22 : 28, margin: 0 }}>{piece.title}</h1>
            </div>
          </div>
          <span className="chip">{window.PRODUCTION.approvedCount(prod)} / 5 stages approved</span>
        </div>
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "280px 1fr", gap: 0, minHeight: 0 }}>
        {!isMobile && (
          <div className="scroll-y" style={{ borderRight: "1px solid var(--hair)", padding: "16px 12px" }}>
            <ProductionStageRail production={prod} active={stage} onSelect={setStage} />
          </div>
        )}
        <div className="scroll-y" style={{ padding: isMobile ? "16px 16px 80px" : "24px 36px 90px" }}>
          {isMobile && (
            <select className="field" value={stage} onChange={(e) => setStage(e.target.value)} style={{ marginBottom: 16 }}>
              {window.PRODUCTION.STAGES.filter((s) => !s.comingSoon).map((s) => (
                <option key={s.id} value={s.id}>{s.n}. {s.name}</option>
              ))}
            </select>
          )}
          {err && <p style={{ color: "var(--sev-must)", fontSize: 14, marginBottom: 12 }}>{err}</p>}
          {stage === "brief" && <BriefStage production={prod} onPatch={saveProduction} onApprove={approve} busy={busy} />}
          {stage === "script" && <ScriptStage piece={piece} production={prod} onSaveScript={saveScript} onApprove={approve} busy={busy} />}
          {stage === "audio" && (
            <AudioStage production={prod} onPatch={saveProduction}
              onDraft={(useLlm) => { setBusy(true); window.PRODUCTION.audioDraft(piece.id, { useLlm }).then((r) => { setProduction(r.production); setBusy(false); }).catch((e) => { setErr(e.message); setBusy(false); }); }}
              onApprove={approve} busy={busy} />
          )}
          {stage === "storyboard" && (
            <StoryboardStage production={prod} pieceId={piece.id} onGoStudio={onGoStudio}
              onInit={() => { setBusy(true); window.PRODUCTION.storyboardInit(piece.id).then((r) => { setProduction(r.production); if (r.piece) onUpdatePiece(r.piece); setBusy(false); }).catch((e) => { setErr(e.message); setBusy(false); }); }}
              onPatch={saveProduction} onApprove={approve} busy={busy} />
          )}
          {stage === "animatic" && (
            <AnimaticStage production={prod} onPatch={saveProduction}
              onRebuild={() => { setBusy(true); window.PRODUCTION.storyboardInit(piece.id, { withAnimatic: true }).then((r) => { setProduction(r.production); setBusy(false); }).catch((e) => { setErr(e.message); setBusy(false); }); }}
              onApprove={approve} busy={busy} />
          )}
          {(stage === "edit" || stage === "render") && <ComingSoonStage name={stage === "edit" ? "Edit" : "Render"} />}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProductionWorkspace, ProductionStageRail });