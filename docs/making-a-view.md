# Making a Life Grid view

This guide is written so that a person, or an AI assistant handed this file, can build a new view of
a life without reading the rest of the code. A view is any drawing of someone's life: a timeline, a
tree, a map, a poster. It never changes the life; it only shows it.

There are two ways to make one:

- **Route A (section 4). A view inside the Life Grid app** — one file dropped into `src/views/`. It appears in the
  app's view switcher and menu automatically.
- **Route B (section 5). A view on your own page** — any web page that accepts a pasted Life Grid link and draws it,
  using the one-file reader. No server, and no other Life Grid code.

If you are an AI assistant: read sections 1–3, then follow section 4 or 5, then go through the checklist in
section 6 before you say you are done.

---

## 1. The data

A life is plain data (`Life` in `src/lifegrid.ts`):

```ts
interface Life {
  name?: string;                                          // first name, may be missing
  birth: { y: number; m: number; place: string; d?: number };   // m is 1–12; d (day) only when known
  death?: { y: number; m: number; d?: number };          // only for someone who has died
  homes: { from: Month; place: string }[];               // main homes in order; each lasts until the next begins
  stays: { from: Month; to: Month; place: string }[];    // temporary stays, inclusive; they override the home
  cells: Record<Month, { t: string; p?: boolean }>;      // one headline per month; p = not yet confirmed
}
type Month = string;   // "YYYY-MM", e.g. "1986-07". Months compare correctly as strings.
```

What to know about it:

- **Precision is the month.** There are no days or times on events. Do not invent them.
- **One headline per month**, a few words long (at most 60 characters). Most months are empty. A
  life of 40 years has 480 months and typically 20 to 200 filled.
- **`p: true` means unconfirmed**: the app proposed it and the person has not agreed yet. Show these
  more quietly (lighter, italic, dashed) or leave them out, but never present them as fact.
- **The life runs from the birth month to this month**, or to the death month. Ignore cells outside
  that range; the helpers already do.
- **Homes may be missing or incomplete.** `homeAt` can return `undefined`.
- **Place names are whatever the person typed** ("Madison, WI", "Bangkok"). There are no coordinates.
- A life read from a link may also carry a top-level field `t` (a list of numbers, beside `name` and
  `cells`). It belongs to the app; ignore it. It is unrelated to the `t` inside each cell, which is the headline.

A small example (the JSON export form; `read` turns it into a `Life`):

```json
{
  "schema": "life-grid/1",
  "name": "Mira",
  "birth": { "month": "2017-05", "place": "Leeds, England" },
  "homes": [{ "from": "2017-05", "place": "Leeds, England" }, { "from": "2022-08", "place": "Bristol, England" }],
  "stays": [],
  "cells": [
    { "month": "2017-05", "text": "Born Leeds" },
    { "month": "2018-05", "text": "1st birthday", "confirmed": false },
    { "month": "2021-09", "text": "Started school" }
  ]
}
```

The link and JSON formats are specified in `docs/data-format.md`. You do not need to read it to make
a view; the reader does the decoding.

## 2. The reader and its helpers

`src/lifegrid.ts` is one file with no dependencies. Import what you need from it. The types `Life`,
`Month`, `Cell` and `LifeEvent` are exported too.

```ts
interface LifeEvent { month: Month; text: string; confirmed: boolean; age: number; home?: string }
```

