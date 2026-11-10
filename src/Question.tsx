import { useState } from 'react';
import { type State, MON, ym, homeAt, short } from './model';
import { type View, type Field, STAGES } from './script';

const SEASON: Record<string, number> = { sp: 4, su: 7, fa: 10, wi: 1, '': 6 };

function YMField({ f, s, value, onChange }: { f: Field; s: State; value: string; onChange: (v: string) => void }) {
  const [m, setM] = useState(value ? String(+value.slice(5, 7)) : '');
  const [y, setY] = useState(value ? value.slice(0, 4) : '');
  const emit = (m: string, y: string) => {
    const yy = +y;
    if (!(yy > 1900 && yy < 2100) || (f.exact && !m)) return onChange('');
    onChange(ym(yy, m in SEASON ? SEASON[m] : +m));
  };
  const age = s.birth && +y > 1900 ? +y - s.birth.y : null;
  return (
    <div className="ymf">
      <select value={m} onChange={(e) => { setM(e.target.value); emit(e.target.value, y); }} aria-label={`${f.label} month`}>
        <option value="">{f.exact ? 'Month' : 'Month?'}</option>
        {MON.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
        {!f.exact && <><option value="sp">Spring</option><option value="su">Summer</option><option value="fa">Fall</option><option value="wi">Winter</option></>}
      </select>
      <input inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="Year" value={y} aria-label={`${f.label} year`}
        onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setY(v); emit(m, v); }} />
      {age !== null && age >= 0 && s.birth && <span className="hint">age {age}</span>}
    </div>
  );
}

function FieldInput({ f, s, value, onChange }: { f: Field; s: State; value: any; onChange: (v: any) => void }) {
  switch (f.type) {
    case 'ym': return <YMField f={f} s={s} value={value || ''} onChange={onChange} />;
    case 'month': return (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Month</option>{MON.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
      </select>);
    case 'year': {
      const age = s.birth && +value > 1900 ? +value - s.birth.y : null;
      return (
        <div className="ymf">
          <input inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder={f.placeholder || 'Year'} value={value || ''} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
          {age !== null && age >= 0 && <span className="hint">age {age}</span>}
        </div>);
    }
    case 'check': return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
    case 'years': return (
      <div className="years">
        {f.years!.map((y) => {
          const at = ym(y, f.month!); const home = homeAt(s, at); const cur = s.cells[at];
          return (
            <label key={y} className="yrow">
              <span className="yl"><b>{y}</b><i>age {y - s.birth!.y}</i></span>
              <input type="text" enterKeyHint="next" autoCapitalize="words" maxLength={40}
                placeholder={cur?.p ? cur.t : home ? `living in ${short(home)}` : ''}
                value={value?.[y] || ''} onChange={(e) => onChange({ ...(value || {}), [y]: e.target.value })} />
            </label>);
        })}
      </div>);
    default: return <input type="text" autoCapitalize="words" autoComplete="off" maxLength={60} placeholder={f.placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

export default function Question({ s, view, onSubmit, onSkip, onBack }: { s: State; view: View; onSubmit: (v: any) => void; onSkip: () => void; onBack?: () => void }) {
  const [vals, setVals] = useState<Record<string, any>>(() => Object.fromEntries(view.fields.filter((f) => f.def !== undefined).map((f) => [f.key, f.def])));
  const ok = view.fields.every((f) => f.optional || f.type === 'check' || f.type === 'years' || (vals[f.key] !== undefined && String(vals[f.key]).trim() !== ''));
  const stage = STAGES.indexOf(view.stage);
  return (
    <form className="q" onSubmit={(e) => { e.preventDefault(); if (!ok) return; (document.activeElement as HTMLElement)?.blur(); onSubmit(vals); }}>
      <div className="stage">
        <span>{view.stage}</span>
        <span className="dots" aria-label={`Stage ${stage + 1} of ${STAGES.length}`}>{STAGES.map((n, i) => <i key={n} className={i < stage ? 'd' : i === stage ? 'c' : ''} />)}</span>
      </div>
      <h2>{view.prompt}</h2>
      {view.help && <p className="help">{view.help}</p>}
      <div className="fields">
        {view.fields.map((f) => f.type === 'check'
          ? <label key={f.key} className="chk"><FieldInput f={f} s={s} value={vals[f.key]} onChange={(v) => setVals((o) => ({ ...o, [f.key]: v }))} /> {f.label}</label>
          : (
            <div key={f.key} className={`field ${f.type}`}>
              {f.type !== 'years' && <label>{f.label}{f.optional && <em> optional</em>}</label>}
              <FieldInput f={f} s={s} value={vals[f.key]} onChange={(v) => setVals((o) => ({ ...o, [f.key]: v }))} />
            </div>))}
      </div>
      <div className="actions">
        {onBack && <button type="button" className="ghost back" onClick={onBack} aria-label="Back">←</button>}
        {view.skip && <button type="button" className="ghost" onClick={onSkip}>{view.skip}</button>}
        <button type="submit" className="primary" disabled={!ok}>{view.submit || 'Next'}</button>
      </div>
    </form>
  );
}
