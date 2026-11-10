# Life Grid (working name)

Your whole life on one page: months across, years down, one headline event per cell.

Each row is a year (labelled with your age), each column a month. A cell holds the
single most memorable thing from that month — a trip, a life event, a weekend away —
in one to three words. Cells are tinted by where you were living at the time. The goal
is a fully filled grid, and the product's job is to help you get there.

Origin: a personal spreadsheet kept in this format for years. The empty cells are the
problem this project exists to solve, so the measure of the product is how many cells it
fills for how few questions asked.

## Status

A working web app (Phase 1). It runs entirely in the browser with no backend.

- **Onboarding questions** fill the grid from a short script, by topic: Homes, School,
  Traditions, Work, People, Anchor dates, Firsts, Trips, Eras, Shared events. One answer
  often fills many cells (a yearly tradition fills that month in every year).
- **The life sheet**: rows are years with an age column, columns are months, cells are
  tinted by home. Two modes, Read (headlines visible) and Overview (whole life on one
  screen), plus full screen and a hover tooltip on every cell.
- **Season colours**: homes and the age column run along a spring → summer → fall →
  winter ramp, to match the season of a person's life.
- **Shelf menu** (slides in from the left) holds all the work: questions, completion
  stats, jump to a topic, sharing, undo, CSV download, start over. Closed, only the
  sheet shows. On a phone the questions sit in a bottom panel that swipes away and back.
- **Cell editor**: click a cell to set its headline. A Google Photos icon opens your own
  photos for that month and year.
- **Sharing**: the whole grid lives in the URL. Your own link reopens the grid for
  editing on another device, with unanswered topics carried along. The share link is
  read-only, with no menu, and stores nothing on the viewer's device.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173. `npm run build` type-checks and builds to `dist/`.

## Privacy

- The app has no server and sends your grid nowhere. It is kept in your browser's
  local storage and in the URL.
- Anyone with a link can read the whole grid it carries.
- In development only, each run is also written to `data/private/` on your own machine
  for review. That folder is ignored by git. `data/sample-life*.csv` is fictional.

## Goals

1. **A display worth looking at.** The grid first, then alternates built on the same data:
   a linear timeline, and a parallel timeline that sets your events beside world events
   or another person's grid.
2. **Connected data sources** that suggest what you were doing in a given month.
3. **Intelligent onboarding and gap-filling questions** that use what is already known
   (home location, age, neighbouring cells, anchor dates) to jog memory for empty cells.

## Core concepts

| Concept | Notes |
|---|---|
| Cell | One month of one year. Holds a short headline (1–3 words). Low stakes; always editable. |
| Row | A year, labelled with age that year. Starts at birth year. |
| Home location | A span of months with a place and a colour. Tints every cell in the span. |
| Anchor date | A date that recurs each year (birthday, anniversary, a holiday). Each one yields a question per year. |
| Suggestion | A candidate headline for a cell from a data source or interview answer, with its source. The user accepts, edits or dismisses it. |
| Completeness | Filled cells ÷ months lived. The number the product tries to raise. |

## Phases

### Phase 0 — Mockups (skipped in favour of the working app)
- Static mockup of the grid view (desktop and phone widths), location colouring, legend, age column.
- Mockup of the cell editor and of a suggestion being accepted.
- Mockup of the onboarding flow, with the question script written out.
- Sketches of the timeline and parallel-timeline views.

### Phase 1 — Web app, data in the URL (built, except CSV import)
- Static single-page app, no backend. The whole grid is compressed into the URL fragment
  and unpacked on load; every edit rewrites the URL. Sharing the URL shares the grid.
- Grid view with editing, home-location spans, completeness counter.
- Scripted onboarding: birth date and place → homes over time → school/work spans →
  anchor dates → first pass of gap questions.
- Import from CSV/pasted spreadsheet in the existing layout.

### Phase 2 — Gap filling
- Gap-question engine: picks the next empty cell and the best prompt for it
  ("Where were you for your birthday in 2019?", "You'd just moved to Chiang Mai — what was the first trip you took?").
- World-events layer for context and for the parallel timeline.
- Photo metadata: read dates and GPS from a local photo export in the browser; nothing uploaded.

### Phase 3 — Connected sources
- Check-in history (Foursquare/Swarm), calendar, social-network exports.
- Likely requires a backend for OAuth and for anything too large for a URL.

### Later — Mobile app
- Viewer and onboarding on mobile, only after the web app has proven the model.

## Known constraints to design around

- **URL size.** A 50-year grid is ~600 cells. At 1–3 words each this compresses to a few
  kilobytes — fine for browsers, but some chat apps and link shorteners truncate long
  links. Needs a compact encoding and a measured budget.
- **A shared URL shares everything.** Anyone with the link sees the whole life. A
  redacted/share view is probably needed before sharing is promoted.
- **Social data access is limited.** Facebook no longer exposes personal timeline history
  through an API, and Google Photos library access is now restricted to a picker. For
  both, importing the user's own data export (parsed locally) is the realistic route.
  Foursquare/Swarm still offers a check-in history API.
- **AI interviewing needs a server.** A model-driven interviewer can't run from a static
  page without exposing an API key, so it conflicts with "no backend" unless it is an
  optional add-on.

## Open questions

See `docs/open-questions.md`. Settled choices are in `docs/decisions.md`.

## Layout

```
src/        the app: App.tsx (layout, shelf, cell editor), Grid.tsx (the sheet),
            script.ts (question script), model.ts (state, colours),
            share.ts (URL encoding), photos.ts (Google Photos links)
data/       fictional sample data; private/ is local only and ignored by git
docs/       scope notes, question script, decisions
```
