// Timeline views, horizontal and vertical, with an optional layer of world events (src/world.ts).
// Events are placed on an axis and stacked greedily so labels never overlap.
import { useEffect, useRef } from 'react';
import { WORLD } from './world';
import { type State, type YM, MON, yOf, mOf, nowYM, lastYM, repeatsEarlier, addM, birthYM, homeAt, colorOf, inkOn, fmt, short } from './model';

interface Ev { at: YM; n: number; t: string; p?: boolean; place?: string; col: string }

const PPM = 9;      // horizontal: pixels per month
const LANE = 24;    // horizontal: height of one row of labels
const labelW = (t: string) => Math.min(200, Math.round(t.length * 7) + 20);

/** Every filled cell as a dated event, oldest first. A month that only repeats the one before it adds nothing, so it is left out. */
function events(s: State): Ev[] {
  const base = yOf(birthYM(s)) * 12 + mOf(birthYM(s)) - 1;
  return Object.entries(s.cells)
    .filter(([at]) => at >= birthYM(s) && at <= lastYM(s)) // nothing after a death
    .filter(([at]) => !repeatsEarlier(s, at))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([at, c]) => { const place = homeAt(s, at); return { at, n: yOf(at) * 12 + mOf(at) - 1 - base, t: c.t, p: c.p, place, col: colorOf(s, place) }; });
}

/** The life as runs of months spent in one home, for the coloured band. */
function spans(s: State): { from: number; len: number; place?: string }[] {
  const out: { from: number; len: number; place?: string }[] = [];
  let n = 0;
  for (let at = birthYM(s); at <= lastYM(s); at = addM(at, 1), n++) {
    const place = homeAt(s, at), last = out[out.length - 1];
    if (last && last.place === place) last.len++; else out.push({ from: n, len: 1, place });
  }
  return out;
}

