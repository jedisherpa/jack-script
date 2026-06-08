/* Scene breakdown + per-scene storyboard generation. */

function estimatePages(text) {
  const lines = (text || "").split(/\r?\n/).filter((l) => l.trim()).length;
  return Math.max(1, Math.round((lines / 55) * 10) / 10);
}

function BreakdownTab({ piece, refs, onGoStudio }) {
  const scenes = piece.parsedScenes || [];
  const text = (piece.revision && piece.revision.text) || piece.original || "";
  const pages = piece.pageEstimate || estimatePages(text);
  const refCtx = window.AI.refContext(refs);
  const visual = (refs && refs.visualLanguage) || "";

  const storyboardScene = (scene) => {
    const action = (text || "").split(/\r?\n/).slice((scene.startLine || 1) - 1, (scene.startLine || 1) + 12).join("\n");
    const prompt = [
      "Cinematic storyboard frame for this screenplay scene.",
      "Scene: " + scene.slugline,
      "Action excerpt: " + action.slice(0, 400),
      visual ? "Visual language: " + visual : "",
    ].filter(Boolean).join("\n");
    window.__studioPrefill = { type: "image", pieceId: piece.id, prompt, script: action };
    onGoStudio && onGoStudio();
  };

  return (
    <div className="scroll-y" style={{ flex: 1 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "30px 32px 90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Scene Breakdown</div>
            <p className="muted" style={{ fontSize: 15, margin: 0 }}>Parsed scenes, characters, and production prep from your script.</p>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div className="card" style={{ padding: "12px 18px", textAlign: "center" }}>
              <div className="mono" style={{ fontSize: 22, color: "var(--accent-ink)" }}>{scenes.length || piece.sceneCount || 0}</div>
              <div className="eyebrow">Scenes</div>
            </div>
            <div className="card" style={{ padding: "12px 18px", textAlign: "center" }}>
              <div className="mono" style={{ fontSize: 22, color: "var(--accent-ink)" }}>{pages}</div>
              <div className="eyebrow">Est. pages</div>
            </div>
          </div>
        </div>

        {scenes.length === 0 ? (
          <EmptyState icon="doc" title="No scenes parsed yet" body="Save your script draft — sluglines (INT./EXT.) are detected automatically on save." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {scenes.map((s) => (
              <div key={s.number} className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>Scene {s.number} · line {s.startLine}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500, letterSpacing: "0.02em" }}>{s.slugline}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(s.characters || []).map((c) => (
                        <span key={c} className="chip" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{c}</span>
                      ))}
                      {(!s.characters || s.characters.length === 0) && <span className="muted" style={{ fontSize: 13 }}>No dialogue characters detected</span>}
                    </div>
                  </div>
                  <button className="btn sm" onClick={() => storyboardScene(s)} title="Generate storyboard in Visual Bible">
                    <Icon name="image" size={14} /> Storyboard
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 28, padding: "16px 18px", border: "1px dashed var(--hair-2)", borderRadius: "var(--radius)" }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Export</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["pdf", "fountain", "fdx", "breakdown"].map((fmt) => (
              <a key={fmt} className="btn ghost sm" href={"/api/pieces/" + piece.id + "/export?format=" + fmt} download>
                {fmt === "pdf" ? "PDF" : fmt === "fdx" ? "Final Draft (.fdx)" : fmt === "fountain" ? "Fountain" : "Breakdown (.md)"}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BreakdownTab, estimatePages });