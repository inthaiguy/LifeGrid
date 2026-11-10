import { useEffect, useRef, useState } from 'react';
import { type State, type YM, fresh, stats, toCSV, fmt, addM, homeAt, setBirth, MON, colorOf, places, short, inLife, yOf } from './model';
import { START, TOPICS, normalize, current, answer, skip, pending, goTopic, resume } from './script';
import { encode, decode } from './share';
import Grid from './Grid';
import { photosLink } from './photos';
import Question from './Question';

const KEY = 'life-grid';
const HKEY = 'life-grid-hist';
const loadHist = (): string[] => { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch { return []; } };
const saveHist = (h: string[]) => { try { localStorage.setItem(HKEY, JSON.stringify(h.slice(-80))); } catch { /* full or private */ } };
const load = (): State => {
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s.v === 1) return { ...s, changed: [] }; } } catch { /* start over */ }
  const s = fresh(START); normalize(s); return s;
};

const WIDE = '(min-width: 760px)';
const VIEWING = location.hash.startsWith('#s.'); // a shared link: read-only, nothing stored on this device

export default function App() {
  const [s, setS] = useState<State>(() => (VIEWING ? fresh([]) : load()));
  const [read, setRead] = useState(false);
  const [editing, setEditing] = useState<YM | null>(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [bad, setBad] = useState(false);
  const hist = useRef<string[]>(VIEWING ? [] : loadHist());
  const [open, setOpen] = useState(() => !s.done); // question panel; closed = grid fills the page
  // On a wide screen the questions live in the left shelf, docked beside the grid, instead of the bottom panel.
  const [wide, setWide] = useState(() => matchMedia(WIDE).matches);
  useEffect(() => { const m = matchMedia(WIDE), f = () => setWide(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  const [menu, setMenu] = useState(() => !VIEWING && matchMedia(WIDE).matches && !s.done);
  const t0 = useRef<[number, number]>([0, 0]);
  const [fs, setFs] = useState(false);
  useEffect(() => { const f = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f); }, []);
  const toggleFs = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().then(() => setMenu(false)).catch(() => {}); };
  const swipe = (dir: 1 | -1, fn: () => void) => ({
    onTouchStart: (e: React.TouchEvent) => { t0.current = [e.touches[0].clientX, e.touches[0].clientY]; },
    onTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - t0.current[0], dy = e.changedTouches[0].clientY - t0.current[1];
      if (dy * dir > 40 && Math.abs(dy) > Math.abs(dx) * 1.5) fn();
    },
  });

  useEffect(() => {
    const h = location.hash.slice(1);
    if (VIEWING) { decode(h.slice(2)).then((p) => { if (!p) return setBad(true); const { t, ...g } = p; setS((cur) => ({ ...cur, ...g, done: true })); }); return; }
    // An owner's own address also opens as a finished grid, but never over a grid already on this device.
    if (!h || localStorage.getItem(KEY)) return;
    decode(h).then((p) => { if (!p) return; const { t, ...g } = p; const d: State = { ...structuredClone(s), ...g, queue: [], done: true }; if (t?.length) resume(d, t); setS(d); if (!d.done) { setOpen(true); setMenu(matchMedia(WIDE).matches); } });
  }, []);

  useEffect(() => {
    document.title = s.name ? `${s.name}’s Life` : 'Life Grid';
    if (VIEWING) return;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
    if (s.birth) encode(s).then((h) => { history.replaceState(null, '', '#' + h); setLink(location.origin + location.pathname + '#s.' + h); }).catch(() => {});
    if (import.meta.env.DEV && s.birth) fetch('/__save', { method: 'POST', body: JSON.stringify(s) }).catch(() => {});
  }, [s]);

  const commit = (fn: (d: State) => void) => {
    hist.current.push(JSON.stringify(s));
    if (hist.current.length > 300) hist.current.shift();
    saveHist(hist.current);
    history.pushState(null, '', location.href); // so the browser's back swipe steps back one answer
    const d = structuredClone(s); d.changed = []; fn(d); setS(d);
  };
  const back = () => { const prev = hist.current.pop(); saveHist(hist.current); if (prev) setS({ ...JSON.parse(prev), changed: [] }); };

  const st = stats(s);
  const view = !s.done && !s.conflicts.length ? current(s) : null;
  const conflict = s.conflicts[0];
  const last = s.changed[0];
  const asking = !VIEWING && (!!view || !!conflict); // there is something for the bottom panel to show
  const panel = asking && open && !wide;
  const docked = wide && menu;

  // With the questions put away, the back swipe (from the left edge) brings them back instead of undoing.
  const onPop = useRef(() => {}); onPop.current = () => { if (asking && !(wide ? menu : open)) { history.pushState(null, '', location.href); wide ? setMenu(true) : setOpen(true); } else back(); };
  useEffect(() => {
    if (VIEWING) return;
    const f = () => onPop.current();
    history.pushState(null, '', location.href); addEventListener('popstate', f); return () => removeEventListener('popstate', f);
  }, []);

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([toCSV(s)], { type: 'text/csv' }));
    a.download = 'life-grid.csv'; a.click();
  };
  const title = s.name ? `${s.name}’s Life` : 'Life Grid';
  const todo = pending(s);
  const answered = s.log.filter((l) => l.a).length;

  const ask = conflict ? (
          <div className="q">
            <div className="stage"><span>One headline per month</span></div>
            <h2>{fmt(conflict.at)} already says “{conflict.old}”. You just added “{conflict.neu}”.</h2>
            <div className="actions wrap">
              <button className="ghost" onClick={() => commit((d) => { d.conflicts.shift(); })}>Keep “{conflict.old}”</button>
              <button className="ghost" onClick={() => commit((d) => { const c = d.conflicts.shift()!; d.cells[c.at] = { t: c.neu }; d.changed.push(c.at); })}>Use “{conflict.neu}”</button>
              {[1, -1].map((n) => { const at = addM(conflict.at, n); const c = s.cells[at]; return inLife(s, at) && (!c || c.p) ? (
                <button key={n} className="ghost" onClick={() => commit((d) => { const c = d.conflicts.shift()!; d.cells[at] = { t: c.neu }; d.changed.push(at); })}>Put new one in {fmt(at)}</button>) : null; })}
            </div>
          </div>
        ) : (
          <Question key={s.log.length} s={s} view={view!} onSubmit={(v) => commit((d) => answer(d, v))} onSkip={() => commit(skip)} onBack={hist.current.length ? back : undefined} />
        );

  if (bad) return <div className="app"><div className="grid-empty"><p>This link couldn’t be opened.</p><p className="dim">It may have been cut short when it was copied.</p></div></div>;

  return (
    <div className={`app${VIEWING ? ' viewing' : ''}${docked ? ' docked' : ''}${fs ? ' fs' : ''}`}>
      <header>
        {!VIEWING && <button className="icon" onClick={() => setMenu(!menu)} aria-label="Menu"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>}
        <h1>{title}</h1>
        {s.birth && panel && <div className="meter" title="Confirmed cells out of months lived"><b>{st.pct}%</b><span>{st.filled}{st.placeholders ? ` + ${st.placeholders}?` : ''} / {st.total}</span></div>}
        <button className="icon" onClick={() => setRead(!read)} disabled={!s.birth} aria-label={read ? 'Overview' : 'Read the words'} title={read ? 'Overview' : 'Read the words'}>
          <svg viewBox="0 0 24 24" width="24" height="24">{read
            ? <path d="M4 5h4v4H4zM10 5h4v4h-4zM16 5h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 15h4v4H4zM10 15h4v4h-4zM16 15h4v4h-4z" />
            : <path d="M4 6h16M4 10h11M4 14h16M4 18h9" />}</svg>
        </button>
        {document.fullscreenEnabled && (
          <button className="icon" onClick={toggleFs} aria-label={fs ? 'Exit full screen' : 'Full screen'} title={fs ? 'Exit full screen' : 'Full screen'}>
            <svg viewBox="0 0 24 24" width="22" height="22">{fs
              ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}</svg>
          </button>)}
      </header>

      <div className={`body${panel ? ' asking' : ''}`}>
        <main><Grid s={s} read={read} full={!panel} onCell={VIEWING ? undefined : setEditing} /></main>
        {s.birth && (
          <aside className="legend">
            {places(s).map((p) => <span key={p}><i style={{ background: colorOf(s, p) }} />{short(p)}</span>)}
            {!VIEWING && menu && st.placeholders > 0 && <span className="key"><i className="k-ph" />to confirm</span>}
          </aside>)}
      </div>

      {last && panel && (
        <div className="ticker" key={last + s.log.length}>
          <b>{fmt(last)}</b> {s.cells[last]?.t}{s.changed.length > 1 && <em> +{s.changed.length - 1} more cells</em>}
        </div>)}

      {asking && !open && !wide && (
        <button className="peek" onClick={() => setOpen(true)} {...swipe(-1, () => setOpen(true))} aria-label="Show questions">
          <i /><span>{conflict ? 'One to settle' : <>Continue <b>· {view!.stage}</b></>}</span>
        </button>)}
      {panel && (
      <section className="panel" {...swipe(1, () => setOpen(false))}>
        <button className="grab" onClick={() => setOpen(false)} aria-label="Hide questions"><i /></button>
        {ask}
      </section>)}

      {editing && <CellEditor s={s} at={editing} onClose={() => setEditing(null)}
        onSave={(t) => { commit((d) => { if (t.trim()) d.cells[editing] = { t: t.trim() }; else delete d.cells[editing]; d.changed.push(editing); }); setEditing(null); }} />}

      {!VIEWING && (
        <div className={`scrim side${menu ? ' show' : ''}`} onClick={() => setMenu(false)} aria-hidden={!menu}>
          <nav className="shelf" onClick={(e) => e.stopPropagation()}>
            <div className="shelf-head"><h3>{title}</h3><button className="ghost sm" onClick={() => setMenu(false)} aria-label="Close menu">✕</button></div>
            {s.birth ? (
              <div className="stats">
                <b>{st.pct}%</b>
                <p>{st.filled} {st.filled === 1 ? 'month' : 'months'} filled{st.placeholders ? `, ${st.placeholders} to confirm` : ''}, {st.total - st.filled - st.placeholders} empty.</p>
                {s.log.length > 0 && <p className="dim">{s.done ? 'Setup complete. ' : ''}{answered} {answered === 1 ? 'question' : 'questions'} answered, {s.log.length - answered} skipped.</p>}
              </div>
            ) : <p className="help">Answer the first question to start your grid.</p>}
            {asking && wide && <div className="shelf-q">{ask}</div>}
            {asking && !wide && <button className="primary" onClick={() => { setOpen(true); setMenu(false); }}>{conflict ? 'Settle one month' : `Continue · ${view!.stage}`}</button>}
            {s.birth && (
              <div className="field"><label>{todo.length ? 'Questions — pick up any topic' : 'Questions — go back to any topic'}</label>
                <div className="topics">
                  {TOPICS.map((n) => <button key={n} className={`chip${view?.stage === n ? ' cur' : todo.includes(n) ? ' todo' : ''}`}
                    onClick={() => { commit((d) => goTopic(d, n)); setOpen(true); if (!wide) setMenu(false); }}>{n}</button>)}
                </div>
                <p className="dim small"><i className="dot" /> still has questions waiting</p>
              </div>)}

            {s.birth && (
              <details className="more"><summary>Name and birth date</summary>
            <div className="field"><label>First name</label>
              <input type="text" autoCapitalize="words" maxLength={30} defaultValue={s.name || ''} key={s.id}
                onBlur={(e) => { const n = e.target.value.trim(); if (n !== (s.name || '')) setS({ ...s, name: n || undefined, changed: [] }); }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLElement).blur(); }} /></div>
            <BirthFix s={s} onSave={(y, m) => { commit((d) => setBirth(d, y, m)); if (!wide) setMenu(false); }} />

              </details>)}
            {s.birth && <div className="field"><label>Share link — read-only, shows everything in the grid</label>
              <div className="ymf two">
                <input readOnly value={link} onFocus={(e) => e.target.select()} />
                <button className="ghost" onClick={() => { navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>{copied ? 'Copied' : 'Copy'}</button>
              </div></div>}
            <span className="grow" />
            {s.birth && <button className="link" onClick={download}>Download CSV</button>}
            {hist.current.length > 0 && !(asking && wide) && <button className="link" onClick={back}>Undo last change</button>}
            {s.birth && <button className="ghost danger" onClick={() => { if (confirm('Erase this grid and start over?')) { localStorage.removeItem(KEY); localStorage.removeItem(HKEY); history.replaceState(null, '', location.pathname); hist.current = []; const n = fresh(START); normalize(n); setS(n); setOpen(true); setMenu(wide); } }}>Start over</button>}
          </nav>
        </div>)}
    </div>
  );
}

