/* Workspace shell — status pipeline header, tabs, and the Draft tab
   with the live seven-gate run rail. */

function StatusPipeline({ piece, onSet }) {
  const statuses = window.Store.STATUSES;
  const curIdx = statuses.indexOf(piece.status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {statuses.map((s, i) => {
        const done = i < curIdx, cur = i === curIdx;
        return (
          <React.Fragment key={s}>
            {i > 0 && <div style={{ width: 26, height: 1, background: i <= curIdx ? `var(${window.STATUS_VAR[piece.status]})` : "var(--hair)" }} />}
            <button onClick={() => onSet(s)} title={`Set status: ${s}`}
              className="mono"
              style={{
                display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                border: "1px solid " + (cur ? `var(${window.STATUS_VAR[s]})` : (done ? "var(--hair-2)" : "var(--hair)")),
                background: cur ? `var(${window.STATUS_VAR[s]})` : "transparent",
                color: cur ? "var(--paper)" : (done ? "var(--ink-2)" : "var(--ink-3)"),
                fontSize: 11, letterSpacing: "0.04em", padding: "5px 11px", borderRadius: 999,
                whiteSpace: "nowrap", transition: "all 0.15s",
              }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: cur ? "var(--paper)" : (done ? `var(${window.STATUS_VAR[s]})` : "var(--hair-2)") }} />
              {s}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function GateRail({ gateStatus, packet, onJump }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {window.GATES.map((g, i) => {
        const st = gateStatus[g.id] || (packet && packet[g.id] ? "done" : "pending");
        const res = packet && packet[g.id];
        const fc = res ? res.findings.length : 0;
        const must = res ? res.findings.filter((f) => f.severity === "must").length : 0;
        return (
          <div key={g.id} onClick={() => res && onJump && onJump(g.id)}
            style={{
              display: "grid", gridTemplateColumns: "34px 1fr auto", gap: 14, alignItems: "center",
              padding: "16px 4px", borderTop: i > 0 ? "1px solid var(--hair)" : "none",
              cursor: res && onJump ? "pointer" : "default", opacity: st === "pending" ? 0.6 : 1,
              transition: "opacity 0.3s",
            }}>
            <div style={{
              width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center",
              border: "1px solid " + (st === "done" ? "var(--accent)" : "var(--hair-2)"),
              background: st === "done" ? "var(--accent-soft)" : "transparent",
              fontFamily: "var(--font-mono)", fontSize: 13, color: st === "done" ? "var(--accent-ink)" : "var(--ink-3)",
            }}>
              {st === "running" ? <Spinner size={16} /> : st === "done" ? <Icon name="check" size={16} style={{ color: "var(--accent)" }} /> : st === "error" ? <Icon name="warn" size={15} style={{ color: "var(--sev-must)" }} /> : g.n}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, lineHeight: 1.2 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 17, lineHeight: 1.2 }}>{g.name}</span>
                {st === "running" && <span className="eyebrow" style={{ animation: "pulse 1.2s infinite" }}>reading…</span>}
                {st === "error" && <span className="eyebrow" style={{ color: "var(--sev-must)" }}>retry</span>}
              </div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.4, marginTop: 3 }}>{g.blurb}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {st === "done" && (
                fc === 0
                  ? <span className="mono muted" style={{ fontSize: 12 }}>clear</span>
                  : <>
                      {must > 0 && <SeverityTag sev="must" />}
                      <span className="mono muted" style={{ fontSize: 12 }}>{fc} finding{fc !== 1 ? "s" : ""}</span>
                    </>
              )}
              {st === "done" && onJump && <Icon name="chevR" size={15} style={{ color: "var(--ink-3)" }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function handleScreenplayKeyDown(e, text, setText) {
  if (e.key !== "Enter") return;
  const el = e.target;
  const start = el.selectionStart;
  const before = text.slice(0, start);
  const lineStart = before.lastIndexOf("\n") + 1;
  const currentLine = before.slice(lineStart);
  if (/^(INT\.|EXT\.)/i.test(currentLine.trim())) {
    e.preventDefault();
    const after = text.slice(start);
    const next = text.slice(0, start) + "\n\n" + after;
    setText(next);
    onChangeDeferred(el, start + 2, next);
  }
}

function onChangeDeferred(el, pos, val) {
  requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = pos; });
}

function DraftTab({ piece, running, gateStatus, onRun, onChangeOriginal, onGoReview }) {
  const [text, setText] = React.useState(piece.original || "");
  const [screenplayView, setScreenplayView] = React.useState(true);
  const [editMode, setEditMode] = React.useState("edit");
  const Preview = window.SCREENPLAY && window.SCREENPLAY.ScreenplayPreview;
  const fileRef = React.useRef(null);
  const [uploading, setUploading] = React.useState(false);
  const isMobile = window.useIsMobile();
  React.useEffect(() => { setText(piece.original || ""); }, [piece.id]);

  const wc = window.wordCount(text);
  const pages = piece.pageEstimate || window.estimatePages(text);
  const dirty = text !== piece.original;
  const hasPacket = !!piece.packet;

  const upload = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const t = await window.extractFileText(f);
      setText(t); onChangeOriginal(t);
    } catch (err) {
      window.alert((err && err.message) || ("Couldn't read " + f.name + "."));
    }
    setUploading(false);
  };

  return (
    <div className="scroll-y" style={{ flex: 1 }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: isMobile ? "20px 16px 80px" : "34px 32px 90px",
        display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 380px", gap: isMobile ? 22 : 40, alignItems: "start" }}>

        {/* Draft column */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div className="eyebrow">Screenplay Draft</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="mono muted" style={{ fontSize: 12 }}>~{pages} pg · {wc} words</span>
              <button className={"btn ghost sm" + (editMode === "preview" ? " active" : "")} onClick={() => setEditMode(editMode === "preview" ? "edit" : "preview")} title="Formatted block preview">
                <Icon name="doc" size={14} /> {editMode === "preview" ? "Edit" : "Preview"}
              </button>
              {editMode === "edit" && (
                <button className={"btn ghost sm" + (screenplayView ? " active" : "")} onClick={() => setScreenplayView(!screenplayView)} title="Monospace screenplay typing">
                  <Icon name="doc" size={14} /> {screenplayView ? "Mono" : "Plain"}
                </button>
              )}
              <input ref={fileRef} type="file" accept={window.UPLOAD_ACCEPT} style={{ display: "none" }} onChange={upload} />
              <button className="btn ghost sm" onClick={() => fileRef.current.click()} disabled={running || uploading} title="Import .fdx, .fountain, PDF, or text">
                {uploading ? <><Spinner size={14} /> Reading…</> : <><Icon name="doc" size={14} /> Import</>}
              </button>
            </div>
          </div>
          {editMode === "preview" && Preview ? (
            <Preview text={text} />
          ) : (
            <textarea
              className="field"
              value={text}
              disabled={running}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => dirty && onChangeOriginal(text)}
              onKeyDown={(e) => screenplayView && handleScreenplayKeyDown(e, text, setText)}
              placeholder="Write in screenplay format (INT./EXT. sluglines, ALL CAPS character names). Import .fdx or .fountain, or paste directly. Coverage reads your Bible and script."
              style={{
                minHeight: 460,
                fontSize: screenplayView ? 14 : 17.5,
                lineHeight: screenplayView ? 1.55 : 1.7,
                fontFamily: screenplayView ? "var(--font-mono)" : "var(--font-body)",
                background: "var(--paper-2)", resize: "vertical", padding: "22px 24px",
                letterSpacing: screenplayView ? "0.02em" : "normal",
              }}
            />
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn primary" disabled={running || wc < 3} onClick={() => { if (dirty) onChangeOriginal(text); onRun(); }}>
              {running ? <><Spinner size={15} /> Running coverage…</> : <><Icon name="play" size={15} /> {hasPacket ? "Re-run coverage" : "Run coverage"}</>}
            </button>
            {hasPacket && !running && (
              <button className="btn" onClick={onGoReview}>Open Coverage Packet <Icon name="arrowR" size={15} /></button>
            )}
            {dirty && !running && <span className="eyebrow" style={{ color: "var(--accent-ink)" }}>unsaved — saves on blur</span>}
          </div>
        </div>

        {/* Gate rail column */}
        <div className="card" style={{ padding: "22px 22px", position: "sticky", top: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <div className="eyebrow">Script Coverage</div>
            {running && <span className="eyebrow" style={{ color: "var(--accent-ink)" }}>in session</span>}
          </div>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 8 }}>
            Each gate is a separate pass and fills in as it finishes.
          </p>
          <GateRail gateStatus={gateStatus} packet={piece.packet} onJump={hasPacket && !running ? onGoReview : null} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StatusPipeline, GateRail, DraftTab });
