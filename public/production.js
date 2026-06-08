/* Skill 11 — stage-gated production pipeline (client helpers). */
(function () {
  const STAGES = [
    { id: "brief", n: 1, name: "Brief", desc: "Idea, audience, and goal" },
    { id: "script", n: 2, name: "Script", desc: "Screenplay or voiceover script" },
    { id: "audio", n: 3, name: "Audio", desc: "Narration script for voiceover" },
    { id: "storyboard", n: 4, name: "Storyboard", desc: "Scene frames and camera notes" },
    { id: "animatic", n: 5, name: "Animatic", desc: "Timed scene preview (no render yet)" },
    { id: "edit", n: 6, name: "Edit", desc: "Coming soon", comingSoon: true },
    { id: "render", n: 7, name: "Render", desc: "Coming soon", comingSoon: true },
  ];

  function stageStatus(production, id) {
    return (production && production.stages && production.stages[id] && production.stages[id].status) || "locked";
  }

  function isApproved(production, id) {
    return stageStatus(production, id) === "approved";
  }

  function approvedCount(production) {
    return STAGES.filter((s) => !s.comingSoon && isApproved(production, s.id)).length;
  }

  async function api(method, pieceId, path, body) {
    const r = await fetch("/api/pieces/" + pieceId + "/production" + (path || ""), {
      method,
      headers: Object.assign({ Accept: "application/json" }, body != null ? { "Content-Type": "application/json" } : {}),
      credentials: "same-origin",
      body: body != null ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await r.json(); } catch (e) { /* */ }
    if (!r.ok) throw new Error((data && data.error) || ("Request failed (" + r.status + ")"));
    return data;
  }

  window.PRODUCTION = {
    STAGES,
    stageStatus,
    isApproved,
    approvedCount,
    get: (pieceId) => api("GET", pieceId),
    patch: (pieceId, body) => api("PATCH", pieceId, "", body),
    approve: (pieceId, stageId) => api("POST", pieceId, "/approve", { stageId }),
    audioDraft: (pieceId, opts) => api("POST", pieceId, "/audio-draft", opts || {}),
    storyboardInit: (pieceId, opts) => api("POST", pieceId, "/storyboard-init", opts || {}),
  };
})();