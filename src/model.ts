export type YM = string; // "YYYY-MM"

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const ym = (y: number, m: number): YM => `${y}-${String(m).padStart(2, '0')}`;
export const yOf = (s: YM) => +s.slice(0, 4);
export const mOf = (s: YM) => +s.slice(5, 7);
export const nowYM = (): YM => { const d = new Date(); return ym(d.getFullYear(), d.getMonth() + 1); };
export const addM = (s: YM, n: number): YM => { const t = yOf(s) * 12 + mOf(s) - 1 + n; return ym(Math.floor(t / 12), (t % 12) + 1); };
export const fmt = (s: YM) => `${MON[mOf(s) - 1]} ${yOf(s)}`;
/** A place name without its region: "Madison, WI" → "Madison". Views show this and keep the full name for tooltips. */
export const short = (p: string) => p.split(',')[0].trim();

export interface Cell { t: string; p?: boolean } // p = placeholder written by the script
export interface Item { k: string; p?: any }
export interface Anchor { label: string; month: number; from: number }

export interface State {
  v: 1;
  id: string;
  name?: string;
  birth?: { y: number; m: number; place: string; d?: number }; // d = day of the month, when known
  death?: { y: number; m: number; d?: number }; // set for someone who has died: the grid and the count end here
  homes: { from: YM; place: string }[];
  stays: { from: YM; to: YM; place: string }[];
  cells: Record<YM, Cell>;
  schoolMonth: number;
  firstGrade?: number;
  anchors: Anchor[];
  cues: Record<string, string[]>;
  queue: Item[];
  conflicts: { at: YM; old: string; neu: string }[];
  log: { k: string; q: string; a: any; n?: number }[];
  changed: YM[];
  done: boolean;
}

export const fresh = (queue: Item[]): State => ({
  v: 1, id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
  homes: [], stays: [], cells: {}, schoolMonth: 9, anchors: [], cues: {},
  queue: structuredClone(queue), conflicts: [], log: [], changed: [], done: false,
});

export const birthYM = (s: State): YM => ym(s.birth!.y, s.birth!.m);
/**
 * A cell that only says again what the month just before (or one of the last few) already said: a long stretch
 * with the same words, perhaps broken by a single event. Views show such a stretch once, not in every month.
 */
export const repeatsEarlier = (s: State, at: YM, within = 3): boolean => {
  const t = s.cells[at]?.t;
  if (!t) return false;
  for (let i = 1; i <= within; i++) if (s.cells[addM(at, -i)]?.t === t) return true;
  return false;
};

/** The last month of the life: the death month, or this month for someone living. */
export const lastYM = (s: State): YM => (s.death && ym(s.death.y, s.death.m) < nowYM() ? ym(s.death.y, s.death.m) : nowYM());
export const inLife = (s: State, at: YM) => !!s.birth && at >= birthYM(s) && at <= lastYM(s);

export function homeAt(s: State, at: YM): string | undefined {
  for (const st of s.stays) if (at >= st.from && at <= st.to) return st.place;
  let place: string | undefined;
  for (const h of s.homes) if (h.from <= at) place = h.place;
  return place;
}

/** Main home spans in order, each running until the month before the next move. */
export function spans(s: State) {
  return s.homes.map((h, i) => ({
    place: h.place, from: h.from,
    to: i + 1 < s.homes.length ? addM(s.homes[i + 1].from, -1) : lastYM(s),
  }));
}