| Function | Gives you |
|---|---|
| `read(input)` | `Promise<Life \| null>` from a link, a link's payload, or JSON export text or object. `null` if it is not a Life Grid. |
| `events(life)` | `LifeEvent[]`: every filled month, oldest first. |
| `pickEvents(life, n)` | `LifeEvent[]`: up to `n` events worth showing when space is short: at most one per year, spread across the life, one-off and confirmed events first. Oldest first. |
| `weigh(life)` | A scoring function `(e: LifeEvent) => number`, higher is weightier, if you want to rank events yourself. |
| `birthMonth(life)`, `lastMonth(life)` | `Month`: first and last month of the life. |
| `monthsLived(life)`, `age(life)`, `ageAt(life, month)` | Numbers. `monthsLived` counts both the birth month and the last month. `age` and `ageAt` are whole years; 0 in the first year. |
| `homeAt(life, month)` | The place name (`string`) where they lived that month, or `undefined`. |
| `places(life)`, `homeSpans(life)` | `string[]` of places in the order lived in; homes as `{ place, from, to }[]`, `to` inclusive. |
| `colorOf(life, place)` | A hex colour string: the colour Life Grid gives a place. Pass `undefined` (a month with no known home) and it returns a neutral grey. |
| `ageColor(years)`, `season(t)`, `inkOn(hex)` | Hex colour strings. The season-of-life colour for an age; the ramp itself (t from 0 to 1); black or white text for a background. |
| `ym(y, m)`, `yOf`, `mOf`, `addM(month, n)`, `monthsBetween(a, b)`, `fmt(month)`, `short(place)`, `MON` | Month arithmetic and formatting. `yOf` and `mOf` return numbers; `monthsBetween("2000-01", "2000-03")` is 2. `fmt("1986-07")` is `"Jul 1986"`; `short("Madison, WI")` is `"Madison"`; put the full name in a tooltip. |

**The colour idea.** Life Grid colours a life as a year: spring at birth, through summer and autumn to
winter around 88. `ageColor(age)` gives that colour, and places are coloured along the same ramp in the
order they were lived in. Using these keeps a view recognisably part of the family. It is optional.

## 3. Rules every view follows

1. **Read-only.** Never change the `life` object or anything inside it.
2. **The data stays on the device.** Do not send any of it anywhere: no fetches, analytics, fonts or
   images loaded with the data in the address, and no storing it. A link holds someone's whole life.
3. **No new dependencies** for a view inside the app (React is available). Draw with HTML, CSS, SVG or canvas.
4. **Work at every size.** A phone 360 px wide, a laptop, and a large full-screen monitor. Lay out
   from the space you actually have. More space should show more, not just bigger.
5. **Work for every life.** A newborn (age 0, one cell), a child, a 90-year-old, someone who has died,
   a life with one filled month, a life with 400, a life with no homes beyond the birthplace.
6. **Do not show everything if it does not fit.** Use `pickEvents(life, n)` with an `n` chosen from
   the space available, and never let labels overlap. When there is no margin for labels, as on a
   phone, a good fallback is numbered markers on the drawing with the numbered list beneath it.
7. **Light and dark.** Use the app's CSS variables (below) instead of fixed colours for text and
   backgrounds, or check both.
8. **Say what the picture means** in a short caption, and give drawings an accessible label
   (`role="img"` and `aria-label` on an SVG).
9. **Keep it cheap.** Do heavy work once (`useMemo`), not on every render.
10. **The scroll bar is at the far right and starts under the header.** The header never scrolls and no
    scroll bar may run up beside it or sit partway across the window. The app does this for you: the
    area under the header is the page's scroll box and spans the window, so a view that is simply
    taller than the screen needs nothing. If your view scrolls inside its own box instead
    (`overflow: auto` on a fixed height), that box must reach the window's right edge; see Size in section 4.

A view is drawn directly on the page background, `--bg`. CSS variables available inside the app: `--bg` (page), `--surface` (cards), `--ink` (text), `--dim`
(secondary text), `--line` (hairlines), `--accent`. Text is the system font at 15 px.

---

## 4. Route A: a view inside the app

Add **one file** to `src/views/`. Nothing else is edited: the app finds it.

The file exports two things:

- `view` — its description: `id` (short, unique, lower case), `name` (shown in the menu), `at` (the
  percentage of months filled in at which it unlocks for its owner; shared links always show every
  view), `icon` (the `d` of an SVG path, drawn in a 24×24 box with a 1.8 stroke, round caps and joins, and no fill; keep it to a few simple strokes), and
  optionally `legend: false` to hide the colour key of places.
- a default React component, which receives `{ life, onCell }`.

`onCell` is a function to call with a month when the person clicks an event; the app opens that
month's editor. It is `undefined` on a read-only shared link, so only make things clickable when it exists.

Views are ordered by `at`, then by file name; a numeric prefix (`70-`) sets the order among equals.
The views that exist today, so you can pick an unused `id`, prefix and a sensible `at`:

