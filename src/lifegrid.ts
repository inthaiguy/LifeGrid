// Life Grid reader. One file, no dependencies, safe to copy into any project.
//
// Give it a Life Grid link (or a JSON export) and it returns the life as plain data, plus the
// small helpers every view ends up needing. It only reads: nothing is stored or sent anywhere.
//
//   import { read, events, ageAt, homeAt } from './lifegrid';
//   const life = await read(pastedLinkOrJson);     // null if it is not a Life Grid
//   for (const e of events(life)) console.log(e.month, e.text, e.age, e.home);
//
// The formats are specified in docs/data-format.md; writing a view is described in docs/making-a-view.md.

/** A month, "YYYY-MM". Months compare correctly as strings. */
export type Month = string;

export interface Cell {
  /** The headline for the month, a few words. */
  t: string;
  /** True for an entry the app proposed and the person has not confirmed. */
  p?: boolean;
}

export interface Life {
  name?: string;
  /** Year, month (1–12) and place of birth; `d` is the day of the month when known. */
  birth: { y: number; m: number; place: string; d?: number };
  /** Present only for someone who has died. The life ends in this month. */
  death?: { y: number; m: number; d?: number };
  /** Main homes in order. Each lasts until the month before the next begins. */
  homes: { from: Month; place: string }[];
  /** Temporary stays (inclusive) that override the home for those months. */
  stays: { from: Month; to: Month; place: string }[];
  /** One headline per month, keyed by month. Most months are usually empty. */
  cells: Record<Month, Cell>;
  /** Used by the Life Grid app only (questions still waiting). Views should ignore it. */
  t?: number[];
}

/* ---------- months ---------- */

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const ym = (y: number, m: number): Month => `${y}-${String(m).padStart(2, '0')}`;
export const yOf = (s: Month) => +s.slice(0, 4);
export const mOf = (s: Month) => +s.slice(5, 7);
export const addM = (s: Month, n: number): Month => { const t = yOf(s) * 12 + mOf(s) - 1 + n; return ym(Math.floor(t / 12), (t % 12) + 1); };
/** Whole months from a to b (negative if b is earlier). */
export const monthsBetween = (a: Month, b: Month) => (yOf(b) - yOf(a)) * 12 + mOf(b) - mOf(a);
/** "Jul 1986" */
export const fmt = (s: Month) => `${MON[mOf(s) - 1]} ${yOf(s)}`;
export const thisMonth = (): Month => { const d = new Date(); return ym(d.getFullYear(), d.getMonth() + 1); };
/** A place name without its region: "Madison, WI" → "Madison". */
export const short = (place: string) => place.split(',')[0].trim();

/* ---------- reading ---------- */

const isMonth = (x: unknown): x is Month => typeof x === 'string' && /^(18|19|20)\d\d-(0[1-9]|1[0-2])$/.test(x);
const text = (x: unknown, n = 60) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, n) : '');

/**
 * Read a life from whatever the person supplied: a Life Grid link (read-only "#s.…" or the owner's
 * "#…"), the bare payload from a link, or the text or parsed object of a JSON export.
 * Returns null when the input is not a Life Grid.
 */
export async function read(input: string | object): Promise<Life | null> {
  if (typeof input !== 'string') return readJSON(input);
  const s = input.trim();
  return s.startsWith('{') ? readJSON(s) : readLink(s);
}

