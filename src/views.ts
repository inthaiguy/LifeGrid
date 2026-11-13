// Views unlock as the grid fills in. Edit this list to change the names, order or thresholds.
// `at` is the percentage of months filled in (confirmed entries only, as shown in the menu).

export type ViewId = 'grid' | 'h' | 'hw' | 'v' | 'tree' | 'voyager';
export interface ViewDef { id: ViewId; name: string; at: number }

export const VIEWS: ViewDef[] = [
  { id: 'grid', name: 'Grid', at: 0 },
  { id: 'h', name: 'Horizontal timeline', at: 5 },
  { id: 'hw', name: 'Timeline with significant events', at: 10 },
  { id: 'v', name: 'Vertical timeline', at: 20 },
  { id: 'tree', name: 'Tree view', at: 35 },
  { id: 'voyager', name: 'Voyager view', at: 50 },
];

export const unlockedViews = (pct: number) => VIEWS.filter((v) => pct >= v.at);
export const nextView = (pct: number) => VIEWS.find((v) => pct < v.at);
export const FIRST_UNLOCK = VIEWS.find((v) => v.at > 0)!.at;
