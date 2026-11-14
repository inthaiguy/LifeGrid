import { type State, type YM, ym, yOf, mOf } from './model';
import { STAGES, pending } from './script';
import { readLink } from './lifegrid';

// The shareable part of a grid: enough to redraw it, nothing about the interview.
export type Shared = Pick<State, 'name' | 'birth' | 'death' | 'homes' | 'stays' | 'cells'> & { t?: number[] }; // t = topics with questions still waiting

const pipe = async (bytes: Uint8Array, stream: TransformStream) =>
  new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());

// Link format 2: plain lines, no dates. Every month is its offset from the birth month, and the
// cells are one line per month in order (blank = empty, leading "?" = placeholder). Runs of blank
// lines deflate to almost nothing, which makes this about a third shorter than the JSON it replaced.
const clean = (x: string) => x.replace(/[\t\n\r]+/g, ' ');
const off = (base: number, at: YM) => yOf(at) * 12 + mOf(at) - 1 - base;

function pack(p: Shared): string {
  const b = p.birth!, base = b.y * 12 + b.m - 1;
  const lines: string[] = [];
  for (const [k, c] of Object.entries(p.cells)) {
    const n = off(base, k);
    if (n >= 0) lines[n] = c.p ? '?' + clean(c.t) : clean(c.t).replace(/^[?\\]/, '\\$&');
  }
  return [
    '2', clean(p.name || ''), [b.y, b.m, clean(b.place), b.d || '', p.death ? off(base, ym(p.death.y, p.death.m)) : '', p.death?.d || ''].join('\t'), (p.t || []).join(','),
    ...p.homes.map((h) => off(base, h.from) + '\t' + clean(h.place)), '',
    ...p.stays.map((s) => [off(base, s.from), off(base, s.to), clean(s.place)].join('\t')), '',
    ...Array.from(lines, (l) => l || ''),
  ].join('\n');
}

export async function encode(s: State): Promise<string> {
  const payload: Shared = { name: s.name, birth: s.birth, death: s.death, homes: s.homes, stays: s.stays, cells: s.cells, t: pending(s).map((n) => STAGES.indexOf(n)) };
  const z = await pipe(new TextEncoder().encode(pack(payload)), new CompressionStream('deflate-raw'));
  let bin = '';
  for (const b of z) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Reading is the standalone reader's job (src/lifegrid.ts), so the app and outside views decode a link the same way. */
export const decode = (hash: string): Promise<Shared | null> => readLink(hash);
