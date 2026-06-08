/* Script Export — download scripts in industry formats (PDF, FDX, Fountain, etc.) */

const EXPORT_FORMATS = [
  { id: "pdf", label: "PDF", desc: "Courier 12pt, standard margins, title page", ext: "pdf", mime: "application/pdf" },
  { id: "fdx", label: "Final Draft (.fdx)", desc: "Final Draft XML for import into studio software", ext: "fdx", mime: "application/xml" },
  { id: "fountain", label: "Fountain", desc: "Plain-text screenplay format for version control", ext: "fountain", mime: "text/plain" },
  { id: "formatted", label: "Formatted text", desc: "Industry-layout plain text", ext: "txt", mime: "text/plain" },
  { id: "breakdown", label: "Scene breakdown", desc: "Markdown scene list with characters per scene", ext: "md", mime: "text/markdown" },
];

function scriptText(piece) {
  const rev = piece && piece.revision && piece.revision.text;
  return (rev && rev.trim()) || (piece && piece.original) || "";
}

function ScriptExport({ pieces, campaignName, onOpenPiece }) {
  const isMobile = window.useIsMobile();
  const scripts = (pieces || []).slice().sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  const [selectedId, setSelectedId] = React.useState(scripts[0] && scripts[0].id);
  const [author, setAuthor] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [busy, setBusy] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [note, setNote] = React.useState(null);
  const [previewMode, setPreviewMode] = React.useState("formatted");

  React.useEffect(() => {
    if (!scripts.length) { setSelectedId(null); return; }
    if (!selectedId || !scripts.find((s) => s.id === selectedId)) setSelectedId(scripts[0].id);
  }, [scripts.map((s) => s.id).join(",")]);

  const piece = selectedId ? scripts.find((s) => s.id === selectedId) : null;
  const text = piece ? scriptText(piece) : "";
  const pages = (piece && piece.pageEstimate) || window.estimatePages(text);
  const scenes = (piece && piece.sceneCount) || 0;

  const flash = (m) => { setNote(m); setTimeout(() => setNote(null), 2200); };

  const exportScript = async (format) => {
    if (!piece) return;
    setBusy(format); setErr(null);
    try {
      const qs = new URLSearchParams({ format });
      if (author.trim()) qs.set("author", author.trim());
      if (contact.trim()) qs.set("contact", contact.trim());
      const r = await fetch("/api/pieces/" + piece.id + "/export?" + qs.toString(), { credentials: "same-origin" });
      if (!r.ok) {
        let msg = "Export failed (" + r.status + ").";
        try { const j = await r.json(); if (j.error) msg = j.error; } catch (e) { /* binary */ }
        throw new Error(msg);
      }
      const fmt = EXPORT_FORMATS.find((f) => f.id === format) || EXPORT_FORMATS[0];
      const blob = await r.blob();
      const name = window.EXPORT.safeName(piece.title || "script") + "." + fmt.ext;
      window.EXPORT.downloadBlob(blob, name);
      flash(fmt.label + " downloaded");
    } catch (e) {
      setErr((e && e.message) || "Export failed.");
    }
    setBusy(null);
  };

  const Preview = window.SCREENPLAY && window.SCREENPLAY.ScreenplayPreview;

  return (
    <div className="scroll-y" style={{ flex: 1 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: isMobile ? "24px 16px 80px" : "40px 32px 90px" }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Export</div>
        <h1 style={{ fontSize: isMobile ? 32 : 42, letterSpacing: "-0.02em", marginBottom: 10 }}>Screenplay Export</h1>
        <p className="muted" style={{ fontSize: 16, maxWidth: "58ch", marginBottom: 28 }}>
          Download scripts from <strong>{campaignName || "your project"}</strong> in industry-standard formats. Uses the revised draft when available, otherwise the original script.
        </p>

        {!scripts.length ? (
          <div className="card" style={{ padding: 28, textAlign: "center" }}>
            <p className="muted" style={{ fontSize: 15.5, marginBottom: 16 }}>No scripts in this project yet. Create one from the Scripts library, write or import your screenplay, then return here to export.</p>
            <button className="btn primary" onClick={() => { const p = window.Store.createPiece("Untitled Script"); if (p && onOpenPiece) onOpenPiece(p.id); }}>
              <Icon name="plus" size={15} /> New script
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "280px 1fr", gap: isMobile ? 20 : 32, alignItems: "start" }}>
            {/* script list */}
            <div className="card" style={{ padding: "12px 10px" }}>
              <div className="eyebrow" style={{ padding: "4px 10px 8px" }}>Scripts</div>
              {scripts.map((s) => {
                const on = s.id === selectedId;
                const t = scriptText(s);
                return (
                  <button key={s.id} onClick={() => setSelectedId(s.id)}
                    style={{ width: "100%", display: "block", textAlign: "left", border: "none", cursor: "pointer",
                      background: on ? "var(--accent-soft)" : "transparent", borderRadius: "var(--radius)",
                      padding: "10px 12px", color: on ? "var(--accent-ink)" : "var(--ink)", marginBottom: 2 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                    <div className="mono muted" style={{ fontSize: 11, marginTop: 3 }}>
                      {(s.pageEstimate || window.estimatePages(t))} pg · {(s.sceneCount || 0)} scenes · {s.status}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* export panel */}
            <div>
              {piece && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                    <div>
                      <h2 style={{ fontSize: 26, marginBottom: 4 }}>{piece.title}</h2>
                      <span className="mono muted" style={{ fontSize: 12 }}>~{pages} pages · {scenes} scenes · {window.wordCount(text)} words</span>
                    </div>
                    <button className="btn ghost sm" onClick={() => onOpenPiece && onOpenPiece(piece.id)} title="Open in Writers' Room">
                      Open script <Icon name="arrowR" size={14} />
                    </button>
                  </div>

                  <div className="card" style={{ padding: "18px 20px", marginBottom: 20 }}>
                    <div className="eyebrow" style={{ marginBottom: 10 }}>Title page (PDF / Fountain)</div>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <input className="field" placeholder="Written by" value={author} onChange={(e) => setAuthor(e.target.value)} />
                      <input className="field" placeholder="Contact / representation" value={contact} onChange={(e) => setContact(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
                    {EXPORT_FORMATS.map((f) => (
                      <button key={f.id} className="card" onClick={() => exportScript(f.id)} disabled={!!busy || !text.trim()}
                        style={{ padding: "16px 18px", textAlign: "left", cursor: busy ? "wait" : "pointer", border: "1px solid var(--hair)",
                          background: busy === f.id ? "var(--accent-soft)" : "var(--paper-2)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          {busy === f.id ? <Spinner size={14} /> : <Icon name="doc" size={14} style={{ color: "var(--accent)" }} />}
                          <span style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>{f.label}</span>
                        </div>
                        <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.4 }}>{f.desc}</p>
                      </button>
                    ))}
                  </div>

                  {(err || note) && (
                    <p style={{ fontSize: 14, color: err ? "var(--sev-must)" : "var(--accent-ink)", marginBottom: 16 }}>{err || note}</p>
                  )}

                  <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
                    <div className="eyebrow">Preview</div>
                    <button className={"btn ghost sm" + (previewMode === "formatted" ? " active" : "")} onClick={() => setPreviewMode("formatted")}>Formatted blocks</button>
                    <button className={"btn ghost sm" + (previewMode === "raw" ? " active" : "")} onClick={() => setPreviewMode("raw")}>Raw text</button>
                  </div>
                  {previewMode === "formatted" && Preview
                    ? <Preview text={text} />
                    : (
                      <pre style={{ fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.55, padding: "22px 28px",
                        background: "var(--paper-2)", borderRadius: "var(--radius)", border: "1px solid var(--hair)",
                        whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 480, overflow: "auto" }}>{text || "(empty script)"}</pre>
                    )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ScriptExport, BookWriter: ScriptExport });