function CellEditor({ s, at, onClose, onSave }: { s: State; at: YM; onClose: () => void; onSave: (t: string) => void }) {
  const cur = s.cells[at];
  const [t, setT] = useState(cur?.t || '');
  const home = homeAt(s, at);
  return (
    <div className="scrim" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSave(t); }}>
        <h3>{fmt(at)} <span className="dim">· age {yOf(at) - s.birth!.y}{home ? ` · ${short(home)}` : ''}</span> <a className="photos" href={photosLink(at)} target="_blank" rel="noopener noreferrer" title={`Your Google Photos from ${fmt(at)}`} aria-label={`Your Google Photos from ${fmt(at)}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="#ea4335" d="M12 2a5 5 0 0 1 5 5v5h-5z" /><path fill="#4285f4" d="M22 12a5 5 0 0 1-5 5h-5v-5z" />
            <path fill="#34a853" d="M12 22a5 5 0 0 1-5-5v-5h5z" /><path fill="#fbbc04" d="M2 12a5 5 0 0 1 5-5h5v5z" />
          </svg>
        </a></h3>
        {cur?.p && <p className="help">Filled in automatically. Save to confirm it, or change it.</p>}
        <input autoFocus type="text" autoCapitalize="words" maxLength={40} placeholder="Biggest event this month?" value={t} onChange={(e) => setT(e.target.value)} />
        <div className="actions wrap">
          {cur && <button type="button" className="ghost danger" onClick={() => onSave('')}>Clear</button>}
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">{cur?.p ? 'Confirm' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function BirthFix({ s, onSave }: { s: State; onSave: (y: number, m: number) => void }) {
  const [m, setM] = useState(String(s.birth!.m));
  const [y, setY] = useState(String(s.birth!.y));
  const ok = +y > 1900 && +y <= new Date().getFullYear() && (+y !== s.birth!.y || +m !== s.birth!.m);
  return (
    <div className="field fix">
      <label>Born — change if it’s wrong</label>
      <div className="ymf">
        <select value={m} onChange={(e) => setM(e.target.value)} aria-label="Birth month">{MON.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
        <input inputMode="numeric" pattern="[0-9]*" maxLength={4} value={y} onChange={(e) => setY(e.target.value.replace(/\D/g, ''))} aria-label="Birth year" />
        <button type="button" className="ghost" disabled={!ok} onClick={() => onSave(+y, +m)}>Update</button>
      </div>
    </div>
  );
}