| File | `id` | `at` |
|---|---|---|
| `10-grid.tsx` | `grid` | 0 |
| `20-timeline.tsx` | `h` | 5 |
| `30-timeline-world.tsx` | `hw` | 10 |
| `40-timeline-vertical.tsx` | `v` | 20 |
| `50-tree.tsx` | `tree` | 35 |
| `60-voyager.tsx` | `voyager` | 50 |
| `60-spiral.tsx` | `spiral` | 20 |
| `70-tech.tsx` | `tech` | 20 |

Choosing `at`: a view that still looks good with little data can unlock early (5–20); one that needs a
fuller life to be worth seeing should unlock later (30–60). List the folder to see any views added since.

A complete, minimal view — copy it and change it:

```tsx
// src/views/70-decades.tsx
import { useMemo } from 'react';
import type { ViewDef, ViewProps } from '../views';
import { events, pickEvents, age, ageColor, inkOn, fmt } from '../lifegrid';

export const view: ViewDef = {
  id: 'decades',
  name: 'Decades',
  at: 15,
  icon: 'M4 20V10M10 20V4M16 20v-8M3 20h18',
};

export default function Decades({ life, onCell }: ViewProps) {
  const rows = useMemo(() => {
    const all = events(life), n = Math.floor(age(life) / 10) + 1;
    return Array.from({ length: n }, (_, d) => {
      const mine = all.filter((e) => Math.floor(e.age / 10) === d);
      return { d, count: mine.length, shown: pickEvents({ ...life, cells: Object.fromEntries(mine.map((e) => [e.month, life.cells[e.month]])) }, 3) };
    });
  }, [life]);

  return (
    <div className="decades">
      <style>{`
        .decades { max-width: 640px; margin: 0 auto; padding: 12px 16px 40px; }
        .decades section { display: grid; grid-template-columns: 64px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); }
        .decades h3 { margin: 0; border-radius: 8px; display: grid; place-items: center; font-size: 15px; min-height: 48px; }
        .decades ul { margin: 0; padding: 0; list-style: none; font-size: 14px; }
        .decades li.quiet { color: var(--dim); font-style: italic; }
        .decades button { all: unset; cursor: pointer; } .decades button:hover { text-decoration: underline; }
        .decades p { margin: 0; font-size: 12px; color: var(--dim); }
      `}</style>
      {rows.map((r) => (
        <section key={r.d}>
          <h3 style={{ background: ageColor(r.d * 10 + 5), color: inkOn(ageColor(r.d * 10 + 5)) }}>{r.d * 10}s</h3>
          <div>
            <ul>
              {r.shown.map((e) => (
                <li key={e.month} className={e.confirmed ? '' : 'quiet'}>
                  {onCell ? <button onClick={() => onCell(e.month)}>{fmt(e.month)} · {e.text}</button> : <>{fmt(e.month)} · {e.text}</>}
                </li>))}
            </ul>
            <p>{r.count === 0 ? 'Nothing written yet.' : `${r.count} ${r.count === 1 ? 'month' : 'months'} filled in.`}</p>
          </div>
        </section>))}
    </div>
  );
}
```

Notes for a view inside the app:

- **Styles.** Put the view's CSS in a `<style>` element inside the component, as above, with every
  rule under one class named after the view. The app's own `button` and `input` styles are heavy;
  start buttons with `all: unset`.
- **Size.** The view is placed in the page's main column below a header about 58 px tall, so
  `height: calc(100dvh - 58px)` on your outer element fills the screen; put your caption inside that
  element. If that element scrolls itself (`overflow: auto`), rule 10 applies: it has to span the
  window so its scroll bar is at the far right. Add your view's class to the `:has(.techv, .carv)` rule
  near the end of `src/styles.css`, which widens the box and keeps the content centred with padding.
  A view that just grows taller than the screen needs none of this. Do not rely on the window size, because a menu may be docked beside the view. Measure
  your own element instead:

  ```tsx
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize([el.clientWidth, el.clientHeight]));
    ro.observe(el); setSize([el.clientWidth, el.clientHeight]);
    return () => ro.disconnect();
  }, []);
  // <div ref={box} …>  then lay out from size[0] × size[1]; draw nothing until both are non-zero
  ```
- **The colour key.** Unless `legend: false`, the app shows a key of places in the same `colorOf`
  colours: a narrow column to the right of the view on a wide screen. It is not shown on a phone, so say in
  your caption what the colours mean. It takes its own space; you do not need to leave room for it. Hide it if your view does not colour
  by place, or names the places itself.
