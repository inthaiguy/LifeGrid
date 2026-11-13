import { useEffect, useMemo, useRef, useState } from 'react';
import { type State, type YM, MON, yOf, mOf, fmt } from './model';
import { pickEvents } from './Tree';

// Voyager view: a life laid along Voyager 2's journey. The solar system is drawn as a tilted disc,
// in the same pencil manner as the tree; Voyager 2 swings past the four giant planets and drops
// away below the plane, with Voyager 1 as a fainter companion climbing above it. Markers on the
// path show where the spacecraft was at the mission's milestones and at moments in the person's life.
//
// The geometry is a sketch, not an ephemeris: distances are compressed (a power of the real
// distance) so the planets and the far journey fit one view, and positions between the known
// encounters are interpolated.

type P = [number, number];
interface Way { t: number; d: number; lon: number; lat: number } // year, AU from the Sun, heliocentric longitude and latitude (degrees)

const when = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return y + (m - 1) / 12 + ((d || 15) - 1) / 365; };
const today = () => { const d = new Date(); return d.getFullYear() + d.getMonth() / 12 + (d.getDate() - 1) / 365; };

// Up to its last planet each craft is traced through its encounters (longitudes keep increasing past
// 360 so the path winds the right way round the Sun). After that it coasts in a straight line: `out`
// is the direction it left in, and the later entries give only how far from the Sun it had got.
interface Craft { way: Way[]; last: number; out: { lon: number; lat: number } }
const V2: Craft = {
  last: 4, out: { lon: 290, lat: -42 },
  way: [
    { t: when('1977-08-20'), d: 1.01, lon: 327, lat: 0 },    // launch, at Earth
    { t: when('1979-07-09'), d: 5.3, lon: 495, lat: 0 },     // Jupiter
    { t: when('1981-08-25'), d: 9.6, lon: 552, lat: 0 },     // Saturn
    { t: when('1986-01-24'), d: 19.1, lon: 618, lat: 0 },    // Uranus
    { t: when('1989-08-25'), d: 30.2, lon: 641, lat: 0 },    // Neptune, which bent it south
    { t: when('2007-08-30'), d: 83.7, lon: 0, lat: 0 },      // termination shock
    { t: when('2018-11-05'), d: 119, lon: 0, lat: 0 },       // heliopause
    { t: 2040, d: 119 + 21.15 * 3.2, lon: 0, lat: 0 },
  ],
};
const V1: Craft = {
  last: 2, out: { lon: 258, lat: 36 },
  way: [
    { t: when('1977-09-05'), d: 1.01, lon: 343, lat: 0 },
    { t: when('1979-03-05'), d: 5.2, lon: 484, lat: 0 },     // Jupiter
    { t: when('1980-11-12'), d: 9.5, lon: 543, lat: 0 },     // Saturn, which sent it north
    { t: 1990.12, d: 40.5, lon: 0, lat: 0 },
    { t: when('2012-08-25'), d: 121.6, lon: 0, lat: 0 },     // heliopause
    { t: 2040, d: 121.6 + 27.35 * 3.57, lon: 0, lat: 0 },
  ],
};
const RAD = Math.PI / 180;
const xyz = (lon: number, lat: number, r: number) => [r * Math.cos(lat * RAD) * Math.cos(lon * RAD), r * Math.cos(lat * RAD) * Math.sin(lon * RAD), r * Math.sin(lat * RAD)];
function at(c: Craft, t: number): Way {
  const w = c.way;
  if (t <= w[0].t) return w[0];
  let i = 1;
  while (i < w.length - 1 && t > w[i].t) i++;
  const a = w[i - 1], b = w[i], u = Math.min(1, (t - a.t) / (b.t - a.t)), d = a.d + (b.d - a.d) * u;
  if (i <= c.last) return { t, d, lon: a.lon + (b.lon - a.lon) * u, lat: 0 };
  // Coasting: start at the last planet, go along `out` until the distance from the Sun is d.
  const p = w[c.last], o = xyz(p.lon, 0, p.d), v = xyz(c.out.lon, c.out.lat, 1), dot = o[0] * v[0] + o[1] * v[1] + o[2] * v[2];
  const L = -dot + Math.sqrt(Math.max(0, dot * dot - (p.d * p.d - d * d))), q = o.map((x, k) => x + v[k] * L);
  return { t, d, lon: Math.atan2(q[1], q[0]) / RAD, lat: Math.asin(q[2] / d) / RAD };
}

