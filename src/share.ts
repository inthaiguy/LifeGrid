import { type State, type YM, ym, yOf, mOf } from './model';
import { STAGES, pending } from './script';

// The shareable part of a grid: enough to redraw it, nothing about the interview.
export type Shared = Pick<State, 'name' | 'birth' | 'homes' | 'stays' | 'cells'> & { t?: number[] }; // t = topics with questions still waiting

const pipe = async (bytes: Uint8Array, stream: TransformStream) =>
  new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());

// Link format 2: plain lines, no dates. Every month is its offset from the birth month, and the
// cells are one line per month in order (blank = empty, leading "?" = placeholder). Runs of blank
// lines deflate to almost nothing, which makes this about a third shorter than the JSON it replaced.
const clean = (x: string) => x.replace(/[\t\n\r]+/g, ' ');
const off = (base: number, at: YM) => yOf(at) * 12 + mOf(at) - 1 - base;
const at = (base: number, n: number): YM => ym(Math.floor((base + n) / 12), ((base + n) % 12) + 1);

function pack(p: Shared): string {
  const b = p.birth!, base = b.y * 12 + b.m - 1;
  const lines: string[] = [];
  for (const [k, c] of Object.entries(p.cells)) {
    const n = off(base, k);
    if (n >= 0) lines[n] = c.p ? '?' + clean(c.t) : clean(c.t).replace(/^[?\\]/, '\\$&');
  }
  return [
    '2', clean(p.name || ''), [b.y, b.m, clean(b.place), b.d || ''].join('\t'), (p.t || []).join(','),
    ...p.homes.map((h) => off(base, h.from) + '\t' + clean(h.place)), '',
    ...p.stays.map((s) => [off(base, s.from), off(base, s.to), clean(s.place)].join('\t')), '',
    ...Array.from(lines, (l) => l || ''),
  ].join('\n');
}

function unpack(text: string): Shared | null {
  const L = text.split('\n');
  if (L[0] !== '2') return null;
  const [y, m, place, d] = L[2].split('\t');
  const birth: NonNullable<Shared['birth']> = { y: +y, m: +m, place: place || '' }, base = birth.y * 12 + birth.m - 1;
  if (!birth.y || !(birth.m >= 1 && birth.m <= 12)) return null;
  if (+d >= 1 && +d <= 31) birth.d = +d;
  let i = 4;
  const homes: Shared['homes'] = [], stays: Shared['stays'] = [], cells: Shared['cells'] = {};
  for (; i < L.length && L[i]; i++) { const [f, pl] = L[i].split('\t'); homes.push({ from: at(base, +f), place: pl || '' }); }
  for (i++; i < L.length && L[i]; i++) { const [f, to, pl] = L[i].split('\t'); stays.push({ from: at(base, +f), to: at(base, +to), place: pl || '' }); }
  for (let n = 0, j = i + 1; j < L.length; j++, n++) {
    const l = L[j];
    if (!l) continue;
    cells[at(base, n)] = l[0] === '?' ? { t: l.slice(1), p: true } : { t: l[0] === '\\' ? l.slice(1) : l };
  }
  return { name: L[1] || undefined, birth, homes, stays, cells, t: L[3] ? L[3].split(',').map(Number) : [] };
}

export async function encode(s: State): Promise<string> {
  const payload: Shared = { name: s.name, birth: s.birth, homes: s.homes, stays: s.stays, cells: s.cells, t: pending(s).map((n) => STAGES.indexOf(n)) };
  const z = await pipe(new TextEncoder().encode(pack(payload)), new CompressionStream('deflate-raw'));
  let bin = '';
  for (const b of z) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function decode(hash: string): Promise<Shared | null> {
  try {
    const bin = atob(hash.replace(/-/g, '+').replace(/_/g, '/'));
    const z = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const text = new TextDecoder().decode(await pipe(z, new DecompressionStream('deflate-raw')));
    if (text[0] !== '{') return unpack(text);
    const p = JSON.parse(text); // links made before format 2
    return p && p.cells && p.homes ? p : null;
  } catch { return null; }
}
