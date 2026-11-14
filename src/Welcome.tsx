// The opening flow: name, birth month and day, and a first memory, with typed text and sound.
// Produces a `Begun` object that script.ts turns into the first cells.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MON, type YM, ym, nowYM, yOf, fmt, season, inkOn } from './model';
import { NOFILL } from './nofill';
import { Typer, still } from './Typer';
import { unlock, pop, tick, whoosh, lock, startJingle, soundOn, setSound } from './sound';

/** What the opening flow collects. The app turns it into a first cell and a birth month. */
export interface Begun { name: string; born: YM; day: number; text: string; when: YM }

const FLY_MS = 950;

const INTRO = [
  'Hi, let’s map out your life so far…',
  'We’ll help you create a life grid.',
  'You’ll save the most important events in each month of your life.',
];
const STEPS = ['start', 'intro', 'event', 'card', 'born', 'age', 'fly'] as const;
type Step = (typeof STEPS)[number];

function MonthYear({ m, y, setM, setY, label, d, setD }: { m: string; y: string; setM: (v: string) => void; setY: (v: string) => void; label: string; d?: string; setD?: (v: string) => void }) {
  return (
    <div className={`ymf${setD ? ' three' : ''}`}>
      <select {...NOFILL} value={m} onChange={(e) => setM(e.target.value)} aria-label={`${label} month`}>
        <option value="">Month</option>{MON.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
      </select>
      {setD && <input {...NOFILL} inputMode="numeric" pattern="[0-9]*" maxLength={2} placeholder="Day" value={d} aria-label={`${label} day`}
        onChange={(e) => setD(e.target.value.replace(/\D/g, ''))} />}
      <input {...NOFILL} inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="Year" value={y} aria-label={`${label} year`}
        onChange={(e) => setY(e.target.value.replace(/\D/g, ''))} />
    </div>
  );
}

const validYM = (m: string, y: string) => !!m && +y >= 1900 && ym(+y, +m) <= nowYM();

export default function Welcome({ onCommit, onFinish, onImport, onSkip }: {
  onCommit: (v: Begun) => void; onFinish: () => void; onImport: () => void; onSkip: () => void;
}) {
  const [step, setStep] = useState<Step>(soundOn() ? 'start' : 'intro'); // with sound on, a tap-to-start screen first: browsers only allow audio after a tap
  const [fastAt, setFastAt] = useState<Step | null>(null);
  const [ready, setReady] = useState(false); // the event form waits for its prompt to finish typing
  const [text, setText] = useState(''), [em, setEm] = useState(''), [ey, setEy] = useState('');
  const [bm, setBm] = useState(''), [bd, setBd] = useState(''), [by, setBy] = useState(''), [name, setName] = useState('');
  const [pin, setPin] = useState<{ left: number; top: number; width: number; height: number; land: boolean } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const at = (s: Step) => STEPS.indexOf(step) >= STEPS.indexOf(s);

  const when = em && ey ? ym(+ey, +em) : '';
  const born = bm && by ? ym(+by, +bm) : '';
  const eventOk = !!text.trim() && validYM(em, ey);
  const late = !!born && !!when && born > when; // born after the event they just gave
  const dayOk = !!bm && +by >= 1900 && +bd >= 1 && +bd <= new Date(+by, +bm, 0).getDate() && new Date(+by, +bm - 1, +bd) <= new Date();
  const bornOk = validYM(bm, by) && dayOk && !late;
  const age = born && when ? yOf(when) - yOf(born) : 0;

  // Keep the newest line in view on small screens.
  useEffect(() => { if (step !== 'fly') end.current?.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'end' }); }, [step]);

  // The start gate: any tap or key wakes the audio and begins.
  useEffect(() => {
    if (step !== 'start') return;
    const go = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest?.('.wlinks')) return;
      unlock(); startJingle(); setStep('intro');
    };
    // 'click', not 'pointerdown': on a phone the tap's click arrives after the step changes, and would count as a tap to skip the intro typing.
    addEventListener('click', go); addEventListener('keydown', go);
    return () => { removeEventListener('click', go); removeEventListener('keydown', go); };
  }, [step]);
  useEffect(() => { if (step === 'card') pop(); }, [step]);
  // Never leave the event form hidden: show it after a few seconds even if the prompt's typing stalls (slow or throttled phones).
  useEffect(() => { if (step !== 'event') return; const t = setTimeout(() => setReady(true), 3500); return () => clearTimeout(t); }, [step]);
  // When the form appears, make sure it is on screen (a phone keyboard can cover it).
  useEffect(() => { if (ready) setTimeout(() => end.current?.scrollIntoView({ behavior: 'auto', block: 'end' }), 50); }, [ready]);

  // The last beat: hand the cell to the grid, then carry the card from where it sits to its square.
  useLayoutEffect(() => {
    if (step !== 'fly') return;
    const c = card.current;
    if (!c) return onFinish();
    const r0 = c.getBoundingClientRect();
    setPin({ left: r0.left, top: r0.top, width: r0.width, height: r0.height, land: false });
    onCommit({ name, born, day: +bd, text: text.trim(), when });
    let dead = false, el: HTMLElement | null = null;
    const timers: any[] = [];
    const finish = () => {
      if (el) { el.style.visibility = ''; el.classList.add('lock'); setTimeout(() => el?.classList.remove('lock'), 1000); }
      onFinish();
    };
    const find = (tries: number) => {
      if (dead) return;
      el = document.querySelector<HTMLElement>(`main [data-ym="${when}"]`);
      if (!el) { if (tries > 0) timers.push(setTimeout(() => find(tries - 1), 50)); else finish(); return; }
      if (still()) { lock(); return finish(); }
      el.scrollIntoView({ block: 'center', inline: 'center' });
      el.style.visibility = 'hidden';
      const r1 = el.getBoundingClientRect();
      setPin({ left: r1.left, top: r1.top, width: r1.width, height: r1.height, land: true });
      whoosh();
      timers.push(setTimeout(lock, FLY_MS - 30), setTimeout(finish, FLY_MS + 20));
    };
    // Give the card a moment to paint where it started before it is told to move; never leave the user stuck here.
    timers.push(setTimeout(() => find(20), 120), setTimeout(finish, 4500));
    return () => { dead = true; timers.forEach(clearTimeout); if (el) el.style.visibility = ''; };
  }, [step]);

  const col = season(0.12); // the colour the first home's cells will have
  const submitEvent = (e: React.FormEvent) => { e.preventDefault(); if (eventOk) { tick(); (document.activeElement as HTMLElement)?.blur(); setStep('card'); } };
  const submitBorn = (e: React.FormEvent) => { e.preventDefault(); if (bornOk) { tick(); (document.activeElement as HTMLElement)?.blur(); setStep('age'); } };
  const cardStyle: React.CSSProperties = pin
    ? { left: pin.left, top: pin.top, width: pin.width, height: pin.height, background: col, color: inkOn(col) }
    : { background: col, color: inkOn(col) };
  const hi = name.trim() ? `, ${name.trim()}` : '';

  return (
    <div className={`welcome${step === 'fly' ? ' flying' : ''}`}>
      <div className="wl" onClick={() => setFastAt(step)}>
        <div className="say">
          {step === 'start' && <p className="gate">▸ Tap to start</p>}
          {step === 'intro' && <Typer key="intro" lines={INTRO} fast={fastAt === 'intro'} onDone={() => setStep('event')} />}
          {step === 'event' && <Typer key="event" lines={['First, give me an event.']} fast={fastAt === 'event'} onDone={() => setReady(true)} />}
          {step === 'card' && <Typer key="card" fast={fastAt === 'card'} onDone={() => setStep('born')}
            lines={['Great.', 'FYI, life sheets are not stored on our servers. They live in the URL.', 'Next, when were you born?']} />}
          {step === 'born' && <p>Next, when were you born?</p>}
          {(step === 'age' || step === 'fly') && <Typer key="age" fast={fastAt === 'age'} onDone={() => setTimeout(() => setStep('fly'), still() ? 0 : 1200)}
            lines={[`Here’s your first cell${hi}. You were ${age} years old.`, 'Now let’s place it in your life.']} />}
        </div>

        {step === 'event' && ready && (
          <form className="wform" onSubmit={submitEvent}>
            <input {...NOFILL} autoFocus type="text" aria-label="Event" autoCapitalize="sentences" maxLength={60} placeholder="Started a new school" value={text} onChange={(e) => setText(e.target.value)} />
            <label>What month and year did it happen?
              <MonthYear m={em} y={ey} setM={setEm} setY={setEy} label="Event" />
            </label>
            <button className="primary" disabled={!eventOk}>Continue</button>
          </form>)}

        {at('card') && (
          <>
            {pin && <div className="slot" style={{ height: pin.height }} />}
            <div ref={card} className={`bigcell${pin ? ' pin' : ''}${pin?.land ? ' land' : ''}`} style={cardStyle}>
              <small>{fmt(when)}</small>
              <b>{text.trim()}</b>
              {at('age') && <em>Age {age}</em>}
            </div>
          </>)}

        {step === 'born' && (
          <form className="wform" onSubmit={submitBorn}>
            <MonthYear m={bm} y={by} setM={setBm} setY={setBy} d={bd} setD={setBd} label="Birth" />
            {!!bd && !!bm && by.length === 4 && !dayOk && !late && <p className="warn">That date doesn’t exist. Check the day.</p>}
            {late && <p className="warn">That’s after your first event ({fmt(when)}). Check the year.</p>}
            <label>And what should we call you?
              <input {...NOFILL} type="text" autoCapitalize="words" maxLength={30} placeholder="First name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button className="primary" disabled={!bornOk}>Show me</button>
          </form>)}

        {step === 'start' || step === 'intro' || step === 'event' ? (
          <p className="wlinks">
            <button type="button" className="link" onClick={onImport}>Already have a life sheet? Import it</button>
            <button type="button" className="link" onClick={onSkip}>Skip the intro</button>
            {step === 'start' && <button type="button" className="link" onClick={() => { setSound(false); setStep('intro'); }}>Play without sound</button>}
          </p>) : null}
        <div ref={end} />
      </div>
    </div>
  );
}
