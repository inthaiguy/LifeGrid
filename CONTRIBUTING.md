# Contributing

Thanks for helping. Life Grid is a static React + TypeScript + Vite app with no backend.

## Set up

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # builds the reader, type-checks, then builds to dist/
```

`npm run build` must pass before you open a pull request. There is no separate test suite; the
type-check is the gate, plus trying your change in the browser at phone and desktop widths.

## The easy ways to contribute

- **A view.** Add one file to `src/views/`. It appears in the app with no other edits.
  [docs/making-a-view.md](docs/making-a-view.md) is a complete guide, written so an AI assistant can follow it too.
- **A theme.** Add one JSON file to `themes/`. See [docs/themes.md](docs/themes.md).
- **A sample life.** Add a `life-grid/1` JSON file to `data/` (see [docs/data-format.md](docs/data-format.md))
  with a short note on its sources. Mark anything dated only by year `"confirmed": false`. Use public figures
  and published sources, or fictional people; never someone's private life.
- **Tech or world events.** `src/tech.ts` and `src/world.ts` are plain lists.

## Ground rules

- **Privacy first.** Nothing a person enters is sent anywhere. No analytics, no remote fonts or images
  loaded with their data in the address, no storing it beyond their own browser.
- **Views are read-only.** They draw a life; they never change it.
- **Be honest about dates.** Precision is the month. Do not invent days, or present a guess as fact.
- **No filler.** Show something new in each cell or leave it empty.
- **Keep it small.** Avoid new dependencies; draw with HTML, CSS and SVG.
- **Work at every size** and in light and dark.

## Code style

Match the surrounding code. Comment the *why* (a constraint, a trade-off) rather than the *what*. Start
each module with a short comment saying what it is for, as the files in `src/` do.

## Pull requests

Keep them focused, say what changed and why, and include a screenshot for anything visual.
Where the code lives is described in [docs/architecture.md](docs/architecture.md).
