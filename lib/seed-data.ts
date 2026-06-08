/**
 * Shared seed data for Jack Script default local workspace.
 *
 * SEED_REFERENCES is the Project Bible template (flexible JSONB).
 * Keep this free of database imports so both Postgres and SQLite paths
 * can provision identical starter data.
 */

export const SEED_REFERENCES = {
  logline:
    "When a retired stunt coordinator inherits her estranged father's unfinished screenplay, she must finish the script before the option expires — or lose the last chance to understand why he walked out.",
  synopsis:
    "Act I establishes MARA (40s), a precision-minded stunt veteran, returning to her childhood home in Albuquerque after her father EDDIE's death. She discovers a half-finished feature script and a 90-day option letter from a hungry indie producer. Act II forces Mara to collaborate with DIEGO, her father's former writing partner, unlocking memories of the night Eddie left. Act III delivers a rewritten ending that honors Eddie's intent while claiming Mara's own voice — the script becomes her eulogy and her debut.",
  genre: "Drama / Indie Feature",
  toneBible:
    "Grounded, unsentimental, dry Southwestern humor allowed but never sitcom. Dialogue is spare; emotion lives in action lines and silence. Avoid voiceover unless explicitly noted. The script should read fast — tension through withholding, not exposition.",
  visualLanguage:
    "High desert naturalism: wide shots with human figures small against mesas; interiors with hard sunlight cutting across dust. Color palette — oxidized copper, bone white, deep turquoise accents. Camera language favors locked-off observational frames in emotional scenes; handheld only for stunt rehearsal sequences.",
  beatSheet:
    "1. Opening Image: Mara rigging a fall on a soundstage — control without vulnerability.\n2. Catalyst: Eddie's death + option deadline.\n3. Debate: Will she burn the script or finish it?\n4. Break into Two: Moves into Eddie's house; meets Diego.\n5. Midpoint: Discovers Eddie's alternate ending — a confession scene he never shot.\n6. All Is Lost: Option pulled; Diego reveals he was there the night Eddie left.\n7. Dark Night: Mara burns a draft page — then retrieves it.\n8. Finale: Table read of new ending with Diego and the producer.\n9. Final Image: Mara submits — author credit reads MARA VANCE & EDWARD VANCE.",
  worldRules: [
    "Present-day New Mexico; no supernatural elements.",
    "Stunt industry details must be technically plausible.",
    "Eddie's absence is the central mystery — reveal only at midpoint.",
  ],
  themes: [
    "Legacy vs authorship",
    "Grief as revision",
    "The stunt — what we perform vs what we feel",
  ],
  characters: [
    {
      name: "MARA VANCE",
      bio: "40s. Stunt coordinator. Precise, physically confident, emotionally guarded.",
      voice: "Short clauses. Technical vocabulary when nervous. Rarely asks direct questions — observes instead.",
      arc: "From executor of others' risk to author of her own story.",
      relationships: "Estranged daughter of Eddie; reluctant partner to Diego.",
      sampleDialogue: "You don't fix a third act by yelling at it.",
    },
    {
      name: "DIEGO SALINAS",
      bio: "50s. WGA writer, Eddie's former collaborator. Charm as armor.",
      voice: "Complete sentences, literary references, deflects pain with wit.",
      arc: "From keeper of secrets to co-author of truth.",
      relationships: "Eddie's ex-partner; friction and trust with Mara.",
      sampleDialogue: "Your father hated endings. Said they were where writers lied.",
    },
    {
      name: "EDDIE VANCE",
      bio: "60s at death. Off-screen presence; appears in flashback scenes only.",
      voice: "Southwest storyteller rhythm; longer sentences; myth-making tendency.",
      arc: "Revealed through drafts and memory — not a living arc.",
      relationships: "Father; ghost in the machine of the script.",
      sampleDialogue: "A good stunt lands. A great one you don't see coming.",
    },
  ],
  locations: [
    { name: "EDDIE'S HOUSE — ALBUQUERQUE", description: "Cluttered study, sun-bleached patio, boxes of drafts.", mood: "Stale warmth" },
    { name: "STUNT REHEARSAL STAGE", description: "Pads, rigging, industrial fans.", mood: "Controlled chaos" },
  ],
  competitorReferences: [
    "Adaptation. (2002) — meta without cynicism",
    "The Rider (2017) — physicality as character",
    "Paterson (2016) — quiet craft obsession",
  ],
  redLines: {
    title: "Red Lines",
    rules: [
      "No exploitative trauma beats played for shock.",
      "No deus ex machina producer rescue — Mara earns the ending.",
      "No voiceover narration unless marked as a deliberate stylistic choice in the Bible.",
      "Eddie's confession must be shown, not told, in the final sequence.",
    ],
  },
  gateSpec: {
    title: "Script Coverage Specification",
    body:
      "Seven coverage gates run in order. Each emits a section of the Coverage Packet. Findings carry Must-fix, Consider, or Note severity. AI Revision (light mode) applies ONLY dialogue and character-voice findings; structural gates remain in the report for the writer to judge. Full revision mode may restructure acts before the dialogue polish pass.",
  },
} as const;

export type SeedReferences = typeof SEED_REFERENCES;

export const CAMPAIGN_NAMES = [
  "Untitled Feature",
  "Pilot — Season 1",
  "Short — Midnight Run",
  "Stage — Two Rooms",
  "Biopic — Draft Zero",
  "TV Spec",
  "Rewrite Lab",
] as const;

export function slug(n: string): string {
  return n
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}