const MILESTONES = [
  { iso: '1977-08-20', name: 'Launch from Earth' },
  { iso: '1979-07-09', name: 'Jupiter' },
  { iso: '1981-08-25', name: 'Saturn' },
  { iso: '1986-01-24', name: 'Uranus' },
  { iso: '1989-08-25', name: 'Neptune' },
  { iso: '2018-11-05', name: 'Interstellar space' },
];
const ORBITS = [0.39, 0.72, 1, 1.52, 5.2, 9.54, 19.2, 30.07];
// Each planet is drawn where Voyager 2 met it (Earth where it left).
const PLANETS = [
  { name: 'Earth', a: 1, lon: 327, size: 0.05 },
  { name: 'Jupiter', a: 5.2, lon: 495, size: 0.17 },
  { name: 'Saturn', a: 9.54, lon: 552, size: 0.145, ring: true },
  { name: 'Uranus', a: 19.2, lon: 618, size: 0.1 },
  { name: 'Neptune', a: 30.07, lon: 641, size: 0.1 },
];
const squeeze = (au: number) => Math.pow(au, 0.45);
const HELIOPAUSE = squeeze(120);
const TILT = 0.4, RISE = 0.92; // how much the disc is foreshortened, and how tall "above the plane" looks

const f = (n: number) => n.toFixed(1);
const line = (pts: P[]) => 'M' + pts.map((q) => `${f(q[0])} ${f(q[1])}`).join('L');
const monthYear = (iso: string) => `${MON[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;

interface Label { key: string; pt: P; ax: number; ay: number; tx: number; lead: string; rest: string; cls?: string; cell?: YM }
interface Rect { x: number; y: number; w: number; h: number }

export default function Voyager({ s, onCell }: { s: State; onCell?: (at: YM) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize([el.clientWidth, el.clientHeight]));
    ro.observe(el); setSize([el.clientWidth, el.clientHeight]);
    return () => ro.disconnect();
  }, [!!s.birth]);
  const [w, h] = size;
  const cells = Object.keys(s.cells).length;

  const scene = useMemo(() => {
    if (!s.birth || w < 200 || h < 200) return null;
    const now = today(), born = s.birth.y + (s.birth.m - 0.5) / 12, launch = V2.way[0].t;
    const tall = h > w * 1.15, phone = w < 560;
    const rot = tall ? 20 : 290; // turn the system so Voyager 2 leaves down the long side of the screen
    // Model space: the ecliptic is the X–Y plane, seen from above and tilted away; +Z is north.
    const unit = (lon: number, lat: number, r: number, flat = false): [number, number, number] => {
      const th = ((lon - rot) * Math.PI) / 180, la = (lat * Math.PI) / 180;
      const X = r * Math.cos(la) * Math.cos(th), Y = r * Math.cos(la) * Math.sin(th), Z = flat ? 0 : r * Math.sin(la);
      return [X, -Y * TILT - Z * RISE, Y];
    };
    const sample = (path: Craft, to: number, flat = false) => {
      const out: [number, number, number][] = [];
      for (let t = path.way[0].t; t < to; t += 0.08) { const p = at(path, t); out.push(unit(p.lon, p.lat, squeeze(p.d), flat)); }
      const p = at(path, to); out.push(unit(p.lon, p.lat, squeeze(p.d), flat));
      return out;
    };
    const u2 = sample(V2, now), u1 = sample(V1, now);
    const rN = squeeze(30.07);
    // Fit: the planets' disc and both journeys, with room round the edge for labels.
    let x0 = -rN, x1 = rN, y0 = -rN * TILT, y1 = rN * TILT;
    for (const p of [...u2, ...u1]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const pad = phone ? { l: 14, r: 22, t: 74, b: 40 } : { l: 40, r: Math.min(190, w * 0.14), t: 64, b: 46 };
    const U = Math.min((w - pad.l - pad.r) / (x1 - x0), (h - pad.t - pad.b) / (y1 - y0));
    const ox = pad.l + (w - pad.l - pad.r - (x1 - x0) * U) / 2 - x0 * U, oy = pad.t + (h - pad.t - pad.b - (y1 - y0) * U) / 2 - y0 * U;
    const px = (p: [number, number, number] | number[]): P => [ox + p[0] * U, oy + p[1] * U];
    const pos = (path: Craft, t: number, flat = false): P => { const q = at(path, t); return px(unit(q.lon, q.lat, squeeze(q.d), flat)); };
    const fs = phone ? 11 : w > 1500 ? 13.5 : 12;

    // Orbits, each split into the far half (faint) and the near half.
    const orbits = ORBITS.map((a) => {
      const far: P[][] = [[]], near: P[][] = [[]];
      for (let i = 0; i <= 96; i++) {
        const lon = rot + (i / 96) * 360, p = unit(lon, 0, squeeze(a)), set = p[2] > 0 ? far : near, other = p[2] > 0 ? near : far;
        if (other[other.length - 1].length) { other[other.length - 1].push(px(p)); other.push([]); }
        set[set.length - 1].push(px(p));
      }
      const d = (runs: P[][]) => runs.filter((r) => r.length > 1).map(line).join('');
      return { a, far: d(far), near: d(near) };
    });
    const disc = line(Array.from({ length: 72 }, (_, i) => px(unit(rot + i * 5, 0, rN)))) + 'Z';
    const sun = px([0, 0, 0]), sunR = Math.max(4.5, U * 0.14);
    const planets = PLANETS.map((p) => {
      const c = px(unit(p.lon, 0, squeeze(p.a))), r = Math.max(p.name === 'Earth' ? 2.6 : 4.5, U * p.size);
      const dx = sun[0] - c[0], dy = sun[1] - c[1], len = Math.hypot(dx, dy) || 1;
      return { ...p, c, r, lx: 0.5 + 0.3 * dx / len, ly: 0.5 + 0.3 * dy / len };
    });

    // The two journeys, their shadows on the plane, and plumb lines that show the drop below (or rise above) it.
    const path2 = line(u2.map(px)), path1 = line(u1.map(px));
    const shadow2 = line(sample(V2, now, true).map(px));
    const shadow1 = line(sample(V1, now, true).map(px));
    const plumbs: { d: string; year?: number; foot: P }[] = [];
    for (const y of [2000, 2010, 2020, now]) {
      if (y > now) continue;
      const a = pos(V2, y), b = pos(V2, y, true);
      plumbs.push({ d: line([a, b]), year: y === now ? undefined : y, foot: b });
    }
    for (const y of [2000, now]) plumbs.push({ d: line([pos(V1, y), pos(V1, y, true)]), foot: pos(V1, y, true) });
    const arc = (path: Craft, tCross: number) => {
      const c = pos(path, tCross), a0 = Math.atan2(c[1] - sun[1], c[0] - sun[0]), R = HELIOPAUSE * U, pts: P[] = [];
      for (let i = -12; i <= 12; i++) { const a = a0 + i * 0.045; pts.push([sun[0] + Math.cos(a) * R, sun[1] + Math.sin(a) * R]); }
      return { d: line(pts), end: pts[pts.length - 1] };
    };
    const hp2 = arc(V2, when('2018-11-05')), hp1 = arc(V1, when('2012-08-25'));
    const craft = (path: Craft) => { const a = pos(path, now), b = pos(path, now - 0.6); return { p: a, ang: (Math.atan2(a[1] - b[1], a[0] - b[0]) * 180) / Math.PI }; };

    // Labels: each tries a few spots beside its point and takes the first that is free. More screen, more labels.
    const taken: Rect[] = [{ x: 0, y: 0, w: phone ? w : Math.min(430, w * 0.5), h: phone ? 66 : 56 }, { x: 0, y: h - 26, w: phone ? w : 420, h: 26 }];
    taken.push({ x: sun[0] - sunR - 3, y: sun[1] - sunR - 3, w: sunR * 2 + 6, h: sunR * 2 + 6 });
    for (const p of planets) taken.push({ x: p.c[0] - p.r * (p.ring ? 2 : 1) - 2, y: p.c[1] - p.r - 2, w: p.r * (p.ring ? 4 : 2) + 4, h: p.r * 2 + 4 });
    u2.forEach((q, i) => { if (i % 3 === 0) { const c = px(q); taken.push({ x: c[0] - 3, y: c[1] - 3, w: 6, h: 6 }); } });
    const hit = (r: Rect) => r.x < 4 || r.y < 4 || r.x + r.w > w - 4 || r.y + r.h > h - 4 || taken.some((b) => r.x < b.x + b.w && r.x + r.w > b.x && r.y < b.y + b.h && r.y + r.h > b.y);
    const labels: Label[] = [];
    const place = (key: string, pt: P, normal: P, lead: string, rest: string, extra: Partial<Label> = {}): boolean => {
      const tw = (lead.length * 0.6 + rest.length * 0.54) * fs + 10, dirs: P[] = [normal, [-normal[0], -normal[1]], [0, -1], [0, 1], [1, 0], [-1, 0]];
      for (const dist of [16, 30, 46, 64, 86, 112]) for (const dv of dirs) {
        const ax = pt[0] + dv[0] * dist, ay = pt[1] + dv[1] * dist, right = dv[0] >= -0.2;
        const r = { x: right ? ax + 3 : ax - 3 - tw, y: ay - fs * 0.75, w: tw, h: fs * 1.5 };
        r.x = Math.max(5, Math.min(w - 5 - tw, r.x)); // on a narrow screen, slide the label sideways to keep it on the page
        if (hit(r)) continue;
        taken.push(r); labels.push({ key, pt, ax, ay, tx: r.x + 4, lead, rest, ...extra });
        return true;
      }
      return false;
    };
    const normalAt = (path: Craft, t: number): P => { const a = pos(path, t - 0.2), b = pos(path, t + 0.2), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    const ageAt = (t: number) => (t >= born ? `age ${Math.floor(t - born)}` : `${Math.ceil(born - t)} yr before you`);
    const au = (t: number) => Math.round(at(V2, t).d);

    place('now', pos(V2, now), normalAt(V2, now), 'Voyager 2 today', phone ? `${au(now)} AU out · you are ${Math.floor(now - born)}` : `about ${au(now)} AU out · you are ${Math.floor(now - born)}`);
    if (born > launch) place('born', pos(V2, born), normalAt(V2, born), 'You were born', `${MON[s.birth.m - 1]} ${s.birth.y} · ${au(born)} AU out`, { cls: 'you' });
    for (const m of MILESTONES) place(m.iso, pos(V2, when(m.iso)), normalAt(V2, when(m.iso)), m.name, `${monthYear(m.iso)} · ${ageAt(when(m.iso))}`);
    place('v1', pos(V1, now), normalAt(V1, now), 'Voyager 1 today', `about ${Math.round(at(V1, now).d)} AU out`, { cls: 'faint' });
    if (!phone) place('hp', hp2.end, [0, 1], '', 'the heliopause, edge of the Sun’s bubble', { cls: 'faint' });

    // Life events, the weightier ones first, as many as find room.
    const age = Math.max(0, Math.floor(now - born)), birthAt = `${s.birth.y}-${String(s.birth.m).padStart(2, '0')}`;
    const big = (t: string) => /^(born|moved?|married|wedding|engaged|graduat|first|started|new job|retired|bought)/i.test(t);
    const picks = pickEvents(s, age, 60)
      .map((p) => ({ ...p, t: yOf(p.at) + (mOf(p.at) - 0.5) / 12 }))
      .filter((p) => p.t > launch && p.t <= now && p.at !== birthAt)
      .sort((a, b) => Number(big(b.text)) - Number(big(a.text)));
    let room = phone ? 8 : Math.min(22, Math.floor(w / 90));
    const max = phone ? 20 : 30;
    for (const p of picks) {
      if (room <= 0) break;
      const text = p.text.length > max ? p.text.slice(0, max - 1).trimEnd() + '…' : p.text;
      if (place(p.at, pos(V2, p.t), normalAt(V2, p.t), String(yOf(p.at)), text, { cls: 'life', cell: p.at })) room--;
    }

    // A scatter of stars, steady for a given screen size.
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const stars = Array.from({ length: Math.round((w * h) / 11000) }, () => ({ x: rnd() * w, y: rnd() * h, r: 0.4 + rnd() * 0.8, o: 0.2 + rnd() * 0.45 }));

    let line1: string;
    if (born <= launch) { const a0 = Math.floor(launch - born); line1 = a0 < 1 ? 'Voyager 2 launched in August 1977, in your first year.' : `When Voyager 2 launched in August 1977, you were ${a0}.`; }
    else {
      const d = at(V2, born).d, yrs = Math.floor(born - launch);
      const leg = d < 5.3 ? 'on its way to Jupiter' : d < 9.6 ? 'between Jupiter and Saturn' : d < 19.1 ? 'between Saturn and Uranus' : d < 30.2 ? 'between Uranus and Neptune' : d < 119 ? 'past Neptune, bound for interstellar space' : 'in interstellar space';
      line1 = `You were born ${yrs < 1 ? 'in the first year of' : `${yrs} ${yrs === 1 ? 'year' : 'years'} into`} Voyager 2’s journey, when it was ${Math.round(d)} AU from the Sun, ${leg}.`;
    }
    return { fs, orbits, disc, sun, sunR, planets, path2, path1, shadow2, shadow1, plumbs, hp2, hp1, c2: craft(V2), c1: craft(V1), labels, stars, line1, phone };
  }, [s.birth?.y, s.birth?.m, cells, s.cells, w, h]);

  if (!s.birth) return <div className="grid-empty"><p>Your life, along Voyager 2’s journey.</p><p className="dim">Answer the first question and it appears here.</p></div>;
  const v = scene;
  return (
    <div className="voyager" ref={box}>
      {v && (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label="The solar system with Voyager 2’s path from launch to today, marked with moments from this life" style={{ ['--fs' as any]: `${v.fs}px` }}>
          <defs>
            <filter id="vg-rough" x="-2%" y="-2%" width="104%" height="104%">
              <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="5" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="2" />
            </filter>
            {v.planets.map((p) => (
              <radialGradient key={p.name} id={`vg-${p.name}`} cx={p.lx} cy={p.ly} r=".8">
                <stop offset="0" className="t-light" /><stop offset=".55" className="t-mid" /><stop offset="1" className="t-deep" />
              </radialGradient>))}
            <radialGradient id="vg-sun"><stop offset="0" className="t-light" /><stop offset="1" className="t-fine" /></radialGradient>
          </defs>
          {v.stars.map((st, i) => <circle key={i} cx={st.x} cy={st.y} r={st.r} className="f-fine" opacity={st.o} />)}
          <g filter="url(#vg-rough)" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={v.disc} className="f-fine" opacity=".07" />
            {v.orbits.map((o) => <path key={`f${o.a}`} d={o.far} className="s-fine" strokeWidth=".7" strokeOpacity=".45" />)}
            <path d={v.hp2.d} className="s-fine" strokeWidth=".9" strokeDasharray="2 5" />
            <path d={v.hp1.d} className="s-fine" strokeWidth=".9" strokeDasharray="2 5" />
            <path d={v.shadow1} className="s-fine" strokeWidth=".7" strokeDasharray="1 5" strokeOpacity=".7" />
            <path d={v.shadow2} className="s-fine" strokeWidth=".8" strokeDasharray="1 5" />
            {v.plumbs.map((p, i) => <path key={i} d={p.d} className="s-fine" strokeWidth=".7" strokeDasharray="1 3" />)}
            <path d={v.path1} className="s-fine" strokeWidth="1" />
            {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * 6.283, r0 = v.sunR + 2.5, r1 = v.sunR + (i % 2 ? 5 : 8); return <path key={i} d={`M${f(v.sun[0] + Math.cos(a) * r0)} ${f(v.sun[1] + Math.sin(a) * r0)}L${f(v.sun[0] + Math.cos(a) * r1)} ${f(v.sun[1] + Math.sin(a) * r1)}`} className="s-mid" strokeWidth=".8" />; })}
            <circle cx={v.sun[0]} cy={v.sun[1]} r={v.sunR} fill="url(#vg-sun)" className="s-mid" strokeWidth=".8" />
            {v.planets.map((p) => (
              <g key={p.name} transform={`translate(${f(p.c[0])} ${f(p.c[1])})`}>
                {p.ring && <ellipse rx={p.r * 1.95} ry={p.r * 0.55} transform="rotate(-16)" className="s-mid" strokeWidth="1" />}
                <circle r={p.r} fill={`url(#vg-${p.name})`} className="s-mid" strokeWidth=".7" />
                {p.ring && <path d={`M${f(-p.r * 1.95)} 0A${f(p.r * 1.95)} ${f(p.r * 0.55)} 0 0 0 ${f(p.r * 1.95)} 0`} transform="rotate(-16)" className="s-light" strokeWidth="1.3" />}
              </g>))}
            {v.orbits.map((o) => <path key={`n${o.a}`} d={o.near} className="s-mid" strokeWidth=".9" strokeOpacity=".7" />)}
            <path d={v.path2} className="s-dark" strokeWidth="1.5" />
            {[v.c1, v.c2].map((c, i) => (
              <g key={i} transform={`translate(${f(c.p[0])} ${f(c.p[1])}) rotate(${f(c.ang)}) scale(${i ? 1 : 0.8})`} className={i ? 's-dark' : 's-mid'} strokeWidth="1">
                <path d="M-11 0H2M2 -5.500Q6 0 2 5.500M2 -5.500V5.500M-3 0L-8 -8M-4 0L-7 6.500" />
                <circle cx="-8" cy="-8" r="1.200" />
              </g>))}
          </g>
          {v.plumbs.map((p, i) => p.year && !v.phone && <text key={i} x={p.foot[0]} y={p.foot[1] - 4} className="tick" textAnchor="middle">{p.year}</text>)}
          {v.labels.map((l) => (
            <g key={l.key} className={`vl ${l.cls || ''}${l.cell && onCell ? ' can' : ''}`} onClick={l.cell && onCell ? () => onCell(l.cell!) : undefined}>
              {l.cell && <title>{`${s.cells[l.cell]?.t} — ${fmt(l.cell)}`}</title>}
              <path d={`M${f(l.pt[0])} ${f(l.pt[1])}L${f(l.ax)} ${f(l.ay)}`} />
              <circle cx={l.pt[0]} cy={l.pt[1]} r={l.cls === 'you' ? 3.4 : 2.2} />
              <text x={l.tx} y={l.ay + v.fs * 0.34}>{l.lead && <tspan className="lead">{l.lead} </tspan>}<tspan className="rest">{l.rest}</tspan></text>
            </g>))}
        </svg>)}
      {v && <p className="sum">{v.line1}</p>}
      <p className="note">Distances are compressed so the planets and the far journey fit one view; positions are approximate.</p>
    </div>
  );
}
