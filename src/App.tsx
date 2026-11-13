import { useEffect, useRef, useState } from 'react';
import { type State, type YM, fresh, stats, toCSV, toJSON, fmt, addM, homeAt, setBirth, MON, colorOf, places, short, inLife, yOf, ym , nowYM } from './model';
import { START, TOPICS, normalize, current, answer, skip, begin, pending, goTopic, resume } from './script';
import { encode, decode } from './share';
import Grid from './Grid';
import Timeline from './Timeline';
import Tree from './Tree';
import Voyager from './Voyager';
import { parseSheet, type Parsed } from './import';
import { photosLink, googleCalLink, appleCalLink, gmailLink, GMAIL_START, IS_IOS } from './photos';
import { NOFILL } from './nofill';
import Question from './Question';
import Welcome from './Welcome';
import Coach from './Coach';
import { VIEWS, type ViewId, unlockedViews, nextView, FIRST_UNLOCK } from './views';
import { sparkle, soundOn, setSound } from './sound';
import { THEMES, applyTheme, savedTheme } from './theme';

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

// navigator.clipboard only exists on https and localhost; over plain http (a LAN or Tailscale
// address) fall back to selecting a hidden textarea and using the old copy command.
async function copyText(text: string): Promise<boolean> {
  try { if (navigator.clipboard) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall through */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.readOnly = true; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* not supported */ }
  ta.remove();
  return ok;
}

