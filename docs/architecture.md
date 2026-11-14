# Architecture

A static single-page app. All state is in the browser; there is no server. The whole life is
carried in the URL, so a link is both the share mechanism and the backup.

## Two models of a life

| | `src/model.ts` (`State`) | `src/lifegrid.ts` (`Life`) |
|---|---|---|
| For | The app: editing, the interview, undo | Anything that only *reads* a life |
| Contains | The life plus the interview queue, answer log and cues | The life only |
| Dependencies | React app code | None. One file, safe to copy |

`lifegrid.ts` is also built as `public/lifegrid.js` (`npm run build:reader`) so other pages can import it.
Built-in views receive both (`life` and `s`); new views should use `life`.

## Data flow

```
link (#s.… or #…) ─┐
JSON export ───────┼─ lifegrid.read() ─> Life ─> views
localStorage ──────┘                     │
                                         └─ App.tsx builds State ─ commit() ─┬─> localStorage
user edits / answers ───────────────────────────────────────────┘            └─> URL (share.ts encode)
```

- **Links**: `share.ts` writes format 2 (see [data-format.md](data-format.md)); `lifegrid.ts` reads it.
- **Read-only links** (`#s.…`) never write to localStorage.
- **Import**: `import.ts` turns a JSON export or pasted sheet into cells and homes.

## Where things live

| Path | Role |
|---|---|
| `src/App.tsx` | Layout, menu shelf, cell editor, sharing, undo, persistence |
| `src/script.ts`, `Question.tsx` | The onboarding script as data, its engine, and the form that renders one question |
| `src/Welcome.tsx`, `Coach.tsx`, `Typer.tsx` | The opening flow |
| `src/places.ts` | Editing where someone lived (moves, stays, renames) |
| `src/Grid.tsx`, `Timeline.tsx`, `Tree.tsx`, `Voyager.tsx` | Drawing code for the built-in views |
| `src/views/*.tsx` | One file per view, auto-discovered by `src/views.ts` |
| `src/views.ts` | The view contract (`ViewDef`, `ViewProps`), discovery, unlock thresholds |
| `src/events.tsx`, `world.ts`, `tech.ts` | Data for event marks, the world-events layer and the tech timeline |
| `src/theme.ts`, `themes/*.json` | Look and feel as data |
| `src/sound.ts` | Synthesised sounds (Web Audio, no audio files) |
| `data/` | Sample sheets of public figures (`life-grid/1` JSON) and fictional ones in `data/samples/` |
| `docs/` | Format specs, the view guide, the question script, roadmap |

## Extension points

- **View**: add `src/views/NN-name.tsx` exporting `view` and a default component.
- **Theme**: add `themes/name.json`.
- **Question topic**: edit `src/script.ts` (and keep `docs/onboarding-questions.md` in step).

## Testing switch

`UNLOCK_ALL` in `src/views.ts` opens every view regardless of how full the grid is. Set it to `false`
for the normal unlock-by-progress behaviour.