export default function Timeline({ s, dir, world, onCell }: { s: State; dir: 'h' | 'v'; world?: boolean; onCell?: (at: YM) => void }) {
  // Horizontal view: arrow keys, or a click on empty space left or right of centre, move along by most of a screen.
  const scroller = useRef<HTMLDivElement>(null);
  const move = (d: number) => { const el = scroller.current; if (el) el.scrollBy({ left: d * el.clientWidth * 0.8, behavior: 'smooth' }); };
  useEffect(() => {
    if (dir !== 'h') return;
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable], .scrim')) return;
      const el = scroller.current;
      if (!el) return;
      if (e.key === 'ArrowRight') move(1); else if (e.key === 'ArrowLeft') move(-1);
      else if (e.key === 'Home') el.scrollTo({ left: 0, behavior: 'smooth' }); else if (e.key === 'End') el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      else return;
      e.preventDefault();
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [dir]);
  const click = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.ev')) return; // an event opens its editor instead
    const r = e.currentTarget.getBoundingClientRect();
    move(e.clientX < r.left + r.width / 2 ? -1 : 1);
  };
  if (!s.birth) return <div className="grid-empty"><p>Your life, as a timeline.</p><p className="dim">Answer the first question and it appears here.</p></div>;
  const evs = events(s);
  if (!evs.length) return <div className="grid-empty"><p>Nothing on the timeline yet.</p></div>;
  const tip = (e: Ev) => `${fmt(e.at)} · age ${yOf(e.at) - s.birth!.y}${e.place ? ` · ${e.place}` : ''}${e.p ? ' · to confirm' : ''}`;
  const pick = (e: Ev) => onCell && (() => onCell(e.at));

  if (dir === 'v') {
    const years = [...new Set(evs.map((e) => yOf(e.at)))];
    let prev: string | undefined | null = null;
    return (
      <div className="tl v">
        {years.map((y) => (
          <section key={y}>
            <h3><b>{y}</b><span>age {y - s.birth!.y}</span></h3>
            <ol>
              {evs.filter((e) => yOf(e.at) === y).map((e) => {
                const moved = e.place !== prev && !!e.place; prev = e.place;
                return (
                  <li key={e.at} className={e.p ? 'ph' : ''} style={{ ['--c' as any]: e.col }}>
                    <time>{MON[mOf(e.at) - 1]}</time>
                    <button onClick={pick(e)} title={tip(e)}>{e.t}</button>
                    {moved && <em style={{ background: e.col, color: inkOn(e.col) }} title={e.place}>{short(e.place!)}</em>}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    );
  }

  // Horizontal: time runs left to right at a fixed scale; each label takes the lowest row where it fits.
  const ends: number[] = [];
  const placed = evs.map((e) => {
    const x = e.n * PPM, w = labelW(e.t);
    let lane = ends.findIndex((end) => end + 6 <= x);
    if (lane < 0) lane = ends.length;
    ends[lane] = x + w;
    return { e, x, w, lane };
  });
  const sp = spans(s), months = sp.reduce((a, b) => a + b.len, 0);
  // World events hang below the axis the same way, for the part of history this life overlaps.
  const b0 = s.birth.y * 12 + s.birth.m - 1, wends: number[] = [];
  const wplaced = !world ? [] : WORLD.map(([at, name]) => ({ at, name, n: yOf(at) * 12 + mOf(at) - 1 - b0 })).filter((w) => w.n >= 0 && w.n < months).map((w) => {
    const x = w.n * PPM, wd = labelW(w.name);
    let lane = wends.findIndex((end) => end + 6 <= x);
    if (lane < 0) lane = wends.length;
    wends[lane] = x + wd;
    return { ...w, x, wd, lane };
  });
  const top = ends.length * LANE + 10, width = Math.max(months * PPM, ...ends, ...wends) + 24;
  const wtop = top + 56; // below the band and the year marks
  const y0 = s.birth.y, firstJan = (13 - s.birth.m) % 12; // months from birth to the first January
  const step = months > 30 * 12 ? 5 : months > 14 * 12 ? 2 : 1; // label every year on a short life
  const ticks: { n: number; y: number }[] = [];
  for (let n = firstJan, y = y0 + (s.birth.m === 1 ? 0 : 1); n < months; n += 12, y++) ticks.push({ n, y });

  return (
    <div className="tl h" ref={scroller} onClick={click}>
      <div className="tl-in" style={{ width, height: wplaced.length ? wtop + wends.length * LANE + 4 : top + 62 }}>
        {placed.map(({ e, x, w, lane }) => (
          <button key={e.at} className={`ev${e.p ? ' ph' : ''}`} onClick={pick(e)} title={`${e.t} — ${tip(e)}`}
            style={{ left: x, top: top - (lane + 1) * LANE, width: w, ['--c' as any]: e.col, ['--stem' as any]: `${lane * LANE + 4}px` }}><span>{e.t}</span></button>
        ))}
        <div className="band" style={{ top }}>
          {sp.map((h) => { const col = colorOf(s, h.place); return <div key={h.from} style={{ left: h.from * PPM, width: h.len * PPM, background: col, color: inkOn(col) }} title={h.place}>{h.place && h.len * PPM > 60 ? short(h.place) : ''}</div>; })}
        </div>
        {wplaced.map((w) => (
          <div key={w.at} className="ev w" title={`${w.name} — ${fmt(w.at)} · age ${yOf(w.at) - s.birth!.y}`}
            style={{ left: w.x, top: wtop + w.lane * LANE, width: w.wd, ['--stem' as any]: `${w.lane * LANE + 38}px` }}><span>{w.name}</span></div>
        ))}
        {ticks.map((t) => <div key={t.y} className={`tick${(t.y - y0) % step ? '' : ' major'}`} style={{ left: t.n * PPM, top: top + 20 }}><b>{t.y}</b><span>{t.y - y0}</span></div>)}
      </div>
    </div>
  );
}