- **Do not use `s`.** `ViewProps` also carries `s`, the app's internal record, for the built-in views.
  New views use `life` and the reader's helpers only, so they keep working when the app changes.
- **Examples to read:** `src/views/*.tsx` are the built-in views' entries; `src/Tree.tsx` and
  `src/Voyager.tsx` are full drawings made from an age and a set of picked events.

Try it: `npm install`, `npm run dev`, open `http://localhost:5173/examples/`, and click a sample's name
under "Sample lives". That opens the app itself on that life as a read-only shared link, where every
view is unlocked: press the view button at the top right until yours appears.
`npx tsc --noEmit` must pass.

## 5. Route B: a view on your own page

Any page can take a pasted Life Grid link. Copy the reader next to your page — `public/lifegrid.js`,
made by `npm run build:reader` (8 kB, no dependencies) — and:

```html
<textarea id="link" placeholder="Paste your Life Grid link"></textarea>
<ol id="out"></ol>
<script type="module">
  import { read, pickEvents, fmt } from './lifegrid.js';
  document.getElementById('link').addEventListener('input', async (e) => {
    const life = await read(e.target.value);                    // null if it is not a Life Grid
    const out = document.getElementById('out');
    out.textContent = '';
    if (!life) return;
    for (const ev of pickEvents(life, 10)) {
      const li = document.createElement('li');
      li.textContent = `${fmt(ev.month)}, age ${ev.age}: ${ev.text}`;   // textContent, never innerHTML, for people's words
      out.append(li);
    }
  });
</script>
```

Things that are different outside the app:

- **Ask for the read-only link** (the one the app calls "Share link", containing `#s.`). The reader
  accepts the owner's link too, but people should not hand that out.
- **Tell people what happens to it.** Say on the page that the link is read in their browser and not
  sent anywhere, and make that true. A link shows the person's whole life to whoever has it.
- **Treat every string as untrusted text.** Names, places and headlines are typed by people; insert
  them with `textContent` or escape them, never as HTML.
- **The reader needs a modern browser** (it uses `DecompressionStream`): current Chrome, Edge,
  Firefox and Safari. `read` returns `null` if decoding fails.
- **Comparing with your own timeline** (a company's history, a band's tours): turn both into dated
  points on one axis. `events(life)` gives months; `ageAt(life, month)` tells you how old the person
  was at any date of yours.

`examples/index.html` is a working outside view; view its source.

---

## 6. Checklist before you call it done

Test with the sample lives in `data/samples/` (open `http://localhost:5173/examples/`):

| Sample | What it catches |
|---|---|
| `child.json` | Age 9: short life, few events, unconfirmed entries |
| `adult.json` | Age 42: 165 entries, several homes, a stay |
| `elder-sparse.json` | Age 85: long life with only 12 entries |
| `nearly-empty.json` | One entry |
| `../arthur-c-clarke.json` | A long, full life that has ended (`death`) |

- [ ] Nothing overlaps or runs off the page at 360 px wide, at about 1280 px, and full screen on a large monitor.
- [ ] A larger screen shows more detail, not only a bigger picture.
- [ ] Every sample draws without errors in the browser console, including the nearly empty one.
- [ ] Unconfirmed entries look different from confirmed ones, or are left out.
- [ ] It reads correctly in light and dark mode.
- [ ] On a wide screen, any vertical scroll bar is at the far right of the window and starts under the header.
- [ ] The life is not modified, stored or sent anywhere.
- [ ] There is a caption saying what the picture shows, and the drawing has an accessible label.
- [ ] Inside the app: clicking an event calls `onCell(month)` when `onCell` exists; nothing is clickable when it does not.
- [ ] Inside the app: only your one file in `src/views/` was added, and `npx tsc --noEmit` passes.

## 7. What is fixed and what may change

- **Fixed:** the `Life` shape in section 1, the functions in section 2, the `view` description and
  `{ life, onCell }` in section 4, and the link and JSON formats (`docs/data-format.md`; readers of
  `life-grid/1` and link format 2 keep working). Additions will be optional fields.
- **May change:** anything else in `src/`, including `s`, the built-in views and the app's CSS classes.
