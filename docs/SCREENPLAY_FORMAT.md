# Jack Script — Screenplay Format Reference

Jack Script accepts plain text, Fountain, and Final Draft (.fdx) input. The parser and PDF exporter follow standard industry layout conventions.

## Element types

| Element | How to write | PDF layout |
|---------|--------------|------------|
| Scene heading (slugline) | `INT. LOCATION - TIME` or `EXT.` | Full width, uppercase, extra space above |
| Action | Prose paragraphs | Full width (1.5" left, 1" right margins) |
| Character | `NAME` on its own line, ALL CAPS | Centered (~3.7" from left) |
| Parenthetical | `(beat or direction)` | Under character, indented |
| Dialogue | Lines after character name | Narrow column (~2.5" wide, ~1.8" indent) |
| Transition | `CUT TO:`, `FADE OUT.` | Right-aligned, uppercase |

## Typing shortcuts

- After a slugline (`INT.` / `EXT.`), press **Enter** twice in the Script tab to insert a blank action line.
- Toggle **Preview** to see formatted blocks without leaving edit mode.
- Import `.fdx` or `.fountain` via **Import** on the Script tab or the Export screen.

## Page estimate

Roughly **55 lines per page** (standard screenplay density). Shown in the editor rail and persisted on save as `page_estimate`.

## Export formats

`GET /api/pieces/:id/export?format=...`

| Format | Use case |
|--------|----------|
| `pdf` | Submission-ready PDF with title page |
| `fdx` | Final Draft, WriterDuet, Highland import |
| `fountain` | Git-friendly plain text |
| `formatted` | Monospace industry layout (.txt) |
| `breakdown` | Scene list markdown for production |

Optional query params for PDF/Fountain title page: `author`, `contact`, `date`.

## Bible auto-sync

On script save (`PATCH /api/pieces/:id` with `original`), Jack Script:

1. Parses sluglines, scenes, characters, and locations
2. Updates `page_estimate`, `scene_count`, `parsed_scenes`
3. Adds **new** character and location names to the Project Bible (existing entries are never overwritten)

Review auto-detected entries under **Bible → Characters / Locations** and add voice notes, arcs, and mood.

## Coverage gates

Seven screenplay-specific gates run in order: Format → Character → Dialogue → Pacing → Visual → Theme → Market. See `lib/gates.ts` and `JACK_SCRIPT_MIGRATION.md`.