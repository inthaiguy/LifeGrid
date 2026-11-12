import { useEffect, useMemo, useRef, useState } from 'react';
import { type State, type YM, ym, yOf, mOf, nowYM, homeAt, colorOf, fmt } from './model';

// Tree view: a sketched bare tree as old as the person, beside a cross-section with one ring per year.
// Everything is drawn by code from the age and a seed taken from the person, so the same life
// always gives the same tree, and it scales to any size.

type P = [number, number];
const INK = 'var(--ink)';

/** Small seeded random number generator, so a drawing is repeatable. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f = (n: number) => n.toFixed(1);

/** A smooth closed curve through the points (Catmull-Rom turned into Béziers). */
function closed(pts: P[]): string {
  const n = pts.length, at = (i: number) => pts[(i + n) % n];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

/* ---------- the tree ---------- */

// A bare winter tree, after photographs of leafless maples: a clear dark trunk that forks into
// several rising limbs, each carrying side shoots along its whole length that divide again into a
// haze of fine twigs. Light falls from the left, so the trunk and limbs are paler on that side.

interface Strokes { w: number; d: string }
const bucketed = () => [0.34, 0.5, 0.75, 1.1, 1.6, 2.6, 4.5, 8].map((w) => ({ w, d: '' }));
const into = (b: Strokes[], w: number, d: string) => { (b.find((k) => w <= k.w) || b[b.length - 1]).d += d; };
const line = (pts: P[]) => 'M' + pts.map((q) => `${f(q[0])} ${f(q[1])}`).join('L');

function growTree(age: number, seed: string) {
  const r = rng(seed + '|tree');
  const g = Math.sqrt(Math.min(age, 95) / 95);              // 0 at birth, 1 for a very old tree
  const H = 18 + 350 * g, W = 1.3 + 25 * g;
  const maxDepth = Math.min(5, 2 + Math.floor(g * 3.1));
  const twigs = bucketed(), lights = bucketed();
  let limbs = '', x0 = 0, x1 = 0, y1 = -H;
  const UP = -Math.PI / 2, shoots = [0, 5, 4, 3, 2, 2];

  const grow = (x: number, y: number, ang: number, len: number, w: number, depth: number, side: number) => {
    const steps = 6, pts: P[] = [[x, y]], angs = [ang], ws = [w];
    let a = ang;
    for (let i = 1; i <= steps; i++) {
      a += (UP - a) * (depth === 1 ? 0.12 : 0.08) + (r() - 0.5) * 0.24;   // reach for the light, with a tremor
      x += Math.cos(a) * len / steps; y += Math.sin(a) * len / steps;
      pts.push([x, y]); angs.push(a); ws.push(Math.max(0.26, w * (1 - 0.6 * i / steps)));
    }
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.min(y1, y);
    if (w > 1.5) {
      // A thick limb is a tapering shape, with a pale stroke down its lit side.
      const L: P[] = [], R: P[] = [], hi: P[] = [];
      pts.forEach((q, i) => {
        const nx = -Math.sin(angs[i]), ny = Math.cos(angs[i]), h = ws[i] / 2, lit = nx < 0 ? 1 : -1;
        L.push([q[0] + nx * h, q[1] + ny * h]); R.push([q[0] - nx * h, q[1] - ny * h]);
        hi.push([q[0] + nx * h * 0.45 * lit, q[1] + ny * h * 0.45 * lit]);
      });
      limbs += line([...L, ...R.reverse()]) + 'Z';
      into(lights, w * 0.3, line(hi));
    } else into(twigs, (w + ws[steps]) / 2, line(pts));
    if (depth >= maxDepth) return;
    const n = shoots[depth];
    for (let k = 0; k < n; k++) {
      const i = 1 + Math.round((k / Math.max(1, n - 1)) * (steps - 2)), s2 = (k % 2 ? -1 : 1) * side;
      grow(pts[i][0], pts[i][1], angs[i] + s2 * (0.45 + r() * 0.4), len * (0.6 - 0.065 * i) * (0.8 + r() * 0.4), Math.max(0.26, ws[i] * 0.5), depth + 1, s2);
    }
    for (const s2 of [-1, 1]) grow(x, y, a + s2 * (0.25 + r() * 0.3), len * (0.22 + r() * 0.1), Math.max(0.26, ws[steps] * 0.8), depth + 1, s2); // the tip forks
  };

  // The trunk: nearly even up to the fork, then narrowing quickly into the leader.
  const tb = 0.25 + g * 0.13 + r() * 0.04;
  const axis = (t: number) => Math.sin(t * 4.4 + 1) * H * 0.007 + Math.sin(t * 10) * H * 0.003;
  const half = (t: number) => (W / 2) * (t < tb ? 1 - 0.2 * (t / tb) : 0.8 * (0.06 + 0.94 * Math.pow(1 - (t - tb) / (1 - tb), 1.25))) + (t < 0.05 ? (0.05 - t) * W * 3.4 : 0);
  const L: P[] = [], R: P[] = [];
  for (let i = 0; i <= 30; i++) {
    const tt = i / 30, c = axis(tt), hw = half(tt), n = () => (r() - 0.5) * Math.min(1.2, hw * 0.22);
    L.push([c - hw + n(), -tt * H]); R.push([c + hw + n(), -tt * H]);
  }
  const trunk = line([...L, ...R.reverse()]) + 'Z';
  const bark: { d: string; light: boolean }[] = [];
  for (let i = 0; i < Math.round(W * H / 26); i++) {
    const tt = Math.pow(r(), 1.2) * Math.min(0.9, tb + 0.35), hw = half(tt), u = r(), len = 3 + r() * 10;
    bark.push({ d: `M${f(axis(tt) + (u - 0.5) * hw * 1.8)} ${f(-tt * H)}l${f((r() - 0.5) * 1.4)} ${f(-len)}`, light: u < 0.4 });
  }

  if (age >= 1) {
    // Main limbs leave the trunk around the fork and climb; the lowest lean out the furthest.
    const n = Math.round(3 + g * 6);
    for (let i = 0; i < n; i++) {
      const tt = tb + Math.pow((i + r() * 0.5) / n, 1.25) * (0.74 - tb), u = (tt - tb) / (1 - tb), side = i % 2 ? 1 : -1;
      grow(axis(tt) + side * half(tt) * 0.4, -tt * H, UP + side * (0.62 - u * 0.36 + (r() - 0.5) * 0.16), H * (1 - tt) * (0.78 + r() * 0.16) + H * 0.05, Math.max(0.5, half(tt) * 1.15), 1, side);
    }
    // Lesser shoots up the leader, so the crown closes at the top.
    const m = Math.round(4 + g * 12);
    for (let i = 0; i < m; i++) {
      const tt = tb + 0.1 + (i / m) * (0.88 - tb), side = i % 2 ? -1 : 1;
      grow(axis(tt) + side * half(tt) * 0.5, -tt * H, UP + side * (0.45 + r() * 0.4), H * (1 - tt) * 0.5 + H * 0.05, Math.max(0.4, half(tt) * 0.8), Math.min(maxDepth, 2), side);
    }
  }
  grow(axis(1), -H, UP, H * 0.08 + 3, Math.max(0.4, half(1) * 1.6), Math.max(1, maxDepth - 1), 1);

  const gw = Math.max(40, W * 2.6);
  let ground = `M${f(-gw)} 1`;
  for (let i = 1; i <= 8; i++) ground += `L${f(-gw + (i / 8) * gw * 2)} ${f((r() - 0.5) * 2.2)}`;
  const pad = 14, hx = Math.max(96, -x0 + pad, x1 + pad), top = Math.min(-190, y1 - pad);
  return { trunk, bark, limbs, W, twigs: twigs.filter((k) => k.d), lights: lights.filter((k) => k.d), ground, box: `${f(-hx)} ${f(top)} ${f(hx * 2)} ${f(-top + 18)}` };
}

/* ---------- the cross-section ---------- */

interface Pick { at: YM; k: number; text: string }

/** At most one event per year, spread evenly across the life, one-off and confirmed events first. */
function pickEvents(s: State, age: number, slots: number): Pick[] {
  const by = s.birth!.y, norm = (t: string) => t.toLowerCase().replace(/\d+(st|nd|rd|th)?/g, '#').trim();
  const freq: Record<string, number> = {};
  for (const c of Object.values(s.cells)) freq[norm(c.t)] = (freq[norm(c.t)] || 0) + 1;
  const best: Record<number, Pick & { score: number }> = {};
  for (const [at, c] of Object.entries(s.cells)) {
    const k = yOf(at) - by;
    if (k < 0 || k > age) continue;
    let score = c.p ? 0 : 3;
    if (/^(born|moved?|married|wedding|engaged|graduat|first|started|new job|retired|bought)/i.test(c.t)) score += 2;
    if (freq[norm(c.t)] > 2) score -= 2;                    // yearly things: birthdays, holidays
    if (!best[k] || score > best[k].score) best[k] = { at, k, text: c.t, score };
  }
  const years = Object.values(best);
  if (years.length <= slots) return years.sort((a, b) => a.k - b.k);
  const out: Pick[] = [];
  for (let b = 0; b < slots; b++) {                          // one from each equal slice of the life
    const lo = (b / slots) * (age + 1), hi = ((b + 1) / slots) * (age + 1);
    const c = years.filter((y) => y.k >= lo && y.k < hi).sort((a, z) => z.score - a.score || a.k - z.k)[0];
    if (c) out.push(c);
  }
  return out;
}

function Rings({ s, age, wide, seed, onCell }: { s: State; age: number; wide: boolean; seed: string; onCell?: (at: YM) => void }) {
  const r = rng(seed + '|rings');
  const RM = wide ? 150 : 100, R = Math.min(RM, RM * 0.42 + age * 2.2);
  const VW = wide ? 760 : 380, VH = RM * 2 + 60, cx = wide ? VW / 2 : RM + 18, cy = VH / 2;

  // One band per year of life; the widths vary like good and lean growing years.
  const w = Array.from({ length: age + 1 }, () => 0.7 + r() * 0.6), sum = w.reduce((a, b) => a + b, 0);
  const edge: number[] = [0];
  for (const x of w) edge.push(edge[edge.length - 1] + (x / sum) * (R - 3));
  for (let i = 0; i < edge.length; i++) edge[i] += 3;        // room for the pith

  // All rings share one slow distortion, so they nest; each adds a little of its own.
  const wob = [2, 3, 4, 5].map((k) => ({ k, a: (0.05 / k) * (0.5 + r()), p: r() * 6.28 }));
  const ring = (rad: number, own: number, ph: number): string => {
    const pts: P[] = [];
    for (let i = 0; i < 72; i++) {
      const t = (i / 72) * Math.PI * 2;
      const q = rad * (1 + wob.reduce((a, o) => a + o.a * Math.cos(o.k * t + o.p), 0) * (0.35 + 0.65 * rad / R)) + own * Math.sin(7 * t + ph) + own * 0.6 * Math.sin(13 * t + ph * 2);
      pts.push([cx + Math.cos(t) * q, cy + Math.sin(t) * q]);
    }
    return closed(pts);
  };
  const by = s.birth!.y;
  const bands = w.map((_, k) => {
    const y = Math.min(by + k, yOf(nowYM())), home = homeAt(s, ym(y, k === age ? mOf(nowYM()) : 7));
    return { d: ring(edge[k + 1], 0.5, r() * 6.28), fill: `color-mix(in srgb, ${colorOf(s, home)} 34%, ${k % 2 ? '#e9d6b6' : '#dfc9a4'})`, decade: k > 0 && k % 10 === 0 };
  }).reverse();                                               // widest first, so each sits on the one outside it
  const cracks = Array.from({ length: age > 6 ? 3 : age > 2 ? 1 : 0 }, () => {
    const a = r() * 6.28, from = R * (0.08 + r() * 0.1), to = R * (0.5 + r() * 0.45);
    let d = '';
    for (let i = 0; i <= 5; i++) { const q = from + ((to - from) * i) / 5, aa = a + (r() - 0.5) * 0.07; d += `${i ? 'L' : 'M'}${f(cx + Math.cos(aa) * q)} ${f(cy + Math.sin(aa) * q)}`; }
    return d;
  });

  // Labels: listed down each side in order of time; each line leaves its ring along a spoke, so none cross.
  const sides = wide ? 2 : 1, per = Math.floor((VH - 34) / 19);
  const picks = pickEvents(s, age, sides * per);
  const cols: Pick[][] = sides === 2 ? [picks.filter((_, i) => i % 2 === 0), picks.filter((_, i) => i % 2 === 1)] : [[], picks];
  const max = wide ? 30 : 21;
  const labels = cols.flatMap((col, side) => {
    const dir = side === 0 ? -1 : 1, step = Math.min(30, Math.max(19, (VH - 40) / Math.max(col.length, 1)));
    const lx = cx + dir * (RM + (wide ? 44 : 24)), reach = Math.max(R + 12, ((col.length - 1) * step) / 2 + 4);
    return col.map((p, i) => {
      const y = cy + (i - (col.length - 1) / 2) * step, a = Math.asin(Math.max(-0.96, Math.min(0.96, (y - cy) / (reach * 1.06))));
      const rk = (edge[p.k] + edge[p.k + 1]) / 2;
      const px = cx + dir * Math.cos(a) * rk, py = cy + Math.sin(a) * rk, ex = cx + dir * Math.cos(a) * (R + 9), ey = cy + Math.sin(a) * (R + 9);
      const text = p.text.length > max ? p.text.slice(0, max - 1).trimEnd() + '…' : p.text;
      return { p, dir, lx, y, px, py, line: `M${f(px)} ${f(py)}L${f(ex)} ${f(ey)}L${f(lx - dir * 5)} ${f(y)}`, text };
    });
  });

  return (
    <svg className="rings" viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={`Cross-section of the tree with ${age} growth ${age === 1 ? 'ring' : 'rings'}, one for each year`}>
      <g filter="url(#lg-rough)">
        <path d={ring(R + 7, 1.6, 1)} fill="#6a4a36" />
        <path d={ring(R + 2.6, 0.8, 2)} fill="#8d6a4c" />
        {bands.map((b, i) => <path key={i} d={b.d} fill={b.fill} stroke="#7a5536" strokeWidth={b.decade ? 1.5 : 0.8} strokeOpacity={b.decade ? 0.85 : 0.5} />)}
        {cracks.map((d, i) => <path key={i} d={d} fill="none" stroke="#5a3d2b" strokeWidth="1" strokeOpacity=".5" strokeLinecap="round" />)}
        <circle cx={cx} cy={cy} r="2.2" fill="#5a3d2b" />
      </g>
      {labels.map((l) => (
        <g key={l.p.at} className={`ring-label${onCell ? ' can' : ''}`} onClick={onCell && (() => onCell(l.p.at))}>
          <title>{`${l.p.text} — ${fmt(l.p.at)} · age ${l.p.k}`}</title>
          <path d={l.line} fill="none" stroke={INK} strokeWidth=".7" strokeOpacity=".55" />
          <circle cx={l.px} cy={l.py} r="2" fill={INK} />
          <text x={l.lx} y={l.y + 3.6} textAnchor={l.dir < 0 ? 'end' : 'start'}><tspan className="yr">{yOf(l.p.at)}</tspan> {l.text}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Tree({ s, onCell }: { s: State; onCell?: (at: YM) => void }) {
  // Lay out by the room actually available (the shelf may be docked beside it): stacked on a phone,
  // side by side when there is width, and labels on both sides of the rings only when there is plenty.
  const box = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth));
    ro.observe(el); setCw(el.clientWidth);
    return () => ro.disconnect();
  }, [!!s.birth]);
  const row = cw >= 640, two = cw >= 1130;
  if (!s.birth) return <div className="grid-empty"><p>Your life, as a tree.</p><p className="dim">Answer the first question and it starts to grow.</p></div>;
  const now = nowYM(), age = Math.max(0, yOf(now) - s.birth.y - (mOf(now) < s.birth.m ? 1 : 0));
  const seed = `${s.name || ''}|${s.birth.y}-${s.birth.m}|${s.birth.place}`;
  const t = useMemo(() => growTree(age, seed), [age, seed]); // thousands of twigs: draw once per life, not per render
  return (
    <div className={`treeview${row ? ' wide' : ''}${two ? ' two' : ''}`} ref={box}>
      {/* One shared filter gives every stroke a slight pen wobble. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="lg-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" />
        </filter>
        <filter id="lg-fine" x="-3%" y="-3%" width="106%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.5" />
        </filter>
      </svg>
      <figure className="oak">
        <svg viewBox={t.box} role="img" aria-label={`A bare tree ${age} years old`}>
          <defs>
            <linearGradient id="lg-trunk" gradientUnits="userSpaceOnUse" x1={-t.W / 2} x2={t.W / 2} y1="0" y2="0">
              <stop offset="0" className="t-light" /><stop offset=".38" className="t-mid" /><stop offset="1" className="t-deep" />
            </linearGradient>
          </defs>
          <g filter="url(#lg-fine)" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={t.ground} className="s-mid" strokeWidth=".9" strokeOpacity=".6" />
            {t.twigs.map((k) => <path key={k.w} d={k.d} className={k.w <= 0.5 ? 's-fine' : k.w <= 1.1 ? 's-mid' : 's-dark'} strokeWidth={k.w} />)}
            <path d={t.limbs} className="f-dark" />
            {t.lights.map((k) => <path key={k.w} d={k.d} className="s-light" strokeWidth={k.w} strokeOpacity=".5" />)}
            <path d={t.trunk} fill="url(#lg-trunk)" />
            {t.bark.map((b, i) => <path key={i} d={b.d} className={b.light ? 's-light' : 's-deep'} strokeWidth=".7" strokeOpacity={b.light ? 0.5 : 0.75} />)}
          </g>
        </svg>
        <figcaption>{age === 0 ? 'A tree in its first year' : `A tree, ${age} ${age === 1 ? 'year' : 'years'} old`}</figcaption>
      </figure>
      <figure className="section">
        <Rings s={s} age={age} wide={two} seed={seed} onCell={onCell} />
        <figcaption>{age === 0 ? 'The first ring is still growing.' : `${age} ${age === 1 ? 'ring' : 'rings'}, one for each year, tinted by where you lived.`}</figcaption>
      </figure>
    </div>
  );
}
