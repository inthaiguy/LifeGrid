// The Birth car view's data. One notable car per birth year, with a few numbers and a short timeline.
// Figures come from general knowledge and are approximate; anything not firmly known is listed in
// `confirm` and shown as "to confirm" until someone checks it against a source.

/** Which hand-drawn body the sketch uses (see src/Car.tsx). */
export type Kind =
  | 'tourer'    // 1920s open car with running boards and big separate fenders
  | 'sedan'     // three-box saloon / sedan
  | 'coupe'     // two-door, notchback or hardtop
  | 'fastback'  // sloping roof to the tail (Beetle-like and sporty fastbacks)
  | 'roadster'  // open two-seater, low windscreen
  | 'wedge'     // low mid-engine supercar
  | 'hatch'     // small hatchback / city car
  | 'wagon'     // estate / station wagon / crossover
  | 'suv'       // tall boxy SUV or Jeep
  | 'pickup'    // pickup truck
  | 'van'       // van / people mover / cab-over bus
  | 'tank';     // armoured/military oddity, rarely used

export interface CarFact { y: number; t: string }

/** A fact-checking result for one car (src/cars/facts/*.json). Fields given here replace the same fields on the car. */
export type CarPatch = Partial<Omit<Car, 'year' | 'kind' | 'fins' | 'open'>> & { year: number };

export interface Car {
  /** The birth year this car stands for. */
  year: number;
  /** "Ford Model T" */
  name: string;
  maker: string;
  kind: Kind;
  /** Optional drawing hints. */
  fins?: boolean;        // tail fins (1950s–60s)
  open?: boolean;        // top down / convertible
  /** When it was on sale, "1908–1927". */
  run: string;
  /** Units built, in words: "about 15 million (1908–1927)". */
  built: string;
  /** Price when introduced, with the year: "$850 (1908); $260 by 1925". */
  price: string;
  /** What one sells for now, with the basis: "$15,000–$30,000 for a good driver (2020s, US)". */
  value: string;
  /** 3–10 dated things that happened to this car or model, oldest first, from launch up to now. */
  facts: CarFact[];
  /** Names of fields above not firmly known, e.g. ["built", "value"]. Shown as "to confirm". */
  confirm?: string[];
  /** Where the checked figures and milestones came from (web addresses). Set by the fact-checking pass. */
  sources?: string[];
}
