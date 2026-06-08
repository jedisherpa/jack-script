/* Client-side screenplay block classifier for formatted preview (mirrors server parser). */
(function () {
  function classifyLine(line, prevType) {
    const t = (line || "").trim();
    if (!t) return null;
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i.test(t)) return "slugline";
    if (/^(CUT TO:|FADE IN:|FADE OUT\.|FADE TO BLACK\.|DISSOLVE TO:)/i.test(t)) return "transition";
    if (/^\([^)]+\)$/.test(t)) return "parenthetical";
    if (/^[A-Z][A-Z0-9 .'\-()]{0,30}$/.test(t) && !t.endsWith(".") && t.length < 35) {
      if (prevType === "slugline" || prevType === "action" || prevType === "transition") return "character";
    }
    if (prevType === "character" || prevType === "parenthetical") return "dialogue";
    return "action";
  }

  function parseBlocks(text) {
    const lines = (text || "").split(/\r?\n/);
    const blocks = [];
    let prev = null;
    for (let i = 0; i < lines.length; i++) {
      const type = classifyLine(lines[i], prev);
      if (!type) { prev = null; continue; }
      blocks.push({ type, text: lines[i].trim(), line: i + 1 });
      prev = type;
    }
    return blocks;
  }

  const STYLES = {
    slugline: { marginTop: 18, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" },
    action: { marginTop: 8 },
    character: { marginTop: 14, marginLeft: "28%", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" },
    parenthetical: { marginLeft: "22%", fontStyle: "italic", color: "var(--ink-2)" },
    dialogue: { marginLeft: "18%", maxWidth: "52%" },
    transition: { marginTop: 12, textAlign: "right", letterSpacing: "0.04em", textTransform: "uppercase" },
  };

  function ScreenplayPreview({ text }) {
    const blocks = React.useMemo(() => parseBlocks(text), [text]);
    if (!blocks.length) {
      return React.createElement("p", { className: "muted", style: { fontStyle: "italic", padding: "24px" } }, "Start writing sluglines (INT./EXT.) to see formatted blocks.");
    }
    return React.createElement(
      "div",
      {
        style: {
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          lineHeight: 1.55,
          padding: "22px 28px",
          background: "var(--paper-2)",
          minHeight: 460,
          borderRadius: "var(--radius)",
          border: "1px solid var(--hair)",
        },
      },
      blocks.map((b, i) =>
        React.createElement(
          "div",
          { key: i + "-" + b.line, style: STYLES[b.type] || STYLES.action },
          b.text,
        ),
      ),
    );
  }

  window.SCREENPLAY = { parseBlocks, ScreenplayPreview };
})();