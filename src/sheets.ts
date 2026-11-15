// Several grids on one device. Each grid ("sheet") is stored under its own key, so opening or editing
// one can never overwrite another. A tab remembers which sheet it has open in sessionStorage; new
// tabs open the most recently used one. Nothing here leaves the browser.
import type { State } from './model';

const INDEX = 'life-grid-sheets';     // JSON: { id, at }[]  (at = last saved, ms)
const LAST = 'life-grid-last';        // id of the sheet most recently opened on this device
const OPEN = 'life-grid-open';        // sessionStorage: the sheet this tab has open
const LEGACY = 'life-grid';           // the single-grid key used before sheets existed
const LEGACY_HIST = 'life-grid-hist';

const sheetKey = (id: string) => `life-grid:s:${id}`;
const histKey = (id: string) => `life-grid:h:${id}`;

const read = (store: Storage, k: string): string | null => { try { return store.getItem(k); } catch { return null; } };
const write = (store: Storage, k: string, v: string) => { try { store.setItem(k, v); } catch { /* full, or private mode */ } };
const parse = <T,>(raw: string | null, fallback: T): T => { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };

export interface SheetRef { id: string; at: number }
export interface SheetInfo { id: string; name?: string; born?: number; cells: number; at: number }

const index = (): SheetRef[] => parse<SheetRef[]>(read(localStorage, INDEX), []).filter((r) => r && typeof r.id === 'string');
const setIndex = (list: SheetRef[]) => write(localStorage, INDEX, JSON.stringify(list));

/** Move a grid saved by an older version into the sheet store, once. */
export function migrate() {
  const raw = read(localStorage, LEGACY);
  if (!raw) return;
  const s = parse<State | null>(raw, null);
  if (s && s.v === 1 && s.id && s.birth && !index().some((r) => r.id === s.id)) {
    write(localStorage, sheetKey(s.id), JSON.stringify(s));
    const h = read(localStorage, LEGACY_HIST);
    if (h) write(localStorage, histKey(s.id), h);
    setIndex([...index(), { id: s.id, at: Date.now() }]);
    write(localStorage, LAST, s.id);
  }
  try { localStorage.removeItem(LEGACY); localStorage.removeItem(LEGACY_HIST); } catch { /* ignore */ }
}

export function loadSheet(id: string): State | null {
  const s = parse<State | null>(read(localStorage, sheetKey(id)), null);
  return s && s.v === 1 ? { ...s, changed: [] } : null;
}

/** Save a sheet. Returns true when it is new to this device. Grids with no birth date yet are not kept. */
export function saveSheet(s: State): boolean {
  if (!s.birth) return false;
  write(localStorage, sheetKey(s.id), JSON.stringify(s));
  const list = index(), found = list.find((r) => r.id === s.id);
  if (found) found.at = Date.now(); else list.push({ id: s.id, at: Date.now() });
  setIndex(list);
  markOpen(s.id);
  return !found;
}

export function deleteSheet(id: string) {
  setIndex(index().filter((r) => r.id !== id));
  try { localStorage.removeItem(sheetKey(id)); localStorage.removeItem(histKey(id)); } catch { /* ignore */ }
  if (read(localStorage, LAST) === id) { try { localStorage.removeItem(LAST); } catch { /* ignore */ } }
  if (read(sessionStorage, OPEN) === id) { try { sessionStorage.removeItem(OPEN); } catch { /* ignore */ } }
}

/** The sheet this tab should open: its own, else the one used last, else none. */
export function openId(): string | null {
  const ids = new Set(index().map((r) => r.id));
  for (const id of [read(sessionStorage, OPEN), read(localStorage, LAST)]) if (id && ids.has(id)) return id;
  return null;
}

export function markOpen(id: string) { write(sessionStorage, OPEN, id); write(localStorage, LAST, id); }

export const loadHist = (id: string): string[] => parse<string[]>(read(localStorage, histKey(id)), []);
export const saveHist = (id: string, h: string[]) => write(localStorage, histKey(id), JSON.stringify(h.slice(-80)));

/** Every sheet on this device, newest first, described for a list. `current` stands in for its stored copy. */
export function listSheets(current?: State): SheetInfo[] {
  const out: SheetInfo[] = [];
  for (const r of index()) {
    const s = current && current.id === r.id ? current : loadSheet(r.id);
    if (s?.birth) out.push({ id: r.id, name: s.name, born: s.birth.y, cells: Object.values(s.cells).filter((c) => !c.p).length, at: r.at });
  }
  return out.sort((a, b) => b.at - a.at);
}

export const storageKey = sheetKey;
export const INDEX_KEY = INDEX;