export default function App() {
  const [s, setS] = useState<State>(() => (VIEWING ? fresh([]) : load()));
  const [read, setRead] = useState(false);
  const [mode, setMode] = useState<ViewId>('grid'); // the sheet, or the same events as a timeline
  const [editing, setEditing] = useState<YM | null>(null);
  const [importing, setImporting] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState('');
  const own = link.replace('#s.', '#'); // the owner link: opens the grid for editing
  const mail = (subject: string, body: string) => `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const sendLink = (t: string) => { if (typeof navigator.share === 'function') navigator.share({ title: 'My Life Grid', url: t }).catch(() => {}); else doCopy(t === own ? 'own' : 'share', t); }; // the phone's share sheet, or copy where there is none
  const doCopy = (k: string, t: string) => { copyText(t).then((ok) => { if (!ok) return; setCopied(k); setTimeout(() => setCopied(''), 1500); }); };
  const [bad, setBad] = useState(false);
  const hist = useRef<string[]>(VIEWING ? [] : loadHist());
  // Questions live in the left shelf at every size. On a wide screen it docks beside the grid; on a phone it slides over it.
  const [wide, setWide] = useState(() => matchMedia(WIDE).matches);
  useEffect(() => { const m = matchMedia(WIDE), f = () => setWide(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  const [theme, setTheme] = useState(savedTheme);
  const [coach, setCoach] = useState(false); // the closing note after the first cell lands
  const [toast, setToast] = useState('');
  const [sound, setSoundState] = useState(soundOn);
  const [menu, setMenu] = useState(false); // always closed on load; a badge on the menu button shows when questions are waiting
  // A brand-new sheet opens with the welcome flow instead of the question shelf.
  const [intro, setIntro] = useState(() => !VIEWING && !s.birth && s.log.length === 0 && !location.hash);
  const t0 = useRef<[number, number]>([0, 0]);
  const [fs, setFs] = useState(false);
  useEffect(() => { const f = () => setFs(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f); }, []);
  const toggleFs = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().then(() => setMenu(false)).catch(() => {}); };
  // A sideways swipe: to the left on the shelf puts it away.
  const swipe = (dir: 1 | -1, fn: () => void) => ({
    onTouchStart: (e: React.TouchEvent) => { t0.current = [e.touches[0].clientX, e.touches[0].clientY]; },
    onTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - t0.current[0], dy = e.changedTouches[0].clientY - t0.current[1];
      if (dx * dir > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) fn();
    },
  });

  useEffect(() => {
    const h = location.hash.slice(1);
    if (VIEWING) { decode(h.slice(2)).then((p) => { if (!p) return setBad(true); const { t, ...g } = p; setS((cur) => ({ ...cur, ...g, done: true })); }); return; }
    // An owner's own address also opens as a finished grid, but never over a grid already on this device.
    if (!h || localStorage.getItem(KEY)) return;
    decode(h).then((p) => { if (!p) return; const { t, ...g } = p; const d: State = { ...structuredClone(s), ...g, queue: [], done: true }; if (t?.length) resume(d, t); setS(d); if (!d.done) { setMenu(true); } });
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
    const d = structuredClone(s); d.changed = []; fn(d);
    const was = unlockedViews(stats(s).pct), now = unlockedViews(stats(d).pct);
    if (now.length > was.length) { // something new to try
      const fresh = now.slice(was.length);
      sparkle(); setToast(fresh.length === 1 ? `New view unlocked: ${fresh[0].name}` : `${fresh.length} new views unlocked`);
      setTimeout(() => setToast(''), 4500);
    }
    setS(d);
  };
  const back = () => { const prev = hist.current.pop(); saveHist(hist.current); if (prev) setS({ ...JSON.parse(prev), changed: [] }); };

  const st = stats(s);
  const open = VIEWING ? VIEWS : unlockedViews(st.pct); // a shared link shows every view
  const ids = open.map((v) => v.id);
  const nextMode: ViewId = ids[(ids.indexOf(mode) + 1) % ids.length] ?? 'grid';
  const upcoming = VIEWING ? undefined : nextView(st.pct);
  useEffect(() => { if (!ids.includes(mode)) setMode('grid'); }, [st.pct]); // a view that is no longer unlocked falls back to the grid
  const view = !s.done && !s.conflicts.length ? current(s) : null;
  const conflict = s.conflicts[0];
  const last = s.changed[0];
  const asking = !VIEWING && (!!view || !!conflict); // there is a question for the shelf to show
  const docked = wide && menu;

  // With the questions put away, the back swipe (from the left edge) brings them back instead of undoing.
  const onPop = useRef(() => {}); onPop.current = () => { if (intro) { history.pushState(null, '', location.href); return; } if (asking && !menu) { history.pushState(null, '', location.href); setMenu(true); } else back(); };
  useEffect(() => {
    if (VIEWING) return;
    const f = () => onPop.current();
    history.pushState(null, '', location.href); addEventListener('popstate', f); return () => removeEventListener('popstate', f);
  }, []);

  const save = (body: string, type: string, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type }));
    a.download = name; a.click();
  };
  const download = () => save(toCSV(s), 'text/csv', 'life-grid.csv');
  const downloadJSON = () => save(toJSON(s), 'application/json', 'life-grid.json');
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
        {!VIEWING && <button className={`icon${asking && !menu ? ' todo' : ''}`} onClick={() => { if (intro) setIntro(false); setCoach(false); setMenu(!menu); }} aria-label={asking && !menu ? 'Menu — questions waiting' : 'Menu'}><svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>}
        <h1>{title}</h1>
        {!intro && <>
        <button className="icon" onClick={() => setMode(nextMode)} disabled={!s.birth || ids.length < 2} aria-label={ids.length < 2 ? `Other views unlock at ${FIRST_UNLOCK}%` : `Switch to ${VIEWS.find((v) => v.id === nextMode)!.name}`} title={ids.length < 2 ? `Other views unlock at ${FIRST_UNLOCK}% filled in` : `Switch to ${VIEWS.find((v) => v.id === nextMode)!.name}`}>
          <svg viewBox="0 0 24 24" width="24" height="24">{nextMode === 'h'
            ? <path d="M3 12h18M7 12v-5M12 12v-7M17 12v-4M7 12a.6.6 0 1 0 .01 0M12 12a.6.6 0 1 0 .01 0M17 12a.6.6 0 1 0 .01 0" />
            : nextMode === 'hw'
              ? <path d="M3 12h18M7 12v-5M12 12v-7M17 12v-4M9.5 12v5M14.5 12v6" />
            : nextMode === 'voyager'
              ? <path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0M3 15.500c3 2.500 15 -2.500 18 -7M4 4.500l.01 0M19 18.500l.01 0M17.500 4l.01 0" />
            : nextMode === 'tree'
              ? <path d="M12 21v-8M12 13c-5 0-7.5-2.4-7.5-5.4C4.500 4.800 6.800 3 9.300 3.600 10 2.600 11 2.200 12 2.200s2 .4 2.700 1.400c2.500-.6 4.800 1.200 4.800 4 0 3-2.500 5.400-7.500 5.400zM12 17l3-2.500M8.500 21h7" />
            : nextMode === 'v'
              ? <path d="M7 3v18M7 7h5M7 12h9M7 17h6" />
              : <path d="M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" />}</svg>
        </button>
        {mode === 'grid' && <button className="icon" onClick={() => setRead(!read)} disabled={!s.birth} aria-label={read ? 'Overview' : 'Read the words'} title={read ? 'Overview' : 'Read the words'}>
          <svg viewBox="0 0 24 24" width="24" height="24">{read
            ? <path d="M4 5h4v4H4zM10 5h4v4h-4zM16 5h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 15h4v4H4zM10 15h4v4h-4zM16 15h4v4h-4z" />
            : <path d="M4 6h16M4 10h11M4 14h16M4 18h9" />}</svg>
        </button>}
        {document.fullscreenEnabled && (
          <button className="icon" onClick={toggleFs} aria-label={fs ? 'Exit full screen' : 'Full screen'} title={fs ? 'Exit full screen' : 'Full screen'}>
            <svg viewBox="0 0 24 24" width="22" height="22">{fs
              ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}</svg>
          </button>)}
        </>}
      </header>

      <div className={`body${intro ? ' intro' : ''}`}>
        {intro && <Welcome
          onCommit={(v) => commit((d) => begin(d, v))}
          onFinish={() => { setIntro(false); setCoach(true); }}
          onImport={() => { setIntro(false); setImporting(true); }}
          onSkip={() => { setIntro(false); setMenu(true); }} />}
        <main>{mode === 'grid'
          ? <Grid s={s} read={read} full onCell={VIEWING ? undefined : setEditing} />
          : mode === 'voyager'
            ? <Voyager s={s} onCell={VIEWING ? undefined : setEditing} />
          : mode === 'tree'
            ? <Tree s={s} onCell={VIEWING ? undefined : setEditing} />
            : <Timeline s={s} dir={mode === 'v' ? 'v' : 'h'} world={mode === 'hw'} onCell={VIEWING ? undefined : setEditing} />}</main>
        {s.birth && mode !== 'h' && mode !== 'hw' && mode !== 'voyager' && ( // the horizontal timeline names each home on its own band
          <aside className="legend">
            {places(s).map((p) => <span key={p}><i style={{ background: colorOf(s, p) }} />{short(p)}</span>)}
            {!VIEWING && menu && st.placeholders > 0 && <span className="key"><i className="k-ph" />to confirm</span>}
          </aside>)}
      </div>

      {coach && !intro && <Coach onClose={() => { setCoach(false); setMenu(true); }}
        lines={['This is your life grid.', 'You can manually fill in the cells, or answer our questions.', `Once you fill in over ${FIRST_UNLOCK}% you’ll unlock other views.`]} />}
      {toast && <div className="toast" role="status">{toast}</div>}

      {importing && <Importer s={s} onClose={() => setImporting(false)} onImport={(p, birth) => {
        commit((d) => {
          // A new grid: answer the birth question first, so the script carries on from there.
          if (!d.birth && birth) { normalize(d); answer(d, { name: '', when: birth.when, place: birth.place }); }
          if (!d.birth) return;
          const from = ym(d.birth.y, d.birth.m);
          for (const [at, c] of Object.entries(p.cells)) {
            const cur = d.cells[at];
            if (at < from || (cur && !cur.p)) continue; // outside the life, or already confirmed here: keep what the user wrote
            if (cur && c.p) continue;                    // a placeholder never replaces a placeholder
            d.cells[at] = c; d.changed.push(at);
          }
          // From a JSON export: add homes and stays that aren't here yet.
          if (!d.name && p.name) d.name = p.name;
          if (!d.birth.d && p.birthDay && ym(d.birth.y, d.birth.m) === p.first) d.birth.d = p.birthDay;
          if (!d.death && p.death) d.death = p.death;
          for (const h of p.homes || []) if (h.from >= from && !d.homes.some((x) => x.from === h.from)) d.homes.push(h);
          d.homes.sort((a, b) => a.from.localeCompare(b.from));
          for (const x of p.stays || []) if (x.from >= from && !d.stays.some((y) => y.from === x.from && y.to === x.to)) d.stays.push(x);
        });
        setImporting(false); setMenu(false);
      }} />}

      {editing && <CellEditor s={s} at={editing} onClose={() => setEditing(null)}
        onSave={(t) => { commit((d) => { if (t.trim()) d.cells[editing] = { t: t.trim() }; else delete d.cells[editing]; d.changed.push(editing); }); setEditing(null); }} />}

      {!VIEWING && (
        <div className={`scrim side${menu ? ' show' : ''}`} onClick={() => setMenu(false)} aria-hidden={!menu}>
          <nav className="shelf" onClick={(e) => e.stopPropagation()} {...swipe(-1, () => setMenu(false))}>
            <div className="shelf-head"><h3>{title}</h3><button className="ghost sm" onClick={() => setMenu(false)} aria-label="Close menu">✕</button></div>
            {s.birth ? (
              <div className="stats">
                <b>{st.pct}%</b>
                <p>{st.filled} {st.filled === 1 ? 'month' : 'months'} filled{st.placeholders ? `, ${st.placeholders} to confirm` : ''}, {st.total - st.filled - st.placeholders} empty.</p>
                {s.log.length > 0 && <p className="dim">{s.done ? 'Setup complete. ' : ''}{answered} {answered === 1 ? 'question' : 'questions'} answered, {s.log.length - answered} skipped.</p>}
              </div>
            ) : <p className="help">Answer the first question to start your grid.</p>}
            {s.birth && (
              <div className="field"><label>Views — unlocked as your grid fills in</label>
                <div className="views">
                  {VIEWS.map((v) => { const ok = st.pct >= v.at; return (
                    <button key={v.id} disabled={!ok} className={`chip${ok ? '' : ' locked'}${ok && v.id === mode ? ' here' : ''}`}
                      title={ok ? `Show the ${v.name.toLowerCase()}` : `Unlocks at ${v.at}% filled in`}
                      onClick={() => { setMode(v.id); if (!wide) setMenu(false); }}>{v.name}{!ok && <em className="dim"> {v.at}%</em>}</button>); })}
                </div>
                {upcoming ? (<>
                  <div className="unlock-meter" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, ((st.pct - open[open.length - 1].at) / (upcoming.at - open[open.length - 1].at)) * 100))}%` }} /></div>
                  <p className="dim small">Next: {upcoming.name} unlocks at {upcoming.at}%. You’re at {st.pct}%.</p>
                </>) : <p className="dim small">Every view is unlocked.</p>}
              </div>)}
            {asking && <div className="shelf-q">{ask}</div>}
            {asking && !wide && last && ( // on a phone the shelf covers the grid, so say what the last answer filled in
              <p className="landed" key={last + s.log.length}><b>{fmt(last)}</b> {s.cells[last]?.t}{s.changed.length > 1 && <em> +{s.changed.length - 1} more</em>} <button className="link" onClick={() => setMenu(false)}>See the grid</button></p>)}
            {s.birth && (
              <div className="field"><label>{todo.length ? 'Questions — pick up any topic' : 'Questions — go back to any topic'}</label>
                <div className="topics">
                  {TOPICS.map((n) => <button key={n} className={`chip${view?.stage === n ? ' cur' : todo.includes(n) ? ' todo' : ''}`}
                    onClick={() => { commit((d) => goTopic(d, n)); }}>{n}</button>)}
                </div>
                <p className="dim small"><i className="dot" /> still has questions waiting</p>
              </div>)}

            {s.birth && (
              <details className="more"><summary>Name and birth date</summary>
            <div className="field"><label>First name</label>
              <input {...NOFILL} type="text" autoCapitalize="words" maxLength={30} defaultValue={s.name || ''} key={s.id}
                onBlur={(e) => { const n = e.target.value.trim(); if (n !== (s.name || '')) setS({ ...s, name: n || undefined, changed: [] }); }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLElement).blur(); }} /></div>
            <BirthFix s={s} onSave={(y, m) => { commit((d) => setBirth(d, y, m)); if (!wide) setMenu(false); }} />
            <DeathFix s={s} onSave={(death) => { commit((d) => { d.death = death; }); if (!wide) setMenu(false); }} />

              </details>)}
            <details className="more"><summary>Appearance</summary>
              <div className="field"><label>Theme</label>
                <div className="themes">
                  {THEMES.map((th) => (
                    <button key={th.id} className={`theme${th.id === theme ? ' cur' : ''}`} aria-pressed={th.id === theme} title={th.description}
                      onClick={() => setTheme(applyTheme(th.id))}>
                      {th.name}
                      {th.ramp && <span className="swatch" aria-hidden="true">{th.ramp.map((c) => <i key={c} style={{ background: c }} />)}</span>}
                    </button>))}
                </div>
                <label className="chk"><input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); setSoundState(e.target.checked); }} /> Sounds</label>
                <p className="dim small">Saved on this device only. Shared links carry your data, not your theme. Some themes load fonts from Google Fonts.</p>
              </div>
            </details>
            {s.birth && (
              <details className="more"><summary>Save your progress</summary>
                <div className="field"><label>Your link — it holds your whole grid, and it’s yours to edit</label>
                  <div className="ymf two">
                    <input {...NOFILL} readOnly value={own} onFocus={(e) => e.target.select()} />
                    <button className="ghost" onClick={() => doCopy('own', own)}>{copied === 'own' ? 'Copied' : 'Copy'}</button>
                    <button className="icon" aria-label="Share" title="Share" onClick={() => sendLink(own)}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" /></svg></button>
                  </div>
                  <div className="acts">
                    <a className="link" href={mail('My Life Grid', `Keep this link to come back to my life grid:\n\n${own}`)}>Email it to myself</a>
                    <button className="link" onClick={downloadJSON}>Download JSON</button>
                    <button className="link" onClick={download}>Download CSV</button>
                  </div>
                  <p className="dim small">Nothing is stored on our servers. Bookmark this page or add it to your home screen, and save the link again after a big session — it changes as you add cells. Keep it private: anyone with it can edit.</p>
                </div>
              </details>)}
            {s.birth && (
              <details className="more"><summary>Share your grid</summary>
                <div className="field"><label>Share link — read-only, shows everything in the grid</label>
                  <div className="ymf two">
                    <input {...NOFILL} readOnly value={link} onFocus={(e) => e.target.select()} />
                    <button className="ghost" onClick={() => doCopy('share', link)}>{copied === 'share' ? 'Copied' : 'Copy'}</button>
                    <button className="icon" aria-label="Share" title="Share" onClick={() => sendLink(link)}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" /></svg></button>
                  </div>
                  <div className="acts">
                    <a className="link" href={mail('My Life Grid', `Here’s my life grid:\n\n${link}`)}>Send by email</a>
                  </div>
                  <p className="dim small">Anyone with this link can look, but not change anything.</p>
                </div>
              </details>)}
            <span className="grow" />
            <button className="link" onClick={() => setImporting(true)}>{s.birth ? 'Import a sheet' : 'Already have a life sheet? Import it'}</button>
            {hist.current.length > 0 && !asking && <button className="link" onClick={back}>Undo last change</button>}
            {s.birth && <button className="ghost danger" onClick={() => { if (confirm('Erase this grid and start over?')) { localStorage.removeItem(KEY); localStorage.removeItem(HKEY); history.replaceState(null, '', location.pathname); hist.current = []; const n = fresh(START); normalize(n); setS(n); setMenu(true); } }}>Start over</button>}
          </nav>
        </div>)}
    </div>
  );
}

