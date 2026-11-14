import { type State, type YM, ym, yOf, mOf, short, setCell } from './model';

/**
 * Edits to the places in a life: where they lived, and the temporary stays. Each move also wrote a
 * "Move to X" headline into its month, so those headlines are kept in step with the place and the date.
 */
const moveText = (place: string) => `Move to ${short(place)}`;
const isMove = (t: string | undefined, place: string) => t === moveText(place);
const dropMove = (s: State, at: YM, place: string) => { if (isMove(s.cells[at]?.t, place)) delete s.cells[at]; };
const putMove = (s: State, at: YM, place: string) => { if (!s.cells[at]) setCell(s, at, moveText(place)); };

/** Rename a place everywhere it appears: homes, stays, the birthplace and the cells and cues that name it. */
export function renamePlace(s: State, old: string, neu: string) {
  neu = neu.trim();
  if (!neu || neu === old) return;
  for (const h of s.homes) if (h.place === old) { h.place = neu; if (isMove(s.cells[h.from]?.t, old)) s.cells[h.from] = { t: moveText(neu) }; }
  for (const t of s.stays) if (t.place === old) { t.place = neu; if (isMove(s.cells[t.from]?.t, old)) s.cells[t.from] = { t: moveText(neu) }; }
  if (s.birth && s.birth.place === old) {
    s.birth.place = neu;
    const b = ym(s.birth.y, s.birth.m);
    if (s.cells[b]?.t === `Born ${short(old)}`) s.cells[b] = { t: `Born ${short(neu)}` };
  }
  for (const k of Object.keys(s.cues)) if (k.endsWith(`:${old}`)) { s.cues[k.slice(0, -old.length) + neu] = s.cues[k]; delete s.cues[k]; }
}

/** Change when a move happened (not the first home, which starts at birth). */
export function moveHome(s: State, i: number, to: YM) {
  const h = s.homes[i];
  if (!h || i === 0 || h.from === to) return;
  dropMove(s, h.from, h.place);
  h.from = to;
  s.homes.sort((a, b) => a.from.localeCompare(b.from));
  putMove(s, to, h.place);
}

/** Remove a move: the person stayed where they were. */
export function removeHome(s: State, i: number) {
  const h = s.homes[i];
  if (!h || i === 0) return;
  dropMove(s, h.from, h.place);
  s.homes.splice(i, 1);
}

export function editStay(s: State, i: number, from: YM, to: YM) {
  const t = s.stays[i];
  if (!t) return;
  [from, to] = from <= to ? [from, to] : [to, from];
  if (from !== t.from) { dropMove(s, t.from, t.place); putMove(s, from, t.place); }
  t.from = from; t.to = to;
}

export function removeStay(s: State, i: number) {
  const t = s.stays[i];
  if (!t) return;
  dropMove(s, t.from, t.place);
  s.stays.splice(i, 1);
}

export const monthOf = (at: YM) => ({ y: yOf(at), m: mOf(at) });