/** Read the life carried in a Life Grid link, or in the payload after the "#". */
export async function readLink(link: string): Promise<Life | null> {
  let p = link.trim();
  if (p.includes('#')) p = p.slice(p.indexOf('#') + 1);
  if (p.startsWith('s.')) p = p.slice(2);
  if (!p || /[^A-Za-z0-9_-]/.test(p)) return null;
  try {
    const bin = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
    const z = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const out = await new Response(new Blob([z as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    const body = new TextDecoder().decode(out);
    if (body[0] !== '{') return unpack(body);
    const j = JSON.parse(body); // links made before format 2 carried the fields as JSON
    return j && j.birth && j.cells && j.homes ? { stays: [], ...j } : null;
  } catch { return null; }
}

/** Link format 2: lines of text, every month written as its offset from the birth month. */
function unpack(body: string): Life | null {
  const L = body.split('\n');
  if (L[0] !== '2' || L.length < 4) return null;
  const [y, m, place, d, dead, dd] = L[2].split('\t');
  const birth: Life['birth'] = { y: +y, m: +m, place: place || '' }, base = birth.y * 12 + birth.m - 1;
  if (!birth.y || !(birth.m >= 1 && birth.m <= 12)) return null;
  if (+d >= 1 && +d <= 31) birth.d = +d;
  const at = (n: number): Month => ym(Math.floor((base + n) / 12), ((base + n) % 12) + 1);
  const death: Life['death'] = dead !== undefined && dead !== '' && +dead >= 0
    ? { y: yOf(at(+dead)), m: mOf(at(+dead)), ...(+dd >= 1 && +dd <= 31 ? { d: +dd } : {}) } : undefined;
  let i = 4;
  const homes: Life['homes'] = [], stays: Life['stays'] = [], cells: Life['cells'] = {};
  for (; i < L.length && L[i]; i++) { const [f, pl] = L[i].split('\t'); homes.push({ from: at(+f), place: pl || '' }); }
  for (i++; i < L.length && L[i]; i++) { const [f, to, pl] = L[i].split('\t'); stays.push({ from: at(+f), to: at(+to), place: pl || '' }); }
  for (let n = 0, j = i + 1; j < L.length; j++, n++) {
    const l = L[j];
    if (!l) continue;
    cells[at(n)] = l[0] === '?' ? { t: l.slice(1), p: true } : { t: l[0] === '\\' ? l.slice(1) : l };
  }
  return { name: L[1] || undefined, birth, death, homes, stays, cells, t: L[3] ? L[3].split(',').map(Number) : [] };
}

/** Read a "life-grid/1" JSON export (text or already parsed). Null for anything else. */
export function readJSON(json: string | object): Life | null {
  let j: any = json;
  if (typeof json === 'string') { try { j = JSON.parse(json); } catch { return null; } }
  if (!j || typeof j.schema !== 'string' || !/^life-grid\/1(\.|$)/.test(j.schema) || !isMonth(j.birth?.month) || !Array.isArray(j.cells)) return null;
  const day = (date: unknown, month: Month) => (typeof date === 'string' && /^\d{4}-\d\d-(0[1-9]|[12]\d|3[01])$/.test(date) && date.startsWith(month) ? +date.slice(8) : undefined);
  const bm: Month = j.birth.month, dm: Month | undefined = isMonth(j.death?.month) && j.death.month >= bm ? j.death.month : undefined;
  const end = dm && dm < thisMonth() ? dm : thisMonth();
  const cells: Life['cells'] = {};
  for (const c of j.cells) {
    const t = text(c?.text);
    if (isMonth(c?.month) && c.month >= bm && c.month <= end && t) cells[c.month] = c.confirmed === false ? { t, p: true } : { t };
  }
  const bd = day(j.birth.date, bm), ddd = dm && day(j.death.date, dm);
  return {
    name: text(j.name, 30) || undefined,
    birth: { y: yOf(bm), m: mOf(bm), place: text(j.birth.place), ...(bd ? { d: bd } : {}) },
    death: dm ? { y: yOf(dm), m: mOf(dm), ...(ddd ? { d: ddd } : {}) } : undefined,
    homes: (Array.isArray(j.homes) ? j.homes : []).filter((h: any) => isMonth(h?.from) && text(h.place)).map((h: any) => ({ from: h.from, place: text(h.place) })),
    stays: (Array.isArray(j.stays) ? j.stays : []).filter((h: any) => isMonth(h?.from) && isMonth(h?.to) && text(h.place)).map((h: any) => ({ from: h.from, to: h.to, place: text(h.place) })),
    cells,
  };
}

/* ---------- the shape of a life ---------- */

export const birthMonth = (life: Life): Month => ym(life.birth.y, life.birth.m);
/** The last month of the life: the death month, or this month for someone living. */
export const lastMonth = (life: Life): Month => { const d = life.death && ym(life.death.y, life.death.m); return d && d < thisMonth() ? d : thisMonth(); };
/** Number of months lived, counting the first and the last. */
export const monthsLived = (life: Life) => monthsBetween(birthMonth(life), lastMonth(life)) + 1;
/** Age in whole years during a month (0 in the first year). */
export const ageAt = (life: Life, at: Month) => Math.floor(monthsBetween(birthMonth(life), at) / 12);
/** Age now, or at death. */
export const age = (life: Life) => ageAt(life, lastMonth(life));
/** Where the person was living in a month: a stay if one covers it, else the latest home begun by then. */
export function homeAt(life: Life, at: Month): string | undefined {
  for (const st of life.stays) if (at >= st.from && at <= st.to) return st.place;
  let place: string | undefined;
  for (const h of life.homes) if (h.from <= at) place = h.place;
  return place;
}
/** Every place lived in, in the order first lived in. */
export function places(life: Life): string[] {
  const out: string[] = [];
  for (const p of [...life.homes, ...life.stays].sort((a, b) => a.from.localeCompare(b.from))) if (!out.includes(p.place)) out.push(p.place);
  return out;
}
/** The main homes as spans: place, first month, last month. */
export function homeSpans(life: Life): { place: string; from: Month; to: Month }[] {
  return life.homes.map((h, i) => ({ place: h.place, from: h.from, to: i + 1 < life.homes.length ? addM(life.homes[i + 1].from, -1) : lastMonth(life) }));
}

/* ---------- events ---------- */

export interface LifeEvent {
  month: Month;
  text: string;
  /** False for an entry the person has not confirmed. Draw these more quietly. */
  confirmed: boolean;
  /** Age in whole years that month. */
  age: number;
  /** Where they were living, if known. */
  home?: string;
}

/** Every filled month within the life, oldest first. */
export function events(life: Life): LifeEvent[] {
  const from = birthMonth(life), to = lastMonth(life);
  return Object.keys(life.cells).filter((k) => k >= from && k <= to).sort()
    .map((k) => ({ month: k, text: life.cells[k].t, confirmed: !life.cells[k].p, age: ageAt(life, k), home: homeAt(life, k) }));
}

/**
 * A weight for how much an event is worth showing when there is not room for all of them:
 * confirmed and one-off events (a birth, a move, a wedding, a first) outrank yearly ones.
 */
export function weigh(life: Life): (e: LifeEvent) => number {
  const norm = (t: string) => t.toLowerCase().replace(/\d+(st|nd|rd|th)?/g, '#').trim();
  const freq: Record<string, number> = {};
  for (const c of Object.values(life.cells)) freq[norm(c.t)] = (freq[norm(c.t)] || 0) + 1;
  return (e) => (e.confirmed ? 3 : 0)
    + (/^(born|moved?|married|wedding|engaged|graduat|first|started|new job|retired|bought)/i.test(e.text) ? 2 : 0)
    - (freq[norm(e.text)] > 2 ? 2 : 0);
}

/**
 * Choose up to `n` events to show when space is short: at most one per year, spread evenly across
 * the life, the weightiest in each stretch. Returned oldest first.
 */
export function pickEvents(life: Life, n: number): LifeEvent[] {
  const w = weigh(life), best = new Map<number, LifeEvent>();
  for (const e of events(life)) { const cur = best.get(e.age); if (!cur || w(e) > w(cur)) best.set(e.age, e); }
  const years = [...best.values()].sort((a, b) => a.age - b.age);
  if (years.length <= n) return years;
  const span = age(life) + 1, out: LifeEvent[] = [];
  for (let b = 0; b < n; b++) {
    const lo = (b / n) * span, hi = ((b + 1) / n) * span;
    const c = years.filter((e) => e.age >= lo && e.age < hi).sort((a, z) => w(z) - w(a) || a.age - z.age)[0];
    if (c) out.push(c);
  }
  return out;
}

/* ---------- colours ---------- */

// Life Grid colours a life as a year: spring at birth, then summer, autumn and winter.
const SEASONS: [number, string][] = [
  [0, '#e58fb1'], [0.12, '#8bc34a'], [0.3, '#2fa36b'], [0.42, '#f2b705'], [0.55, '#e8792b'],
  [0.68, '#b5432e'], [0.8, '#7a5c8e'], [0.9, '#4a7fb5'], [1, '#9fb8cc'],
];
let ramp = SEASONS;
/** Use another list of hex colours for the ramp, spread evenly (null restores the built-in one). The app calls this when a theme is chosen. */
export const setRamp = (colors: string[] | null) => { ramp = colors && colors.length >= 2 ? colors.map((c, i) => [i / (colors.length - 1), c] as [number, string]) : SEASONS; };
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Colour at t (0–1) along spring → summer → autumn → winter. */
export function season(t: number): string {
  t = Math.min(1, Math.max(0, t));
  let i = 1; while (i < ramp.length - 1 && ramp[i][0] < t) i++;
  const [t0, c0] = ramp[i - 1], [t1, c1] = ramp[i], k = (t - t0) / (t1 - t0), a = rgb(c0), b = rgb(c1);
  return '#' + a.map((v, j) => Math.round(v + (b[j] - v) * k).toString(16).padStart(2, '0')).join('');
}
/** Black or white, whichever reads better on the given colour. */
export const inkOn = (hex: string) => { const [r, g, b] = rgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1c1d21' : '#ffffff'; };
/** Years the colour ramp spans: 22 per season. */
export const LIFESPAN = 88;
/** The season colour for an age in years. */
export const ageColor = (years: number) => season(years / LIFESPAN);
/** The colour Life Grid gives a place: places run along the ramp in the order they were lived in. */
export function colorOf(life: Life, place?: string): string {
  const all = places(life), i = place ? all.indexOf(place) : -1;
  if (i < 0) return place || all.length ? '#7d8590' : season(0.12);
  const end = Math.min(1, Math.max(0.5, age(life) / LIFESPAN));
  return season(all.length > 1 ? 0.03 + (end - 0.03) * (i / (all.length - 1)) : 0.12);
}
