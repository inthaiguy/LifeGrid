import type { ComponentType } from 'react';
import type { State, YM } from './model';
import type { Life } from './lifegrid';

// Views are drop-in: every .tsx file in src/views/ that exports a `view` description and a default
// component appears in the app. Nothing else needs editing. See docs/making-a-view.md.

/** What every view is given. */
export interface ViewProps {
  /** The life, as plain data. Read-only: a view never changes it. Use the helpers in src/lifegrid.ts with it. */
  life: Life;
  /** The app's own record of the same life, for the built-in views. New views should use `life`. */
  s: State;
  /** Call with a month ("YYYY-MM") when the person picks an event, to open that month's editor. Absent on a shared, read-only link. */
  onCell?: (at: YM) => void;
  /** Only meaningful for views that set `readable`: the header's Read / Overview toggle. */
  read?: boolean;
}

/** A view's description, exported as `view` from its file. */
export interface ViewDef {
  /** Short unique id, lower case. */
  id: string;
  /** Name shown in the menu and in tooltips. */
  name: string;
  /** Percentage of months filled in at which the view unlocks for its owner (0 = always). Shared links show every view. */
  at: number;
  /** The `d` of an SVG path drawn in a 24×24 box with a 1.8 stroke and no fill: the header button's icon. */
  icon: string;
  /** Set false to hide the colour key of places beside the view. */
  legend?: boolean;
  /** Set true if the view has a words / overview distinction and wants the header's Read toggle. */
  readable?: boolean;
}
export interface View extends ViewDef { Component: ComponentType<ViewProps> }
export type ViewId = string;

const files = import.meta.glob<{ view?: ViewDef; default?: ComponentType<ViewProps> }>('./views/*.tsx', { eager: true });

/** Every view found, in unlock order (ties by file name, so a numeric prefix sets the order). */
export const VIEWS: View[] = Object.keys(files).sort()
  .map((f) => ({ file: f, mod: files[f] }))
  .filter(({ file, mod }) => { const ok = !!mod.view?.id && !!mod.default; if (!ok) console.warn(`${file}: needs "export const view" and a default component; skipped.`); return ok; })
  .map(({ mod }) => ({ ...mod.view!, Component: mod.default! }))
  .sort((a, b) => a.at - b.at);

/** Testing switch: true opens every view regardless of how full the grid is. Set to false to bring the unlock thresholds back. */
export const UNLOCK_ALL = true;
export const unlockedViews = (pct: number) => VIEWS.filter((v) => UNLOCK_ALL || pct >= v.at);
export const nextView = (pct: number) => (UNLOCK_ALL ? undefined : VIEWS.find((v) => pct < v.at));
export const FIRST_UNLOCK = VIEWS.find((v) => v.at > 0)?.at ?? 0;
