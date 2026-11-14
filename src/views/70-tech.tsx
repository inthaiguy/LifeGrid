import { useEffect, useMemo, useRef } from 'react';
import type { ViewDef, ViewProps } from '../views';
import { TECH } from '../tech';
import { pickEvents, birthMonth, lastMonth, ageAt, ageColor, inkOn, fmt, yOf, mOf, thisMonth } from '../lifegrid';

export const view: ViewDef = {
  id: 'tech',
  name: 'Tech timeline',
  at: 20,
  icon: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  legend: false,
};

const PPY = 38, H = 20, GAP = 3; // pixels per year; a label's height and the space between labels
const frac = (m: string) => (m.length === 4 ? +m + 0.5 : yOf(m) + (mOf(m) - 1) / 12);

/** Lay labels out top to bottom, never closer than a label's height, each as near its own date as it can be. */
function stack<T extends { y: number }>(items: T[]): (T & { ly: number })[] {
  let next = -Infinity;
  return [...items].sort((a, b) => a.y - b.y).map((it) => { const ly = Math.max(it.y - H / 2, next); next = ly + H + GAP; return { ...it, ly }; });
}

export default function TechTimeline({ life, onCell }: ViewProps) {
  const box = useRef<HTMLDivElement>(null);
  const d = useMemo(() => {
    const b = birthMonth(life), last = lastMonth(life), start = Math.min(1900, yOf(b)), end = yOf(thisMonth()) + 1;
    const y = (m: string) => (frac(m) - start) * PPY;
    const from = y(b), to = y(last) + PPY / 12; // the life, to the end of its last month
    const t = stack(TECH.map((x) => ({ ...x, y: y(x.m), at: frac(x.m), age: ageAt(life, x.m.length === 4 ? `${x.m}-07` : x.m) })));
    const n = Math.max(3, Math.floor((to - from) / PPY));
    const ev = stack(pickEvents(life, n).map((e) => ({ ...e, y: y(e.month) })));
    const height = Math.max((end - start) * PPY, ...t.map((i) => i.ly + H), ...ev.map((i) => i.ly + H)) + 20;
    const years: number[] = []; for (let k = Math.ceil(start / 10) * 10; k < end; k += 10) years.push(k);
    const lo = frac(b), hi = frac(last) + 1 / 12;
    const during = t.filter((i) => i.at >= lo && i.at < hi).length, before = t.filter((i) => i.at < lo).length;
    return { start, from, to, t, ev, height, years, during, before, last, b, y };
  }, [life]);

  useEffect(() => { box.current?.scrollTo({ top: Math.max(0, d.from - 90) }); }, [d.from]);

  const ended = !!life.death, name = life.name || 'this person';
  const segs: { k: number; top: number; h: number }[] = [];
  for (let a = Math.floor(frac(d.b)); a <= frac(d.last); a++) {
    const top = Math.max(d.from, (a - d.start) * PPY), bot = Math.min(d.to, (a + 1 - d.start) * PPY);
    if (bot > top) segs.push({ k: a - yOf(d.b), top, h: bot - top });
  }

  return (
    <div className="techv" ref={box}>
      <style>{`
        .techv { height: calc(100dvh - 58px); overflow: auto; padding: 0 12px; box-sizing: border-box; }
        .techv .cap { position: sticky; top: 0; z-index: 3; background: var(--bg); margin: 0; padding: 10px 4px 8px; font-size: 13px; line-height: 1.35; color: var(--dim); border-bottom: 1px solid var(--line); }
        .techv .cap b { color: var(--ink); font-weight: 600; }
        .techv .wrap { max-width: 760px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr) 14px 28px 40px 14px minmax(0, 1fr); position: relative; }
        .techv .col { position: relative; }
        .techv .lab { position: absolute; left: 0; right: 0; height: ${H}px; line-height: ${H}px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .techv .life .lab { text-align: right; }
        .techv .life button { all: unset; cursor: pointer; display: block; width: 100%; box-sizing: border-box; text-align: right; overflow: hidden; text-overflow: ellipsis; }
        .techv .life button:hover { text-decoration: underline; }
        .techv .life .q { color: var(--dim); font-style: italic; }
        .techv .tech .lab { color: var(--ink); }
        .techv .tech .lab.out { color: var(--dim); }
        .techv .tech .lab b { display: inline-block; min-width: 22px; margin-right: 5px; text-align: center; border-radius: 9px; font-size: 11px; line-height: 16px; padding: 0 4px; font-weight: 600; }
        .techv .seg { position: absolute; left: 4px; right: 4px; display: grid; place-items: center; font-size: 10px; font-weight: 600; overflow: hidden; }
        .techv .axis { position: relative; border-left: 1px solid var(--line); }
        .techv .yr { position: absolute; left: 5px; font-size: 11px; color: var(--dim); transform: translateY(-50%); background: var(--bg); padding: 0 2px; }
        .techv .dot { position: absolute; left: -3px; width: 5px; height: 5px; border-radius: 50%; background: var(--dim); transform: translateY(-50%); }
        .techv .dot.in { background: var(--ink); }
        .techv svg.link { position: absolute; top: 0; width: 100%; pointer-events: none; }
        .techv .small { font-size: 11px; color: var(--dim); margin: 10px 0 0; text-align: center; }
      `}</style>
      <p className="cap">
        <b>{d.during}</b> of {d.t.length} landmark inventions arrived while {name} {ended ? 'was alive' : 'has been alive'}; {d.before} were already here at birth.
        Left: {name}’s life, colored by age. Right: the world’s tech, with {name}’s age when it appeared.
      </p>
      <div className="wrap" style={{ height: d.height }} role="img" aria-label={`${name}'s life beside a timeline of ${d.t.length} landmark inventions since 1900`}>
        <div className="col life">
          {d.ev.map((e) => (
            <div key={e.month} className="lab" style={{ top: e.ly }} title={`${fmt(e.month)} · ${e.text}`}>
              {onCell ? <button className={e.confirmed ? '' : 'q'} onClick={() => onCell(e.month)}>{e.text}</button> : <span className={e.confirmed ? '' : 'q'}>{e.text}</span>}
            </div>))}
        </div>
        <svg className="link" style={{ gridColumn: 2, gridRow: 1, height: d.height, position: 'relative' }} aria-hidden="true">
          {d.ev.map((e) => <line key={e.month} x1="0" y1={e.ly + H / 2} x2="14" y2={e.y} stroke="var(--line)" strokeWidth="1" />)}
        </svg>
        <div className="col" style={{ position: 'relative' }}>
          {segs.map((s) => { const c = ageColor(s.k + 0.5); return <div key={s.k} className="seg" style={{ top: s.top, height: s.h, background: c, color: inkOn(c) }}>{s.k % 5 === 0 && s.h > 14 ? s.k : ''}</div>; })}
        </div>
        <div className="axis">
          {d.years.map((k) => <span key={k} className="yr" style={{ top: (k - d.start) * PPY }}>{k}</span>)}
          {d.t.map((i) => <span key={i.m + i.t} className={`dot${i.at >= frac(d.b) && i.at < frac(d.last) + 1 / 12 ? ' in' : ''}`} style={{ top: i.y }} />)}
        </div>
        <svg className="link" style={{ gridColumn: 5, gridRow: 1, height: d.height, position: 'relative' }} aria-hidden="true">
          {d.t.map((i) => <line key={i.m + i.t} x1="0" y1={i.y} x2="14" y2={i.ly + H / 2} stroke="var(--line)" strokeWidth="1" />)}
        </svg>
        <div className="col tech">
          {d.t.map((i) => {
            const inside = i.at >= frac(d.b) && i.at < frac(d.last) + 1 / 12, c = ageColor(Math.max(0, i.age));
            const when = i.m.length === 4 ? i.m : fmt(i.m);
            const why = inside ? `${when} · ${name} was ${i.age}` : i.at < frac(d.b) ? `${when} · before ${name} was born` : `${when} · after ${name}’s life`;
            return <div key={i.m + i.t} className={`lab${inside ? '' : ' out'}`} style={{ top: i.ly }} title={`${i.t} · ${why}`}>{inside && <b style={{ background: c, color: inkOn(c) }}>{i.age}</b>}{i.t}</div>;
          })}
        </div>
      </div>
      <p className="small">Dates are from general knowledge; some months are approximate.</p>
    </div>
  );
}
