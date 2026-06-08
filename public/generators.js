/* Screenplay artifact generators — server-orchestrated via /api/pieces/:id/outputs */
(function () {
  async function apiSend(method, path, body) {
    const r = await fetch("/api" + path, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body == null ? undefined : JSON.stringify(body),
    });
    if (!r.ok) throw new Error(method + " " + path + " -> " + r.status);
    const ct = r.headers.get("content-type") || "";
    return ct.indexOf("application/json") >= 0 ? r.json() : null;
  }

  async function generateRevision(piece, refCtx, onProgress, opts) {
    const body = opts && opts.mode ? { mode: opts.mode } : null;
    const res = await apiSend("POST", "/pieces/" + piece.id + "/revision", body);
    const rev = (res && res.piece && res.piece.revision) || {};
    if (onProgress) onProgress(1, 1);
    return { revision: rev.text || "", changelog: Array.isArray(rev.changelog) ? rev.changelog : [] };
  }

  const STAKEHOLDER_PRESETS = [
    { id: "studio_exec", name: "Studio Executive" },
    { id: "director", name: "Director" },
    { id: "lead_actor", name: "Lead Actor" },
    { id: "producer", name: "Producer" },
    { id: "festival", name: "Festival Programmer" },
    { id: "general", name: "General Reader" },
  ];

  const ARTIFACTS = [
    { id: "logline", name: "Logline", order: 1, derivesFrom: [], role: "Hook variants from script + Bible." },
    { id: "one_page_synopsis", name: "One-Page Synopsis", order: 2, derivesFrom: ["logline"], role: "Single-page prose synopsis." },
    { id: "full_treatment", name: "Full Treatment", order: 3, derivesFrom: ["one_page_synopsis"], role: "Sectioned treatment with act breaks." },
    { id: "pitch_deck_text", name: "Pitch Deck Text", order: 4, derivesFrom: ["logline", "one_page_synopsis"], role: "Slide-by-slide pitch copy." },
    { id: "character_breakdowns", name: "Character Breakdowns", order: 5, derivesFrom: ["full_treatment"], role: "Casting-ready breakdowns." },
    { id: "scene_outline", name: "Scene Outline", order: 6, derivesFrom: ["full_treatment"], role: "Numbered scene list with stakes." },
    { id: "production_breakdown", name: "Production Breakdown", order: 7, derivesFrom: ["scene_outline"], role: "Locations, props, stunts per scene." },
    { id: "table_read_script", name: "Table Read Script", order: 8, derivesFrom: ["character_breakdowns"], role: "Dialogue-only with character cues." },
  ];

  const PLATFORMS = ARTIFACTS;
  const AUDIENCE_PRESETS = STAKEHOLDER_PRESETS;

  function canonicalSource(piece) {
    if (piece.revision && piece.revision.text) return piece.revision.text;
    if (piece.revision && piece.revision.revision) return piece.revision.revision;
    return piece.original || "";
  }

  function resolveSources(activeIds) {
    const map = {};
    ARTIFACTS.forEach((a) => {
      if (!activeIds.includes(a.id)) return;
      const present = a.derivesFrom.filter((d) => activeIds.includes(d));
      map[a.id] = present.length ? present : ["__source__"];
    });
    return map;
  }

  async function generateOutputs(piece, activeIds, audienceMap, refCtx, onProgress) {
    const ordered = ARTIFACTS.filter((a) => activeIds.includes(a.id)).map((a) => a.id);
    if (onProgress) ordered.forEach((id) => onProgress(id, "running"));
    let res;
    try {
      res = await apiSend("POST", "/pieces/" + piece.id + "/outputs", { active: activeIds, audiences: audienceMap });
    } catch (e) {
      if (onProgress) ordered.forEach((id) => onProgress(id, "error", null, e));
      throw e;
    }
    const outputs = (res && res.outputs) || (res && res.piece && res.piece.outputs) || {};
    const order = (res && res.outputOrder) || (res && res.piece && res.piece.outputOrder) || ordered.filter((id) => outputs[id]);
    if (onProgress) order.forEach((id) => { if (outputs[id]) onProgress(id, "done", outputs[id]); });
    return { outputs, order };
  }

  async function condenseOutput(pieceId, platform, ratio) {
    return apiSend("POST", "/pieces/" + pieceId + "/outputs/" + encodeURIComponent(platform) + "/condense", { ratio: ratio || 0.4 });
  }

  window.GEN = {
    generateRevision,
    generateOutputs,
    condenseOutput,
    resolveSources,
    canonicalSource,
    STAKEHOLDER_PRESETS,
    AUDIENCE_PRESETS,
    ARTIFACTS,
    PLATFORMS,
  };
})();