/* Script Coverage Gates — seven sequential screenplay review passes. */
(function () {
  const GATES = [
    { id: "format", n: 1, name: "Format, Structure & Page Count", kind: "format", blurb: "Sluglines, scene balance, act breaks, runtime estimate." },
    { id: "character", n: 2, name: "Character Voice & Consistency", kind: "character", blurb: "Bible voice alignment; flag drift across scenes." },
    { id: "dialogue", n: 3, name: "Dialogue, Subtext & Naturalism", kind: "dialogue", blurb: "On-the-nose lines, subtext, speakability." },
    { id: "pacing", n: 4, name: "Pacing, Tension & Act Structure", kind: "pacing", blurb: "Stakes, momentum, midpoint, climax placement." },
    { id: "visual", n: 5, name: "Visual Storytelling & Cinematic Language", kind: "visual", blurb: "Show-don't-tell; action-line camera thinking." },
    { id: "theme", n: 6, name: "Theme, Emotional Arc & Resolution", kind: "theme", blurb: "Theme echoes, emotional throughline, ending resonance." },
    { id: "market", n: 7, name: "Originality, Genre Fit & Commercial Viability", kind: "market", blurb: "High concept, twists, market positioning." },
  ];

  window.GATES = GATES;
  window.SEVERITY = {
    must: { label: "Must-fix", varc: "--sev-must", bg: "--sev-must-bg", rank: 0 },
    consider: { label: "Consider", varc: "--sev-consider", bg: "--sev-consider-bg", rank: 1 },
    note: { label: "Note", varc: "--sev-note", bg: "--sev-note-bg", rank: 2 },
  };
})();