// One ramp for the whole app: blossom, leaf, high summer, harvest, russet, dusk, frost.
const SEASONS: [number, string][] = [
  [0, '#e58fb1'], [0.12, '#8bc34a'], [0.3, '#2fa36b'], [0.42, '#f2b705'], [0.55, '#e8792b'],
  [0.68, '#b5432e'], [0.8, '#7a5c8e'], [0.9, '#4a7fb5'], [1, '#9fb8cc'],
];
let ramp = SEASONS;
/** Swap the colour ramp (a theme's list of hex colours, spread evenly); null restores the built-in one. */
export const setRamp = (colors: string[] | null) => { ramp = colors ? colors.map((c, i) => [i / (colors.length - 1), c] as [number, string]) : SEASONS; };
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** Colour at t in 0..1 along spring → summer → fall → winter. */
export function season(t: number): string {
  t = Math.min(1, Math.max(0, t));
  let i = 1; while (i < ramp.length - 1 && ramp[i][0] < t) i++;
  const [t0, c0] = ramp[i - 1], [t1, c1] = ramp[i];
  const k = (t - t0) / (t1 - t0), a = rgb(c0), b = rgb(c1);
  return '#' + a.map((v, j) => Math.round(v + (b[j] - v) * k).toString(16).padStart(2, '0')).join('');
}
/** Readable text colour on top of a ramp colour. */
export const inkOn = (h: string) => { const [r, g, b] = rgb(h); return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1c1d21' : '#ffffff'; };
export const LIFE = 88; // years the ramp spans: 22 per season
export const ageColor = (age: number) => season(age / LIFE);
export function places(s: State): string[] {
  const out: string[] = [];
  for (const p of [...s.homes, ...s.stays].sort((a, b) => a.from.localeCompare(b.from))) if (!out.includes(p.place)) out.push(p.place);
  return out;
}
export const colorOf = (s: State, place?: string) => {
  const i = place ? places(s).indexOf(place) : -1;
  if (i < 0) return place || places(s).length ? '#7d8590' : season(0.12); // no homes yet: the colour the first one will get
  // Places run along the ramp in the order they were lived in, ending at the season the person is in now.
  const n = places(s).length, end = Math.min(1, Math.max(0.5, (yOf(lastYM(s)) - s.birth!.y) / LIFE));
  return season(n > 1 ? 0.03 + (end - 0.03) * (i / (n - 1)) : 0.12);
};

/**
 * Write a headline into a month. One headline per cell:
 * - a placeholder never replaces anything already there
 * - a confirmed answer replaces a placeholder
 * - two different confirmed answers become a conflict for the user to settle
 */
export function setCell(s: State, at: YM, text: string, placeholder = false, force = false) {
  text = text.trim();
  if (!text || !inLife(s, at)) return;
  const cur = s.cells[at];
  if (cur && !force) {
    if (placeholder) return;
    if (!cur.p && cur.t !== text) { s.conflicts.push({ at, old: cur.t, neu: text }); return; }
  }
  s.cells[at] = placeholder ? { t: text, p: true } : { t: text };
  if (!s.changed.includes(at)) s.changed.push(at);
}

/** Correct the birth month after the fact: moves the first cell and the start of the first home. */
export function setBirth(s: State, y: number, m: number) {
  if (!s.birth) return;
  const old = birthYM(s), neu = ym(y, m);
  if (s.cells[old]?.t.startsWith('Born ')) delete s.cells[old];
  for (const h of s.homes) if (h.from === old) h.from = neu;
  s.birth = { ...s.birth, y, m };
  if (s.homes[0] && s.homes[0].from > neu) s.homes[0].from = neu;
  for (const at of Object.keys(s.cells)) if (at < neu) delete s.cells[at];
  s.cells[neu] = { t: `Born ${short(s.birth.place)}` };
  s.changed.push(neu);
}

export function stats(s: State) {
  if (!s.birth) return { total: 0, filled: 0, placeholders: 0, pct: 0 };
  const b = birthYM(s), n = lastYM(s);
  const total = (yOf(n) - yOf(b)) * 12 + mOf(n) - mOf(b) + 1;
  let filled = 0, placeholders = 0;
  for (const [k, c] of Object.entries(s.cells)) if (k >= b && k <= n) c.p ? placeholders++ : filled++; // months after a death don't count
  return { total, filled, placeholders, pct: total ? Math.round((filled / total) * 100) : 0 };
}

const q = (t: string) => (/[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
export function toCSV(s: State): string {
  if (!s.birth) return '';
  const rows = [['Year', 'Age', ...MON, 'Home'].join(',')];
  for (let y = s.birth.y; y <= yOf(nowYM()); y++) {
    const cells = MON.map((_, i) => { const c = s.cells[ym(y, i + 1)]; return c ? q(c.p ? `(${c.t})` : c.t) : ''; });
    const homes = [...new Set(MON.map((_, i) => inLife(s, ym(y, i + 1)) ? homeAt(s, ym(y, i + 1)) : undefined).filter(Boolean))];
    rows.push([y, s.death && y > s.death.y ? '' : y - s.birth.y, ...cells, q(homes.join(' / '))].join(','));
  }
  return rows.join('\n');
}

/** Portable JSON export (schema "life-grid/1"; see docs/data-format.md). Interview state is left out. */
export function toJSON(s: State): string {
  if (!s.birth) return '';
  const cells = Object.keys(s.cells).sort().map((k) => {
    const c = s.cells[k];
    return c.p ? { month: k, text: c.t, confirmed: false } : { month: k, text: c.t };
  });
  return JSON.stringify({
    schema: 'life-grid/1',
    exportedAt: new Date().toISOString(),
    name: s.name || undefined,
    birth: { month: ym(s.birth.y, s.birth.m), ...(s.birth.d ? { date: `${ym(s.birth.y, s.birth.m)}-${String(s.birth.d).padStart(2, '0')}` } : {}), place: s.birth.place },
    death: s.death ? { month: ym(s.death.y, s.death.m), ...(s.death.d ? { date: `${ym(s.death.y, s.death.m)}-${String(s.death.d).padStart(2, '0')}` } : {}) } : undefined,
    homes: s.homes.map((h) => ({ from: h.from, place: h.place })),
    stays: s.stays.map((t) => ({ from: t.from, to: t.to, place: t.place })),
    cells,
  }, null, 2);
}
