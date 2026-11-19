// The app shell: layout, the menu shelf, the cell editor, sharing, undo and local persistence.
// Owns the State of the open sheet (src/model.ts). Every edit goes through commit(), which records undo history,
// saves that sheet to localStorage (src/sheets.ts, one key per sheet) and rewrites the URL.
// A link starting "#s." is a read-only view and stores nothing.
import { useEffect, useRef, useState } from 'react';
import { type State, type YM, fresh, stats, toCSV, toJSON, fmt, addM, homeAt, setBirth, MON, colorOf, places, short, inLife, yOf, ym , nowYM } from './model';
import { START, TOPICS, PLACE_TOPICS, normalize, current, answer, skip, begin, pending, goTopic, resume } from './script';
import { encode, decode } from './share';
import { parseSheet, type Parsed } from './import';
import { photosLink, googleCalLink, appleCalLink, gmailLink, GMAIL_START, IS_IOS } from './photos';
import { NOFILL } from './nofill';
import { renamePlace, moveHome, removeHome, editStay, removeStay } from './places';
import Question from './Question';
import Welcome from './Welcome';
import Coach from './Coach';
import type { Life } from './lifegrid';
import { VIEWS, type ViewId, unlockedViews, nextView, FIRST_UNLOCK, UNLOCK_ALL } from './views';
import { sparkle, soundOn, setSound } from './sound';
import { THEMES, applyTheme, savedTheme } from './theme';
import { migrate, loadSheet, saveSheet, deleteSheet, openId, markOpen, loadHist, saveHist, listSheets, storageKey, INDEX_KEY } from './sheets';

const blank = (): State => { const s = fresh(START); normalize(s); return s; };
/** The sheet this tab opens with: its own, else the last used on this device, else a blank one. */
const boot = (): State => { migrate(); const id = openId(), s = id ? loadSheet(id) : null; return s ?? blank(); };

