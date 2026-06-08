/* ============================================================
   AI helpers — JSON parsing + reference context only.
   Model calls are server-side through /api routes.
   ============================================================ */
(function () {

  function extractJSON(text) {
    if (!text) return null;
    // strip code fences
    let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    // direct parse
    try { return JSON.parse(t); } catch (e) {}
    // find first balanced { ... } or [ ... ]
    const start = t.search(/[{\[]/);
    if (start === -1) return null;
    const open = t[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < t.length; i++) {
      const c = t[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
      } else {
        if (c === '"') inStr = true;
        else if (c === open) depth++;
        else if (c === close) { depth--; if (depth === 0) {
          const slice = t.slice(start, i + 1);
          try { return JSON.parse(slice); } catch (e) { return null; }
        } }
      }
    }
    return null;
  }

  // Attempt to recover a usable object from TRUNCATED JSON by closing
  // open strings/brackets, then progressively dropping trailing fields.
  function closeBalanced(s) {
    const stack = []; let inStr = false, esc = false, out = "";
    for (const c of s) {
      out += c;
      if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; }
      else { if (c === '"') inStr = true; else if (c === "{") stack.push("}"); else if (c === "[") stack.push("]"); else if (c === "}" || c === "]") stack.pop(); }
    }
    if (inStr) out += '"';
    out = out.replace(/[,:]\s*$/, "");
    for (let i = stack.length - 1; i >= 0; i--) out += stack[i];
    try { return JSON.parse(out); } catch (e) { return null; }
  }

  function repairJSON(text) {
    if (!text) return null;
    const start = text.search(/[{\[]/);
    if (start < 0) return null;
    const s = text.slice(start);
    let r = closeBalanced(s);
    if (r) return r;
    let idx = s.length;
    for (let k = 0; k < 60; k++) {
      idx = s.lastIndexOf(",", idx - 1);
      if (idx < 0) break;
      r = closeBalanced(s.slice(0, idx));
      if (r) return r;
    }
    return null;
  }

  // Build a compact reference context block the gates/generators read.
  function refContext(refs) {
    const r = refs || (window.Store && window.Store.activeReferences()) || {};
    const lines = [];
    if (r.logline) lines.push("LOGLINE:\n" + r.logline);
    if (r.synopsis) lines.push("\nSYNOPSIS:\n" + r.synopsis);
    if (r.genre) lines.push("\nGENRE: " + r.genre);
    if (r.toneBible) lines.push("\nTONE BIBLE:\n" + r.toneBible);
    if (r.themes && r.themes.length) {
      lines.push("\nTHEMES:");
      r.themes.forEach((t) => lines.push("- " + t));
    }
    if (r.characters && r.characters.length) {
      lines.push("\nCHARACTERS:");
      r.characters.forEach((c) => {
        lines.push("\n• " + c.name);
        if (c.bio) lines.push("  Bio: " + c.bio);
        if (c.voice) lines.push("  Voice: " + c.voice);
        if (c.arc) lines.push("  Arc: " + c.arc);
      });
    }
    if (r.visualLanguage) lines.push("\nVISUAL LANGUAGE:\n" + r.visualLanguage);
    if (r.beatSheet) lines.push("\nBEAT SHEET:\n" + r.beatSheet);
    if (r.worldRules) {
      const rules = Array.isArray(r.worldRules) ? r.worldRules : [r.worldRules];
      lines.push("\nWORLD RULES:");
      rules.forEach((x) => lines.push("- " + x));
    }
    if (r.redLines && r.redLines.rules) {
      lines.push("\nRED LINES:");
      r.redLines.rules.forEach((x) => lines.push("- " + x));
    }
    if (r.strategy) {
      lines.push("\n[LEGACY] THROUGHLINES:");
      (r.strategy.throughlines || []).forEach((t) => lines.push(`- [${t.tag}] ${t.name}: ${t.note}`));
    }
    return lines.join("\n");
  }

  window.AI = { extractJSON, repairJSON, refContext };
})();
