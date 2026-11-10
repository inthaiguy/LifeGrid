import { useEffect, useRef, useState } from 'react';
import { type State, type YM, MON, ym, yOf, nowYM, inLife, homeAt, colorOf, inkOn, ageColor, fmt, short } from './model';

export default function Grid({ s, read, full, onCell }: { s: State; read: boolean; full?: boolean; onCell?: (at: YM) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ at: YM; x: number; y: number } | null>(null);

  // Bring the newest change into view so each answer is seen landing.
  useEffect(() => {
    const at = s.changed[0];
    if (!at) return;
    ref.current?.querySelector(`[data-ym="${at}"]`)?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  }, [s.changed]);

  if (!s.birth) {
    return <div className="grid-empty"><p>Your life, one month per square.</p><p className="dim">Answer the first question and the grid appears here.</p></div>;
  }

  const years: number[] = [];
  for (let y = s.birth.y; y <= yOf(nowYM()); y++) years.push(y);

  const hover = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const at = (e.target as HTMLElement).closest<HTMLElement>('[data-ym]')?.dataset.ym;
    setTip(at ? { at, x: e.clientX, y: e.clientY } : null);
  };
  const tc = tip && s.cells[tip.at], th = tip && homeAt(s, tip.at);

  return (
    <div className={`grid ${read ? 'read' : 'map'}${full ? ' full' : ''}`} style={{ ['--n' as any]: years.length }} ref={ref} onPointerMove={hover} onPointerLeave={() => setTip(null)}>
      <div className="row head">
        <div className="yr">Year</div><div className="age">Age</div>
        {MON.map((m) => <div key={m} className="mh"><span className="m1">{m[0]}</span><span className="m3">{m}</span></div>)}
      </div>
      {years.map((y) => (
        <div className="row" key={y}>
          <div className="yr">{y}</div><div className="age" style={{ ['--a' as any]: ageColor(y - s.birth!.y) }}>{y - s.birth!.y}</div>
          {MON.map((_, i) => {
            const at = ym(y, i + 1);
            if (!inLife(s, at)) return <div key={at} className="cell off" />;
            const c = s.cells[at], col = colorOf(s, homeAt(s, at));
            const cls = `cell ${c ? (c.p ? 'ph' : 'on') : 'empty'}${s.changed.includes(at) ? ' flash' : ''}`;
            return (
              <button key={at} data-ym={at} className={cls} style={{ ['--c' as any]: col, ['--t' as any]: inkOn(col) }} onClick={onCell && (() => onCell(at))} aria-label={`${fmt(at)}${c ? `: ${c.t}` : ''}`}>
                {read && c ? <span>{c.t}</span> : null}
              </button>
            );
          })}
        </div>
      ))}
      {tip && (
        <div className="tip" style={{ left: Math.min(tip.x + 14, innerWidth - 232), top: tip.y > innerHeight - 90 ? tip.y - 70 : tip.y + 18 }}>
          <b className={tc ? '' : 'none'}>{tc ? tc.t : 'Nothing yet'}{tc?.p && <em> · to confirm</em>}</b>
          <span><i style={{ background: colorOf(s, th || undefined) }} />{fmt(tip.at)} · age {yOf(tip.at) - s.birth.y}{th ? ` · ${short(th)}` : ''}</span>
        </div>)}
    </div>
  );
}