/** A sheet's content as the link format sees it, so two sheets can be compared without false differences. */
const sameKey = async (s: State) => { const { t, ...p } = (await decode(await encode(s))) ?? {}; return JSON.stringify(p); };

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
  const [s, setS] = useState<State>(() => (VIEWING ? fresh([]) : boot()));
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
  const hist = useRef<string[]>(VIEWING ? [] : loadHist(s.id));
  const [shift, setShift] = useState(0); // clicks on the view switcher, to replay its dot animation
  const [tick, setTick] = useState(0); // bumped when another tab changes the list of sheets
  const sRef = useRef(s); sRef.current = s;
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
  const read = fs; // full screen is the reading view: the cells widen to show their words
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
    // An owner's address opens its grid. It never replaces a sheet: if a sheet here already holds exactly
    // this content it is opened, otherwise the link is added as a new sheet.
    if (h) openLink(h);
  }, []);

  useEffect(() => {
    document.title = s.name ? `${s.name}’s Life` : 'Life Grid';
    if (VIEWING) return;
    if (saveSheet(s)) setTick((n) => n + 1); // a sheet new to this device: refresh the list
    if (s.birth) encode(s).then((h) => { history.replaceState(null, '', '#' + h); setLink(location.origin + location.pathname + '#s.' + h); }).catch(() => {});
    if (import.meta.env.DEV && s.birth) fetch('/__save', { method: 'POST', body: JSON.stringify(s) }).catch(() => {});
  }, [s]);

  const commit = (fn: (d: State) => void) => {
    hist.current.push(JSON.stringify(s));
    if (hist.current.length > 300) hist.current.shift();
    saveHist(s.id, hist.current);
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
  // Open a link's grid as a sheet: the existing sheet with identical content, else a new one. Returns false if unreadable.
  const openLink = async (h: string): Promise<boolean> => {
    const p = await decode(h); if (!p) return false;
    const { t, ...g } = p, key = JSON.stringify(g);
    for (const info of listSheets(sRef.current)) {
      const ex = info.id === sRef.current.id ? sRef.current : loadSheet(info.id);
      if (ex && (await sameKey(ex)) === key) { if (ex.id !== sRef.current.id) switchTo(ex.id); return true; }
    }
    const d: State = { ...blank(), ...g, queue: [], done: true };
    if (t?.length) resume(d, t);
    hist.current = []; setS(d); setEditing(null); setIntro(false); setCoach(false);
    return true;
  };
  const [paste, setPaste] = useState(''), [pasteBad, setPasteBad] = useState(false);
  const loadPasted = async () => {
    const m = paste.trim().match(/#(?!s\.)(.+)$/); // only an owner link can be edited; a share link (#s.) is read-only
    const ok = m ? await openLink(m[1]) : false;
    setPasteBad(!ok); if (ok) { setPaste(''); if (!wide) setMenu(false); }
  };
  const removeSheet = (id: string, name?: string) => {
    if (!confirm(`Remove ${name ? `“${name}”` : 'this grid'} from this device? Copy its link first if you want to keep it.`)) return;
    if (id === s.id) { deleteCurrent(); return; }
    deleteSheet(id); setTick((n) => n + 1);
  };
  const back = () => { const prev = hist.current.pop(); saveHist(s.id, hist.current); if (prev) setS({ ...JSON.parse(prev), changed: [] }); };

  // Sheets: several grids on this device, each stored under its own key (src/sheets.ts).
  const switchTo = (id: string) => {
    const n = loadSheet(id); if (!n) return;
    hist.current = loadHist(id); markOpen(id);
    setS(n); setEditing(null); setIntro(false); setCoach(false); if (!wide) setMenu(false);
  };
  const newSheet = () => {
    hist.current = []; history.replaceState(null, '', location.pathname);
    setS(blank()); setEditing(null); setCoach(false); setIntro(true); setMenu(false);
  };
  const deleteCurrent = () => {
    const id = s.id; deleteSheet(id); history.replaceState(null, '', location.pathname);
    const next = listSheets()[0];
    if (next) switchTo(next.id); else { hist.current = []; setS(blank()); setMenu(true); }
    setTick((n) => n + 1);
  };
  // Another tab saved a sheet: follow it if it is the one open here, and refresh the list either way.
  useEffect(() => {
    if (VIEWING) return;
    const on = (e: StorageEvent) => {
      if (e.key === INDEX_KEY) setTick((n) => n + 1);
      if (e.key === storageKey(sRef.current.id) && e.newValue && e.newValue !== JSON.stringify(sRef.current)) {
        try { const n = JSON.parse(e.newValue); if (n.v === 1) setS({ ...n, changed: [] }); } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);
  const sheets = VIEWING ? [] : listSheets(s);

  const st = stats(s);
  const open = VIEWING ? VIEWS : unlockedViews(st.pct); // a shared link shows every view
  const ids = open.map((v) => v.id);
  const nextMode: ViewId = ids[(ids.indexOf(mode) + 1) % ids.length] ?? 'grid';
  const upcoming = VIEWING ? undefined : nextView(st.pct);
  const shown = VIEWS.find((v) => v.id === mode) ?? VIEWS[0], Shown = shown.Component; // the view on screen
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
  const placeTodo = todo.filter((t) => PLACE_TOPICS.includes(t)), otherTodo = todo.filter((t) => !PLACE_TOPICS.includes(t));
  const placeAsking = asking && !conflict && !!view && PLACE_TOPICS.includes(view.stage); // which section holds the question on show
  const otherAsking = asking && !placeAsking;
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
    <div className={`app${VIEWING ? ' viewing' : ''}${docked ? ' docked' : ''}${fs ? ' fs' : ''}${mode === 'grid' && s.birth ? ' gridview' : ''}`}>
      <header onClickCapture={(e) => { // every header icon lightens for a moment when clicked
        const svg = (e.target as Element).closest?.('button.icon')?.querySelector('svg');
        if (svg && !svg.classList.contains('switch')) { svg.classList.remove('pulse'); void svg.getBoundingClientRect(); svg.classList.add('pulse'); }
      }}>
        <h1>{s.birth && !intro
          ? <button className="home" onClick={() => setMode(VIEWS[0].id)} title={mode === VIEWS[0].id ? undefined : `Back to the ${VIEWS[0].name.toLowerCase()}`}>{title}</button>
          : title}</h1>
        {!intro && <>
        <button className="icon" onClick={() => { setShift((n) => n + 1); setMode(nextMode); }} disabled={!s.birth || ids.length < 2}
          aria-label={ids.length < 2 ? `View switcher: other views unlock at ${FIRST_UNLOCK}%` : `View switcher: switch to ${VIEWS.find((v) => v.id === nextMode)!.name}`}
          title={ids.length < 2 ? `View switcher · other views unlock at ${FIRST_UNLOCK}% filled in` : 'View switcher'}>
          {/* One mark on every view: two tiles over a row of dots. Each view still declares its own `icon` (src/views/*.tsx), kept for later use. */}
          <svg key={shift} viewBox="0 0 24 24" width="24" height="24" className={`switch${shift ? ' go' : ''}`}>
            <rect x="4" y="4" width="6.6" height="6.6" rx="1.2" /><rect x="13.4" y="4" width="6.6" height="6.6" rx="1.2" />
            <clipPath id="switch-dots"><rect x="2.4" y="17" width="19.2" height="6" /></clipPath>
            {/* six dots, four in view: each click slides the row one dot along (key restarts the animation) */}
            <g clipPath="url(#switch-dots)"><g className="slide">
              {[-0.3, 4.6, 9.5, 14.5, 19.4, 24.3].map((x) => <circle key={x} cx={x} cy="19.6" r="1.45" />)}
            </g></g>
          </svg>
        </button>
        {document.fullscreenEnabled && (
          <button className="icon" onClick={toggleFs} aria-label={fs ? 'Exit full screen' : 'Full screen'} title={fs ? 'Exit full screen' : 'Full screen'}>
            <svg viewBox="0 0 24 24" width="22" height="22">{fs
              ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}</svg>
          </button>)}
        </>}
        {!VIEWING && <button className={`icon${asking && !menu ? ' todo' : ''}`} onClick={() => { if (intro) setIntro(false); setCoach(false); setMenu(!menu); }} aria-label={asking && !menu ? 'Menu — questions waiting' : 'Menu'}><svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>}
      </header>

      <div className={`body${intro ? ' intro' : ''}`}>
        {intro && <Welcome
          onCommit={(v) => commit((d) => begin(d, v))}
          onFinish={() => { setIntro(false); setCoach(true); }}
          onImport={() => { setIntro(false); setImporting(true); }}
          onSkip={() => { setIntro(false); setMenu(true); }} />}
        <main>{s.birth || VIEWING
          ? <Shown life={s as Life} s={s} read={read} onCell={VIEWING ? undefined : setEditing} />
          : ( // a blank sheet: a seedling pressed into the page; tapping it opens the first question
            <button className="seedling" onClick={() => setMenu(true)} aria-label="Begin your life grid: open the first question">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                {['hi', 'lo', 'mid'].map((k) => (
                  <g key={k} className={k}>
                    <path d="M47.5 84C47.5 72 47 62 47.5 47L52.5 47C53 62 52.5 72 52.5 84Z" /><path d="M50 54C37 54 27 45 25 29C40 30 50 39 50 54Z" />
                    <path d="M50 47C52 32 63 22 80 21C79 38 67 47 50 47Z" /><path d="M26 86Q50 72 74 86Z" />
                  </g>))}
              </svg>
            </button>)}</main>
        {s.birth && shown.legend !== false && ( // the horizontal timeline names each home on its own band
          <aside className="legend">
            {places(s).map((p) => <span key={p} title={p}><i style={{ background: colorOf(s, p) }} />{short(p)}</span>)}
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
                <b>{st.total.toLocaleString()}<small> {st.total === 1 ? 'month' : 'months'} of living</small></b>
                <div className="fill" role="img" aria-label={`${st.pct}% complete: ${st.filled} filled, ${st.placeholders} to confirm, ${st.total - st.filled - st.placeholders} empty`}>
                  {([['done', st.filled, 'filled in'], ['maybe', st.placeholders, 'to confirm'], ['empty', st.total - st.filled - st.placeholders, 'still empty']] as const)
                    .filter(([, n]) => n > 0).map(([k, n, label]) => (
                      <span key={k} className={k} style={{ flexGrow: n }} tabIndex={0}
                        data-tip={`${n.toLocaleString()} ${n === 1 ? 'month' : 'months'} ${label} · ${Math.round((n / st.total) * 100)}%`} />))}
                </div>
                <p>{st.pct}% complete</p>
                {s.log.length > 0 && <p className="dim">{s.done ? 'Setup complete. ' : ''}{answered} {answered === 1 ? 'question' : 'questions'} answered, {s.log.length - answered} skipped.</p>}
              </div>
            ) : <p className="help">Answer the first question to start your grid.</p>}
            {sheets.length > 0 && (
              <details className="more"><summary>My grids<em className="dim"> · {sheets.length}</em></summary>
                <div className="sheets">
                  {sheets.map((x) => (
                    <div key={x.id} className="sheetrow">
                      <button className={`sheetbtn${x.id === s.id ? ' cur' : ''}`} aria-current={x.id === s.id} disabled={x.id === s.id}
                        onClick={() => switchTo(x.id)}>
                        <b>{x.name || 'Untitled'}</b>
                        <span className="dim">born {x.born} · {x.cells} {x.cells === 1 ? 'month' : 'months'}{x.id === s.id ? ' · open' : ''}</span>
                      </button>
                      <button className="x" aria-label={`Remove ${x.name || 'this grid'}`} title="Remove from this device" onClick={() => removeSheet(x.id, x.name)}>×</button>
                    </div>))}
                  {s.birth && <button className="link" onClick={newSheet}>Start a new grid</button>}
                  <div className="field"><label>Load a grid from a link</label>
                    <div className="row"><input value={paste} placeholder="Paste an owner link" aria-invalid={pasteBad}
                      onChange={(e) => { setPaste(e.target.value); setPasteBad(false); }} onKeyDown={(e) => { if (e.key === 'Enter') loadPasted(); }} />
                      <button className="ghost" disabled={!paste.trim()} onClick={loadPasted}>Load</button></div>
                    {pasteBad && <p className="help">That isn’t an owner link. Share links (with “#s.”) are read-only and can’t be loaded here.</p>}
                  </div>
                </div>
                <p className="dim small">Each grid is kept on this device, separately. Switch between them here, remove the ones you are done with, or load another from a link. Nothing is ever replaced.</p>
              </details>)}
            {s.birth && (
              <details className="more" open><summary>Views<em className="dim"> · {shown.name}</em></summary>
                <div className="field">{!UNLOCK_ALL && <label>Unlocked as your grid fills in</label>}
                  <div className="views">
                    {VIEWS.map((v) => { const ok = UNLOCK_ALL || st.pct >= v.at; return (
                      <button key={v.id} disabled={!ok} className={`chip${ok ? '' : ' locked'}${ok && v.id === mode ? ' here' : ''}`}
                        title={ok ? `Show the ${v.name.toLowerCase()}` : `Unlocks at ${v.at}% filled in`}
                        onClick={() => { setMode(v.id); if (!wide) setMenu(false); }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d={v.icon} /></svg>{v.name}{!ok && <em className="dim"> {v.at}%</em>}</button>); })}
                  </div>
                  {upcoming ? (<>
                    <div className="unlock-meter" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, ((st.pct - open[open.length - 1].at) / (upcoming.at - open[open.length - 1].at)) * 100))}%` }} /></div>
                    <p className="dim small">Next: {upcoming.name} unlocks at {upcoming.at}%. You’re at {st.pct}%.</p>
                  </>) : null}
                </div>
              </details>)}
            {s.birth && (
              <details className="more" open={placeAsking}><summary>Places{placeTodo.length > 0 && <em className="dim"> · {placeTodo.length} {placeTodo.length === 1 ? 'topic' : 'topics'} waiting</em>}</summary>
                {placeAsking && <div className="shelf-q">{ask}</div>}
                {placeTodo.length > 0 && !placeAsking && <button className="link" onClick={() => commit((d) => goTopic(d, 'Homes'))}>Answer the Homes questions</button>}
                <PlacesEditor s={s} commit={commit} />
              </details>)}
            {(asking || s.birth) && (
              <details className="more" open={otherAsking}><summary>Questions{otherTodo.length > 0 && <em className="dim"> · {otherTodo.length} {otherTodo.length === 1 ? 'topic' : 'topics'} waiting</em>}</summary>
              {otherAsking && <div className="shelf-q">{ask}</div>}
              {asking && !wide && last && ( // on a phone the shelf covers the grid, so say what the last answer filled in
                <p className="landed" key={last + s.log.length}><b>{fmt(last)}</b> {s.cells[last]?.t}{s.changed.length > 1 && <em> +{s.changed.length - 1} more</em>} <button className="link" onClick={() => setMenu(false)}>See the grid</button></p>)}
              {s.birth && (
                <div className="field"><label>{otherTodo.length ? 'Pick up any topic' : 'Go back to any topic'}</label>
                  <div className="topics">
                    {TOPICS.filter((n) => !PLACE_TOPICS.includes(n)).map((n) => <button key={n} className={`chip${view?.stage === n ? ' cur' : todo.includes(n) ? ' todo' : ''}`}
                      onClick={() => { commit((d) => goTopic(d, n)); }}>{n}</button>)}
                  </div>
                  <p className="dim small"><i className="dot" /> still has questions waiting</p>
                </div>)}
              </details>)}
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
                <p className="dim small">Saved on this device only. Shared links carry your data, not your theme.</p>
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
            {s.birth && (
              <details className="more"><summary>Import and export</summary>
                <div className="field"><label>Import — bring in a life sheet you already have</label>
                  <div className="acts"><button className="link" onClick={() => setImporting(true)}>Import a sheet</button></div>
                  <p className="dim small">Paste from Google Sheets or Excel, or load a CSV or JSON file.</p>
                </div>
                <div className="field"><label>Export — take this grid to other tools</label>
                  <div className="acts">
                    <button className="link" onClick={downloadJSON}>Download JSON</button>
                    <button className="link" onClick={download}>Download CSV</button>
                  </div>
                  <p className="dim small">JSON keeps everything and can be imported again. CSV opens as a spreadsheet.</p>
                </div>
              </details>)}
            <span className="grow" />
            {!s.birth && <button className="link" onClick={() => setImporting(true)}>Already have a life sheet? Import it</button>}
            {hist.current.length > 0 && !asking && <button className="link" onClick={back}>Undo last change</button>}
            {s.birth && <button className="link danger" onClick={() => { if (confirm(sheets.length > 1 ? 'Delete this grid from this device? Other grids are kept.' : 'Erase this grid and start over?')) deleteCurrent(); }}>{sheets.length > 1 ? 'Delete this grid' : 'Start over'}</button>}
  <a className="link repo" href="https://github.com/inthaiguy/LifeGrid" target="_blank" rel="noopener noreferrer">Contribute or fork on GitHub</a>
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
        <h3>{fmt(at)} <span className="dim">· age {yOf(at) - s.birth!.y}{home ? <span title={home}>{` · ${short(home)}`}</span> : ''}</span> <a className="photos" href={photosLink(at)} target="_blank" rel="noopener noreferrer" title={`Your Google Photos from ${fmt(at)}`} aria-label={`Your Google Photos from ${fmt(at)}`}>
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

/** Where they lived and the long stays: change a place's name or a move's date, or take a move out. New ones come from the questions above. */
function PlacesEditor({ s, commit }: { s: State; commit: (fn: (d: State) => void) => void }) {
  const [, force] = useState(0);
  const MonthYear = ({ at, label, onSave }: { at: string; label: string; onSave: (at: string) => void }) => {
    const [m, setM] = useState(String(+at.slice(5))), [y, setY] = useState(at.slice(0, 4));
    const neu = +y >= 1900 && +y <= new Date().getFullYear() + 1 ? ym(+y, +m) : '';
    return (
      <div className="ymf two">
        <div className="ymf"><select {...NOFILL} value={m} onChange={(e) => setM(e.target.value)} aria-label={`${label} month`}>{MON.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}</select>
          <input {...NOFILL} inputMode="numeric" pattern="[0-9]*" maxLength={4} value={y} onChange={(e) => setY(e.target.value.replace(/\D/g, ''))} aria-label={`${label} year`} /></div>
        <button type="button" className="ghost" disabled={!neu || neu === at} onClick={() => onSave(neu)}>Update</button>
      </div>);
  };
  const name = (place: string, label: string) => (
    <input {...NOFILL} type="text" defaultValue={place} key={place} aria-label={label}
      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== place) commit((d) => renamePlace(d, place, v)); else e.target.value = place; force((n) => n + 1); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLElement).blur(); }} />);
  if (!s.homes.length) return <p className="dim small">No places yet. Answer the Homes questions to add them.</p>;
  return (
    <div className="places">
      <div className="field fix"><label>Born in</label>{name(s.homes[0].place, 'Birthplace')}</div>
      {s.homes.slice(1).map((h, i) => (
        <div className="field fix" key={h.from + h.place}>
          <label>Moved to · {fmt(h.from)}</label>
          {name(h.place, 'Place')}
          <MonthYear at={h.from} label="Move" onSave={(at) => commit((d) => moveHome(d, i + 1, at))} />
          <button type="button" className="link" onClick={() => { if (confirm(`Remove the move to ${short(h.place)}?`)) commit((d) => removeHome(d, i + 1)); }}>Remove this move</button>
        </div>))}
      {s.stays.map((t, i) => (
        <div className="field fix" key={t.from + t.place}>
          <label>Stay · {fmt(t.from)} – {fmt(t.to)}</label>
          {name(t.place, 'Place')}
          <MonthYear at={t.from} label="Stay from" onSave={(at) => commit((d) => editStay(d, i, at, t.to))} />
          <MonthYear at={t.to} label="Stay until" onSave={(at) => commit((d) => editStay(d, i, t.from, at))} />
          <button type="button" className="link" onClick={() => { if (confirm(`Remove the stay in ${short(t.place)}?`)) commit((d) => removeStay(d, i)); }}>Remove this stay</button>
        </div>))}
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
