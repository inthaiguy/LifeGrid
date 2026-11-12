import { type YM, ym, nowYM } from './model';

export interface Parsed {
  cells: Record<YM, { t: string; p?: boolean }>;
  count: number;
  firstYear: number;
  lastYear: number;
  /** Earliest month with an entry: a guess at the birth month when the sheet starts at birth. */
  first: YM;
  /** Birthplace, when the first entry reads "Born <place>". */
  bornPlace?: string;
  /** Only from a life-grid JSON export (docs/data-format.md). */
  name?: string;
  birthDay?: number;
  homes?: { from: YM; place: string }[];
  stays?: { from: YM; to: YM; place: string }[];
}

const isYM = (x: any): x is YM => typeof x === 'string' && /^(18|19|20)\d\d-(0[1-9]|1[0-2])$/.test(x);
const str = (x: any, n = 60) => (typeof x === 'string' ? x.trim().slice(0, n) : '');

/** Reads a "life-grid/1" JSON export. Returns null for anything else, including an unknown major version. */
export function parseJSON(text: string): Parsed | null {
  let j: any;
  try { j = JSON.parse(text); } catch { return null; }
  if (!j || typeof j.schema !== 'string' || !/^life-grid\/1(\.|$)/.test(j.schema) || !isYM(j.birth?.month) || !Array.isArray(j.cells)) return null;
  const now = nowYM(), cells: Parsed['cells'] = {};
  for (const c of j.cells) {
    const t = str(c?.text);
    if (isYM(c?.month) && c.month >= j.birth.month && c.month <= now && t) cells[c.month] = c.confirmed === false ? { t, p: true } : { t };
  }
  const homes = (Array.isArray(j.homes) ? j.homes : []).filter((h: any) => isYM(h?.from) && str(h.place)).map((h: any) => ({ from: h.from, place: str(h.place) }));
  const stays = (Array.isArray(j.stays) ? j.stays : []).filter((h: any) => isYM(h?.from) && isYM(h?.to) && str(h.place)).map((h: any) => ({ from: h.from, to: h.to, place: str(h.place) }));
  const keys = Object.keys(cells).sort();
  return {
    cells, count: keys.length, first: j.birth.month, firstYear: +j.birth.month.slice(0, 4),
    lastYear: +(keys[keys.length - 1] || j.birth.month).slice(0, 4),
    bornPlace: str(j.birth.place) || undefined, birthDay: /^\d{4}-\d\d-(0[1-9]|[12]\d|3[01])$/.test(j.birth.date || '') && j.birth.date.startsWith(j.birth.month) ? +j.birth.date.slice(8) : undefined, name: str(j.name) || undefined, homes, stays,
  };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Rows of cells from pasted spreadsheet text (tab-separated) or a CSV file (commas, quoted fields). */
function table(text: string): string[][] {
  const head = text.slice(0, 4000), sep = head.split('\t').length > head.split(',').length ? '\t' : head.split(';').length > head.split(',').length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"' && !cell) quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.replace(/\s+/g, ' ').trim()));
}

/** 0–11 if the header cell names a month ("Jan", "January", "1", "01"), else -1. */
function monthOf(h: string): number {
  const x = h.toLowerCase().replace(/[.\s]/g, '');
  if (/^\d{1,2}$/.test(x)) return +x >= 1 && +x <= 12 ? +x - 1 : -1;
  return x.length >= 3 ? MONTHS.findIndex((m) => x.startsWith(m)) : -1;
}
const isYear = (c: string) => /^(18|19|20)\d\d$/.test(c);

/**
 * Reads a life sheet laid out as one row per year and one column per month. Finds the month
 * columns from a header row when there is one, otherwise takes the twelve columns after the
 * year (skipping an age column). Returns null when no such layout is found.
 */
export function parseSheet(text: string): Parsed | null {
  if (text.trimStart().startsWith('{')) return parseJSON(text);
  const rows = table(text).filter((r) => r.some(Boolean));
  if (!rows.length) return null;

  // The year column is the one where the most rows hold a four-digit year.
  const width = Math.max(...rows.map((r) => r.length));
  let yc = -1, best = 0;
  for (let c = 0; c < width; c++) { const n = rows.filter((r) => isYear(r[c] || '')).length; if (n > best) { best = n; yc = c; } }
  if (yc < 0) return null;

  // Month columns: from a header row naming at least six months, in the order written.
  let cols: number[] = [];
  const header = rows.find((r) => !isYear(r[yc] || '') && r.filter((h) => monthOf(h) >= 0).length >= 6);
  if (header) {
    cols = Array(12).fill(-1);
    header.forEach((h, c) => { const m = monthOf(h); if (c !== yc && m >= 0 && cols[m] < 0) cols[m] = c; });
  } else {
    // No header: the twelve columns after the year, stepping over a column that is all small numbers (age).
    const yrs = rows.filter((r) => isYear(r[yc] || ''));
    let c = yc + 1;
    if (yrs.every((r) => /^\d{0,3}$/.test(r[c] || ''))) c++;
    cols = Array.from({ length: 12 }, (_, i) => c + i);
  }
  if (cols.filter((c) => c >= 0).length < 6) return null;

  const cells: Parsed['cells'] = {}, now = nowYM();
  for (const r of rows) {
    if (!isYear(r[yc] || '')) continue;
    cols.forEach((c, m) => {
      let t = (c >= 0 && r[c]) || '';
      if (!t) return;
      const at = ym(+r[yc], m + 1);
      if (at > now) return;
      // Life Grid's own export writes unconfirmed entries in brackets.
      const p = /^\(.*\)$/.test(t);
      if (p) t = t.slice(1, -1).trim();
      if (t) cells[at] = p ? { t: t.slice(0, 60), p: true } : { t: t.slice(0, 60) };
    });
  }
  const keys = Object.keys(cells).sort();
  if (!keys.length) return null;
  const born = cells[keys[0]].t.match(/^born\s+(?:in\s+)?(.+)$/i);
  return { cells, count: keys.length, firstYear: +keys[0].slice(0, 4), lastYear: +keys[keys.length - 1].slice(0, 4), first: keys[0], bornPlace: born?.[1] };
}
