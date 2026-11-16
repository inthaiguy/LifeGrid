import { useMemo } from 'react';
import type { ViewDef, ViewProps } from '../views';
import { carFor } from '../cars';
import { ageColor, inkOn, thisMonth, yOf, events, weigh } from '../lifegrid';

export const view: ViewDef = {
  id: 'car',
  name: 'Birth car',
  at: 30,
  icon: 'M5 17H3v-5l2-5h14l2 5v5h-2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M9 17h6M3 12h18',
  legend: false,
};

/**
 * Birth car: the notable car of the birth year, drawn as line art, and one timeline with two sides.
 * The left is the person's life (their age and a notable event in each year the car had a milestone);
 * the right is the car (what happened to it, what it cost, how many were built, what it is worth).
 */
export default function BirthCar({ life }: ViewProps) {
  const name = life.name || 'this person', born = life.birth.y, now = yOf(thisMonth());
  const { car, exact } = useMemo(() => carFor(born), [born]);
  const died = life.death ? life.death.y : null;
  const launch = parseInt(car.run, 10) || car.year;
  const stop = car.run.match(/[–-]\s*(\d{4})/)?.[1];  // absent while it is still made
  const endYear = stop ? +stop : now;

  type Item = { t: string; label?: string; ask?: boolean };
  const side = useMemo(() => {
    const m = new Map<number, Item[]>();
    const add = (y: number, it: Item) => m.set(y, [...(m.get(y) || []), it]);
    for (const f of car.facts) add(f.y, { t: f.t });
    add(launch, { label: 'Price when new', t: car.price, ask: car.confirm?.includes('price') });
    // The count built goes where production ends, unless a milestone there already says so.
    if (!car.facts.some((f) => f.y === endYear && /production|built|ends?\b|ended|last /i.test(f.t) && /\d/.test(f.t))) add(endYear, { label: 'Built', t: car.built, ask: car.confirm?.includes('built') });
    add(now, { label: 'Worth today', t: car.value, ask: car.confirm?.includes('value') });
    return m;
  }, [car, launch, endYear, now]);

  // The most telling thing in the person's own grid for each year, to sit beside the car's milestone.
  const own = useMemo(() => {
    const w = weigh(life), best = new Map<number, { text: string; confirmed: boolean }>();
    const cur = new Map<number, number>();
    for (const e of events(life)) {
      const y = yOf(e.month), sc = w(e);
      if (!cur.has(y) || sc > cur.get(y)!) { cur.set(y, sc); best.set(y, { text: e.text, confirmed: e.confirmed }); }
    }
    return best;
  }, [life]);

  const years = [...new Set([...side.keys(), born, died ?? now])].sort((a, b) => a - b);
  return (
    <div className="carv">
      <style>{`
        .carv { height: calc(100dvh - 58px); overflow: auto; padding: 0 14px 40px; box-sizing: border-box; }
        .carv .in { max-width: 860px; margin: 0 auto; }
        .carv .hero { text-align: center; padding: 0 0 6px; }
        .carv .hero img { width: min(100%, 560px); height: auto; aspect-ratio: 3 / 2; mix-blend-mode: multiply; }
        @media (prefers-color-scheme: dark) { .carv .hero img { filter: invert(1); mix-blend-mode: screen; } }
        .carv h2 { margin: 4px 0 0; font-size: 24px; }
        .carv .sub { color: var(--dim); font-size: 13px; margin: 4px 0 0; }
        .carv .note { color: var(--dim); font-size: 12px; font-style: italic; margin: 6px 0 0; }
        .carv .tl { position: relative; margin: 22px 0 0; }
        .carv .tl::before { content: ''; position: absolute; top: 28px; bottom: 6px; left: 50%; border-left: 2px solid var(--line); }
        .carv .r { display: grid; grid-template-columns: 1fr 72px 1fr; align-items: start; position: relative; font-size: 14px; line-height: 1.4; }
        .carv .r > div { padding: 0 0 16px; }
        .carv .r.h { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--dim); padding-bottom: 8px; }
        .carv .r.h > div { padding-bottom: 0; }
        .carv .l { text-align: right; padding-right: 14px; }
        .carv .c { padding-left: 14px; }
        .carv .y { text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; position: relative; background: var(--bg); padding: 0; z-index: 1; }
        .carv .l .age { display: inline-block; border-radius: 9px; font-size: 11px; line-height: 16px; padding: 0 6px; font-weight: 600; margin-left: 6px; vertical-align: 1px; }
        .carv .l.you b { color: var(--ink); }
        .carv .c .lab { display: block; color: var(--dim); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
        .carv .c .ask, .carv .l .ask { color: var(--dim); font-style: italic; font-size: 12px; }
        .carv .c .it + .it { margin-top: 6px; }
        .carv .dim { color: var(--dim); }
        .carv .foot { color: var(--dim); font-size: 11px; text-align: center; margin-top: 14px; }
        @media (max-width: 599px) {
          .carv .tl::before { left: 28px; }
          .carv .r { grid-template-columns: 56px 1fr; grid-template-areas: "y l" "y c"; }
          .carv .r.h { display: none; }
          .carv .y { grid-area: y; text-align: left; background: none; }
          .carv .l { grid-area: l; text-align: left; padding: 0 0 4px 14px; }
          .carv .c { grid-area: c; }
          .carv .l:empty { display: none; }
        }
      `}</style>
      <div className="in">
        <div className="hero">
          <img src={`${import.meta.env.BASE_URL}cars/${car.year}.webp`} alt={`Line drawing of a ${car.year} ${car.name}`} width={1000} height={667} />
          <h2>{car.year} {car.name}</h2>
          {!exact && <p className="note">No car is picked for {born} yet; this is the nearest year.</p>}
        </div>
        <div className="tl" role="list" aria-label={`${name}’s life beside the ${car.name}`}>
          <div className="r h"><div className="l">{name}</div><div /><div className="c">{car.name}</div></div>
          {years.map((y) => {
            const items = side.get(y) || [], inLife = y >= born && y <= (died ?? now), age = y - born, col = ageColor(Math.max(0, age));
            const e = own.get(y);
            let left: React.ReactNode = null;
            if (y === born) left = <b>{name} is born</b>;
            else if (died !== null && y === died) left = <><b>{name}’s life ends</b></>;
            else if (inLife) left = <>{e ? <span className={e.confirmed ? '' : 'ask'}>{e.text}</span> : y === now ? <b>Today</b> : null}<span className="age" style={{ background: col, color: inkOn(col) }}>age {age}</span></>;
            return (
              <div className="r" role="listitem" key={y}>
                <div className={`l${y === born ? ' you' : ''}`}>{left}</div>
                <div className="y">{y}</div>
                <div className="c">
                  {items.map((it, i) => (
                    <div className="it" key={i}>
                      {it.label && <span className="lab">{it.label}</span>}
                      {it.t}{it.ask && <> <span className="ask">(to confirm)</span></>}
                    </div>))}
                </div>
              </div>);
          })}
        </div>
        <p className="foot">Figures are from general knowledge and approximate.</p>
      </div>
    </div>
  );
}
