import type { Car, CarPatch } from './types';
import { CARS_A } from './a';
import { CARS_B } from './b';
import { CARS_C } from './c';

export type { Car, CarFact, CarPatch, Kind } from './types';

// Checked figures and extra milestones, one JSON file per research batch. They override the starting data.
const patchFiles = import.meta.glob<CarPatch[]>('./facts/*.json', { eager: true, import: 'default' });
const patches = new Map<number, CarPatch>(Object.values(patchFiles).flat().map((p) => [p.year, p]));
const apply = (c: Car): Car => { const p = patches.get(c.year); return p ? { ...c, ...p, facts: [...(p.facts ?? c.facts)].sort((a, b) => a.y - b.y) } : c; };

/** One notable car per birth year, oldest first. */
export const CARS: Car[] = [...CARS_A, ...CARS_B, ...CARS_C].map(apply).sort((a, b) => a.year - b.year);

/** The car for a birth year; outside the years covered, the nearest one, with `exact` false. */
export function carFor(year: number): { car: Car; exact: boolean } {
  const hit = CARS.find((c) => c.year === year);
  if (hit) return { car: hit, exact: true };
  const near = [...CARS].sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year))[0];
  return { car: near, exact: false };
}
