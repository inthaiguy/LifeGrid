import type { State } from './model';
import { STAGES, pending } from './script';

// The shareable part of a grid: enough to redraw it, nothing about the interview.
export type Shared = Pick<State, 'name' | 'birth' | 'homes' | 'stays' | 'cells'> & { t?: number[] }; // t = topics with questions still waiting

const pipe = async (bytes: Uint8Array, stream: TransformStream) =>
  new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer());

export async function encode(s: State): Promise<string> {
  const payload: Shared = { name: s.name, birth: s.birth, homes: s.homes, stays: s.stays, cells: s.cells, t: pending(s).map((n) => STAGES.indexOf(n)) };
  const z = await pipe(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream('deflate-raw'));
  let bin = '';
  for (const b of z) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function decode(hash: string): Promise<Shared | null> {
  try {
    const bin = atob(hash.replace(/-/g, '+').replace(/_/g, '/'));
    const z = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const out = await pipe(z, new DecompressionStream('deflate-raw'));
    const p = JSON.parse(new TextDecoder().decode(out));
    return p && p.cells && p.homes ? p : null;
  } catch { return null; }
}