/** Bring in a life sheet kept elsewhere: pasted cells from Google Sheets or Excel, or a CSV file. */
function Importer({ s, onClose, onImport }: { s: State; onClose: () => void; onImport: (p: Parsed, birth?: { when: YM; place: string }) => void }) {
  const [text, setText] = useState('');
  const p = text.trim() ? parseSheet(text) : null;
  const [bm, setBm] = useState(''), [by, setBy] = useState(''), [place, setPlace] = useState('');
  // Prefill the birth fields from the sheet the first time it parses.
  const seen = useRef('');
  useEffect(() => {
    if (!p || s.birth || seen.current === p.first) return;
    seen.current = p.first; setBy(p.first.slice(0, 4)); setBm(String(+p.first.slice(5, 7))); if (p.bornPlace) setPlace(p.bornPlace);
  }, [p, s.birth]);
  const kept = p && s.birth ? Object.keys(p.cells).filter((at) => s.cells[at] && !s.cells[at].p).length : 0;
  const birthOk = !!s.birth || (/^(18|19|20)\d\d$/.test(by) && !!bm && !!place.trim());
  const file = (f?: File) => { if (f) f.text().then(setText); };
  return (
    <div className="scrim" onClick={onClose}>
      <form className="sheet importer" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (p && birthOk) onImport(p, s.birth ? undefined : { when: ym(+by, +bm), place: place.trim() }); }}>
        <h3>Import a life sheet</h3>
        <p className="help">One row per year, one column per month. Copy the cells from Google Sheets or Excel and paste them here, or choose a CSV file or a Life Grid JSON export. Nothing leaves this device.</p>
        <textarea {...NOFILL} rows={5} placeholder="Paste your sheet here" value={text} onChange={(e) => setText(e.target.value)} />
        <input type="file" accept=".csv,.tsv,.txt,.json,text/csv,text/plain,application/json" onChange={(e) => file(e.target.files?.[0])} />
        {text.trim() && !p && <p className="warn">Couldn’t read that. For a sheet, include the year column and, if you have one, the row of month names. For JSON, use a file downloaded from Life Grid.</p>}
        {p && <p className="found"><b>{p.count} {p.count === 1 ? 'entry' : 'entries'}</b> found, {p.firstYear}–{p.lastYear}.{kept > 0 && ` ${kept} already filled here will be kept as they are.`}</p>}
        {p && !s.birth && (
          <div className="field"><label>Born</label>
            <div className="ymf">
              <select {...NOFILL} value={bm} onChange={(e) => setBm(e.target.value)} aria-label="Birth month"><option value="">Month</option>{MON.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
              <input {...NOFILL} inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="Year" value={by} onChange={(e) => setBy(e.target.value.replace(/\D/g, ''))} aria-label="Birth year" />
            </div>
            <input {...NOFILL} type="text" autoCapitalize="words" maxLength={60} placeholder="Birthplace: City, State or Country" value={place} onChange={(e) => setPlace(e.target.value)} />
            <p className="dim small">Homes aren’t read from the sheet (colours don’t survive copying). The Homes questions follow the import.</p>
          </div>)}
        <div className="actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button className="primary" disabled={!p || !birthOk}>Import{p ? ` ${p.count}` : ''}</button>
        </div>
      </form>
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
        </a>
          {/* Experiment: calendar links for the month. Both addresses are undocumented. */}
          <a className="photos" href={googleCalLink(at)} target="_blank" rel="noopener noreferrer" title={`Google Calendar, ${fmt(at)}`} aria-label={`Google Calendar, ${fmt(at)}`}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" fill="#fff" stroke="#4285f4" strokeWidth="2.4" /><text x="12" y="16.2" textAnchor="middle" fontSize="9.5" fontWeight="700" fontFamily="system-ui, sans-serif" fill="#4285f4">31</text></svg>
          </a>
          {at >= GMAIL_START && (
            <a className="photos" href={gmailLink(at)} target="_blank" rel="noopener noreferrer" title={`Gmail, ${fmt(at)}`} aria-label={`Gmail, ${fmt(at)}`}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="#fff" stroke="#c9c9ce" strokeWidth="1" /><path d="M4.5 7.5 12 13l7.5-5.5V17M4.5 17V7.5" fill="none" stroke="#ea4335" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" /></svg>
            </a>)}
          {IS_IOS && (
            <a className="photos" href={appleCalLink(at)} title={`Apple Calendar, ${fmt(at)}`} aria-label={`Apple Calendar, ${fmt(at)}`}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="#fff" stroke="#c9c9ce" strokeWidth="1" /><path d="M3 9V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2z" fill="#ff3b30" /><text x="12" y="18.2" textAnchor="middle" fontSize="8.5" fontWeight="600" fontFamily="system-ui, sans-serif" fill="#1c1c1e">1</text></svg>
            </a>)}</h3>
        {cur?.p && <p className="help">Filled in automatically. Save to confirm it, or change it.</p>}
        <input {...NOFILL} autoFocus type="text" autoCapitalize="words" maxLength={40} placeholder="Biggest event this month?" value={t} onChange={(e) => setT(e.target.value)} />
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
        <select {...NOFILL} value={m} onChange={(e) => setM(e.target.value)} aria-label="Birth month">{MON.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
        <input {...NOFILL} inputMode="numeric" pattern="[0-9]*" maxLength={4} value={y} onChange={(e) => setY(e.target.value.replace(/\D/g, ''))} aria-label="Birth year" />
        <button type="button" className="ghost" disabled={!ok} onClick={() => onSave(+y, +m)}>Update</button>
      </div>
    </div>
  );
}

