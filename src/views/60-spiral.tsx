// src/views/60-spiral.tsx
// A life as a spiral: birth at the centre, one full turn per year, one dot per month.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ViewDef, ViewProps } from '../views';
import {
  events, pickEvents, weigh, birthMonth, lastMonth, homeAt, colorOf,
  yOf, mOf, addM, fmt,
} from '../lifegrid';

export const view: ViewDef = {
  id: 'spiral',
  name: 'Spiral',
  at: 20,
  icon: 'M12 12a1 1 0 0 1 0-2a2 2 0 0 1 0 4a3 3 0 0 1 0-6a4 4 0 0 1 0 8a5 5 0 0 1 0-10a6 6 0 0 1 0 12',
};

type Ev = ReturnType<typeof events>[number];
interface Dot { i: number; month: string; ev?: Ev; color?: string; place?: string }
interface Label { ev: Ev; x: number; y: number; r: number; n: number; side: 'l' | 'r'; ly: number }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LH = 34;        // height of one side label (headline + date)
const WIDE = 640;     // below this width, labels become numbers with a list underneath

export default function Spiral({ life, onCell }: ViewProps) {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight);
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Everything that depends only on the life: done once.
  const data = useMemo(() => {
    const first = birthMonth(life), last = lastMonth(life);
    const count = Math.max(1, (yOf(last) - yOf(first)) * 12 + (mOf(last) - mOf(first)) + 1);
    const all = events(life);
    const byMonth = new Map<string, Ev>(all.map((e) => [e.month, e]));
    const dots: Dot[] = [];
    for (let i = 0; i < count; i++) {
      const month = addM(first, i);
      const place = homeAt(life, month);
      dots.push({ i, month, ev: byMonth.get(month), color: place ? colorOf(life, place) : undefined, place: place || undefined });
    }
    return { first, last, count, dots, filled: all.length, start: mOf(first) - 1, score: weigh(life) };
  }, [life]);

  const wide = !size || size.w >= WIDE;
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null); // the dot under the pointer

  // Everything that depends on the room available.
  const plan = useMemo(() => {
    if (!size || size.w < 40 || size.h < 40) return null;
    const { w, h } = size;
    const D = wide ? Math.max(120, Math.min(h, w - 2 * 150)) : Math.min(w, h);
    const cx = w / 2, cy = h / 2, R = D / 2 - 28; // room outside the last turn for the month names
    const r0 = Math.min(R, Math.max(10, R * 0.06));
    const turns = (data.count - 1) / 12;
    const pitch = (R - r0) / Math.max(1, turns);
    const at = (i: number) => {
      const a = 2 * Math.PI * ((data.start + i) / 12) - Math.PI / 2, r = r0 + (pitch * i) / 12;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), r, a };
    };
    const big = Math.min(7, Math.max(0.9, pitch * 0.42)), small = Math.min(2.2, Math.max(0.45, pitch * 0.2));
    const pts = data.dots.map((d) => {
      const p = at(d.i), cap = 0.22 * p.r + 0.5;
      return { ...d, x: p.x, y: p.y, a: p.a, rad: Math.min(d.ev ? big : small, d.ev ? cap : cap * 0.5) };
    });
    const track = pts.length > 1 ? 'M' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L') : '';

    const index = (month: string) => (yOf(month) - yOf(data.first)) * 12 + (mOf(month) - mOf(data.first));
    const labels: Label[] = [];
    if (wide) {
      const n = Math.max(3, Math.min(30, Math.floor(h / LH)));
      for (const ev of pickEvents(life, n)) {
        const p = pts[index(ev.month)];
        if (p) labels.push({ ev, x: p.x, y: p.y, r: p.rad, n: 0, side: p.x >= cx ? 'r' : 'l', ly: p.y });
      }
      for (const side of ['l', 'r'] as const) {
        const col = labels.filter((l) => l.side === side).sort((a, b) => a.y - b.y);
        const lo = LH / 2, hi = h - LH / 2;
        col.forEach((l, k) => { l.ly = Math.max(l.y, k ? col[k - 1].ly + LH : lo); });
        for (let k = col.length - 1; k >= 0; k--) {
          col[k].ly = Math.min(col[k].ly, k === col.length - 1 ? hi : col[k + 1].ly - LH);
        }
      }
    } else {
      // Numbers beside dots; an event is skipped if its number would sit on another one.
      const n = Math.max(4, Math.min(12, Math.floor(w / 45)));
      const ranked = [...pickEvents(life, n)].sort((a, b) => data.score(b) - data.score(a));
      for (const ev of ranked) {
        const p = pts[index(ev.month)];
        if (!p) continue;
        const off = p.rad + 8, x = p.x + off * Math.cos(p.a), y = p.y + off * Math.sin(p.a);
        if (labels.every((l) => Math.hypot(l.x - x, l.y - y) >= 16)) labels.push({ ev, x, y, r: p.rad, n: 0, side: 'r', ly: y });
      }
      labels.sort((a, b) => (a.ev.month < b.ev.month ? -1 : 1));
      labels.forEach((l, k) => { l.n = k + 1; });
    }
    const colW = Math.max(0, Math.min(260, (w - D) / 2 - 16));
    // One spoke per calendar month: every January sits on the same line, every February on the next, and so on.
    const spokes = MONTHS.map((name, m) => {
      const a = 2 * Math.PI * (m / 12) - Math.PI / 2, c = Math.cos(a), sn = Math.sin(a);
      return { name, x1: cx + r0 * 0.5 * c, y1: cy + r0 * 0.5 * sn, x2: cx + (R + 6) * c, y2: cy + (R + 6) * sn, tx: cx + (R + 17) * c, ty: cy + (R + 17) * sn };
    });
    return { w, h, D, cx, pts, track, labels, colW, index, spokes };
  }, [data, size, wide, life]);

  // The dots are small, so the pointer picks the nearest one within reach instead of needing to land on it.
  const nearest = (e: { clientX: number; clientY: number }) => {
    const el = stage.current;
    if (!el || !plan) return null;
    const b = el.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    let best = -1, d = 14 * 14;
    for (const p of plan.pts) { const q = (p.x - x) ** 2 + (p.y - y) ** 2; if (q < d) { d = q; best = p.i; } }
    return best < 0 ? null : { i: best, x: e.clientX, y: e.clientY };
  };
  const hot = tip && plan ? plan.pts[tip.i] : null;

  const who = life.name ? `${life.name}’s life` : 'A life';
  const alt = `${who} drawn as a spiral of ${data.count} ${data.count === 1 ? 'month' : 'months'}, `
    + `${fmt(data.first)} to ${fmt(data.last)}; ${data.filled} ${data.filled === 1 ? 'has' : 'have'} an entry.`;
  const line = (ev: Ev) => `${fmt(ev.month)} · age ${ev.age}`;

  return (
    <div className="spiral">
      <style>{`
        .spiral { max-width: 1500px; margin: 0 auto; padding: 8px 16px 32px; box-sizing: border-box; }
        .spiral .cap { margin: 0 auto 8px; max-width: 720px; font-size: 13px; line-height: 1.4; color: var(--dim); text-align: center; }
        .spiral .stage { position: relative; width: 100%; overflow: hidden; }
        .spiral .stage.wide { height: calc(100dvh - 58px - 110px); min-height: 360px; }
        .spiral .stage.narrow { aspect-ratio: 1; max-height: 560px; }
        .spiral svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        .spiral .track { fill: none; stroke: var(--line); stroke-width: 1; }
        .spiral .none { fill: var(--dim); }
        .spiral .spoke { stroke: var(--line); stroke-width: 1; stroke-dasharray: 2 4; }
        .spiral .mon { fill: var(--dim); font-size: 10.5px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; text-anchor: middle; dominant-baseline: central; }
        .spiral .lead { fill: none; stroke: var(--dim); stroke-width: 0.75; opacity: 0.6; }
        .spiral .mark { fill: none; stroke: var(--ink); stroke-width: 1; }
        .spiral .num { fill: var(--ink); font-size: 10px; font-weight: 600; text-anchor: middle; dominant-baseline: central;
          stroke: var(--bg); stroke-width: 3px; paint-order: stroke; pointer-events: none; }
        .spiral .hot { fill: none; stroke: var(--accent); stroke-width: 1.5; pointer-events: none; }
        .spiral .lab { position: absolute; height: ${LH}px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center;
          font-size: 12px; line-height: 15px; color: var(--ink); }
        .spiral .lab.l { text-align: right; } .spiral .lab.r { text-align: left; }
        .spiral .lab span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .spiral .lab span + span, .spiral li span + span { color: var(--dim); font-size: 11px; }
        .spiral .quiet span:first-child { color: var(--dim); font-style: italic; }
        .spiral button { all: unset; box-sizing: border-box; cursor: pointer; }
        .spiral button.lab { display: flex; }
        .spiral button:hover span:first-child { text-decoration: underline; }
        .spiral button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; border-radius: 4px; }
        .spiral ol { list-style: none; margin: 12px auto 0; padding: 0; max-width: 720px; columns: 220px; column-gap: 20px; font-size: 13px; }
        .spiral li { break-inside: avoid; display: grid; grid-template-columns: 22px 1fr; padding: 4px 0; }
        .spiral li b { font-size: 11px; color: var(--dim); font-weight: 600; line-height: 18px; }
        .spiral li span { display: block; overflow-wrap: anywhere; }
        .spiral li button { display: block; }
      `}</style>

      <p className="cap">
        {who} as a spiral: birth at the centre, one turn for each year. Each spoke is a calendar month, so every
        January lines up, every February, and so on. Every dot is a month, coloured by where {life.name ?? 'they'} lived. Larger dots have an entry; hollow ones are not yet confirmed.
      </p>

      <div ref={stage} className={`stage ${wide ? 'wide' : 'narrow'}`}>
        {plan && (
          <>
            <svg viewBox={`0 0 ${plan.w} ${plan.h}`} role="img" aria-label={alt} style={{ cursor: hot && onCell ? 'pointer' : undefined }}
              onPointerMove={(e) => setTip(nearest(e))} onPointerLeave={() => setTip(null)}
              onClick={(e) => { const n = nearest(e); if (n && onCell) onCell(plan.pts[n.i].month); }}>
              {plan.spokes.map((k) => (
                <g key={k.name}>
                  <line className="spoke" x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} />
                  <text className="mon" x={k.tx} y={k.ty}>{k.name}</text>
                </g>))}
              {plan.track && <path className="track" d={plan.track} />}
              {plan.pts.map((p) => {
                if (!p.ev) {
                  return <circle key={p.i} cx={p.x} cy={p.y} r={p.rad} className={p.color ? undefined : 'none'} fill={p.color} opacity={0.5} />;
                }
                const quiet = !p.ev.confirmed, c = p.color ?? 'var(--dim)';
                return (
                  <circle
                    key={p.i} cx={p.x} cy={p.y}
                    r={quiet ? Math.max(0.5, p.rad - 0.6) : p.rad}
                    fill={quiet ? 'var(--bg)' : c} stroke={quiet ? c : undefined}
                    strokeWidth={quiet ? Math.min(1.2, p.rad * 0.5) : undefined}
                    strokeDasharray={quiet && p.rad > 3 ? '2 1.5' : undefined}
                    opacity={quiet ? 0.75 : 1}
                  />
                );
              })}
              {plan.labels.map((l) => {
                const p = plan.pts[plan.index(l.ev.month)];
                if (wide) {
                  const edge = l.side === 'r' ? plan.cx + plan.D / 2 + 10 : plan.cx - plan.D / 2 - 10;
                  return (
                    <g key={l.ev.month}>
                      <path className="lead" d={`M${p.x.toFixed(1)} ${p.y.toFixed(1)}L${edge.toFixed(1)} ${l.ly.toFixed(1)}`} />
                      <circle className="mark" cx={p.x} cy={p.y} r={p.rad + 2} />
                    </g>
                  );
                }
                return (
                  <g key={l.ev.month}>
                    <circle className="mark" cx={p.x} cy={p.y} r={p.rad + 2} />
                    <text className="num" x={l.x} y={l.y}>{l.n}</text>
                  </g>
                );
              })}
              {hot && <circle className="hot" cx={hot.x} cy={hot.y} r={hot.rad + 3.5} />}
            </svg>
            {hot && tip && (
              <div className="tip" style={{ left: Math.min(tip.x + 14, innerWidth - 232), top: tip.y > innerHeight - 90 ? tip.y - 70 : tip.y + 18 }}>
                {hot.ev && <b>{hot.ev.text}{!hot.ev.confirmed && <em> · to confirm</em>}</b>}
                <span><i style={{ background: hot.color ?? 'var(--dim)' }} />{fmt(hot.month)} · age {Math.floor(hot.i / 12)}{hot.place ? ` · ${hot.place}` : ''}</span>
              </div>)}

            {wide && plan.colW >= 60 && plan.labels.map((l) => {
              const style = {
                top: l.ly - LH / 2,
                width: plan.colW,
                left: l.side === 'r' ? plan.cx + plan.D / 2 + 14 : plan.cx - plan.D / 2 - 14 - plan.colW,
              };
              const cls = `lab ${l.side}${l.ev.confirmed ? '' : ' quiet'}`;
              const body = <><span>{l.ev.text}</span><span>{line(l.ev)}</span></>;
              return onCell
                ? <button key={l.ev.month} className={cls} style={style} onClick={() => onCell(l.ev.month)}>{body}</button>
                : <div key={l.ev.month} className={cls} style={style}>{body}</div>;
            })}
          </>
        )}
      </div>

      {!wide && plan && plan.labels.length > 0 && (
        <ol>
          {plan.labels.map((l) => {
            const body = <><span>{l.ev.text}</span><span>{line(l.ev)}</span></>;
            return (
              <li key={l.ev.month} className={l.ev.confirmed ? undefined : 'quiet'}>
                <b>{l.n}</b>
                {onCell ? <button onClick={() => onCell(l.ev.month)}>{body}</button> : <div>{body}</div>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