/** For someone who has died: the grid and the count stop at their death month; the year rows carry on to today. */
function DeathFix({ s, onSave }: { s: State; onSave: (d?: State['death']) => void }) {
  const [open, setOpen] = useState(!!s.death);
  const [m, setM] = useState(String(s.death?.m || ''));
  const [y, setY] = useState(String(s.death?.y || ''));
  const at = +y >= 1900 && m ? ym(+y, +m) : '';
  const ok = !!at && at >= ym(s.birth!.y, s.birth!.m) && at <= nowYM();
  if (!open) return <button type="button" className="link" onClick={() => setOpen(true)}>This person has passed away</button>;
  return (
    <div className="field fix">
      <label>Passed away</label>
      <div className="ymf">
        <select {...NOFILL} value={m} onChange={(e) => setM(e.target.value)} aria-label="Month of death"><option value="">Month</option>{MON.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
        <input {...NOFILL} inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="Year" value={y} onChange={(e) => setY(e.target.value.replace(/\D/g, ''))} aria-label="Year of death" />
        <button type="button" className="ghost" disabled={!ok || (s.death?.y === +y && s.death?.m === +m)} onClick={() => onSave({ y: +y, m: +m, d: s.death?.y === +y && s.death?.m === +m ? s.death.d : undefined })}>{s.death ? 'Update' : 'Set'}</button>
      </div>
      <p className="dim small">The grid and the count stop at this month. The years after it stay, so you can see how long ago it was.</p>
      {s.death ? <button type="button" className="link" onClick={() => { onSave(undefined); setOpen(false); setM(''); setY(''); }}>Not passed away after all</button> : <button type="button" className="link" onClick={() => setOpen(false)}>Cancel</button>}
    </div>
  );
}
