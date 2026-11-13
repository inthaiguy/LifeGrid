// The onboarding script from docs/onboarding-questions.md, as data plus a small engine.
// The queue holds plain items so a session can be saved and resumed mid-way.
import { type State, type Item, type YM, ym, yOf, mOf, nowYM, addM, short, setCell, spans, places, birthYM, MON, fmt } from './model';

export interface Field {
  key: string;
  type: 'text' | 'ym' | 'month' | 'year' | 'check' | 'years';
  label: string;
  optional?: boolean;
  def?: any;
  placeholder?: string;
  exact?: boolean;     // ym: no "not sure"/season options
  years?: number[];    // years: one text input per year
  month?: number;      // years: which month the answers land in
}
export interface View { stage: string; prompt: string; help?: string; fields: Field[]; submit?: string; skip?: string }
interface Def {
  view?: (s: State, p: any) => View | null;
  apply?: (s: State, p: any, v: any) => Item[] | void;
  expand?: (s: State, p: any) => Item[];
}

// Ordered by yield: the stages that fill the most cells per question come first.
export const STAGES = ['Frame', 'Homes', 'School', 'Traditions', 'Work', 'People', 'Anchor dates', 'Firsts', 'Trips', 'Eras', 'Shared events'];

const ord = (n: number) => { const t = n % 100; return n + (t > 10 && t < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'); };
const again = (k: string, p: any): Item[] => [{ k, p: { ...p, n: (p.n || 0) + 1 } }];
const cue = (s: State, key: string, val: string) => { (s.cues[key] ||= []).push(val); };
const repeatHelp = 'Add as many as you like, one at a time.';

/** A dated event: optionally "what", always "when". Covers most of the script. */
const ev = (stage: string, q: string, p: any = {}): Item => ({ k: 'ev', p: { stage, q, ...p } });

const SHARED: [YM, string][] = [
  ['1969-07', 'the Moon landing'], ['1974-08', 'Nixon resigned'], ['1977-08', 'Elvis died'],
  ['1980-05', 'Mount St. Helens erupted'], ['1986-01', 'the Challenger disaster'], ['1989-11', 'the Berlin Wall fell'],
  ['1991-01', 'the Gulf War began'], ['1997-08', 'Princess Diana died'], ['2000-01', 'the millennium New Year'],
  ['2001-09', '9/11'], ['2004-12', 'the Indian Ocean tsunami'], ['2008-11', 'Obama was elected'],
  ['2011-03', 'the Japan earthquake and tsunami'], ['2017-08', 'the 2017 total solar eclipse'],
  ['2020-03', 'the Covid lockdowns began'], ['2022-09', 'Queen Elizabeth II died'],
];

const DEFS: Record<string, Def> = {
  birth: {
    view: () => ({
      stage: 'Frame', prompt: 'When and where were you born?', submit: 'Start my grid',
      fields: [
        { key: 'name', type: 'text', label: 'First name', optional: true },
        { key: 'when', type: 'ym', label: 'Birth month and year', exact: true },
        { key: 'place', type: 'text', label: 'Birthplace', placeholder: 'City, State or Country' },
      ],
    }),
    apply: (s, _p, v) => {
      if (v.name?.trim()) s.name = v.name.trim();
      s.birth = { y: yOf(v.when), m: mOf(v.when), place: v.place };
      s.homes = [{ from: v.when, place: v.place }];
      setCell(s, v.when, `Born ${short(v.place)}`);
    },
  },

  // Asked after the welcome flow, which collects the birth month but not the place.
  birthplace: {
    view: (s) => (s.birth && !s.birth.place ? {
      stage: 'Frame', prompt: `Where were you born${s.name ? `, ${s.name}` : ''}?`, submit: 'Next',
      fields: [{ key: 'place', type: 'text', label: 'Birthplace', placeholder: 'City, State or Country' }],
    } : null),
    apply: (s, _p, v) => {
      const place = String(v.place).trim(), b = birthYM(s);
      s.birth = { ...s.birth!, place };
      s.homes = [{ from: b, place }];
      if (!s.cells[b]) setCell(s, b, `Born ${short(place)}`);
    },
  },

  move: {
    view: (s, p) => {
      const last = s.homes[s.homes.length - 1].place;
      return {
        stage: 'Homes',
        prompt: p.n ? `And after ${short(last)}? When did you move, and where to?` : `You started in ${short(last)}. When did you first move away, and where to?`,
        help: 'Only moves where your home changed. Rough dates are fine.',
        skip: p.n ? `I still live in ${short(last)}` : 'I never moved',
        fields: [{ key: 'place', type: 'text', label: 'Moved to', placeholder: 'City, State or Country' }, { key: 'when', type: 'ym', label: 'When' }],
      };
    },
    apply: (s, p, v) => {
      s.homes.push({ from: v.when, place: v.place });
      s.homes.sort((a, b) => a.from.localeCompare(b.from));
      setCell(s, v.when, `Move to ${short(v.place)}`);
      s.changed.push(v.when);
      return again('move', p);
    },
  },

  stay: {
    view: (_s, p) => ({
      stage: 'Homes',
      prompt: p.n ? 'Any other long stay somewhere else?' : 'Any stretch of a month or more living somewhere else — study abroad, a posting, a long stay with family?',
      skip: p.n ? 'No more' : 'None',
      fields: [
        { key: 'place', type: 'text', label: 'Where' },
        { key: 'from', type: 'ym', label: 'From' }, { key: 'to', type: 'ym', label: 'Until' },
      ],
    }),
    apply: (s, p, v) => {
      const [from, to] = v.from <= v.to ? [v.from, v.to] : [v.to, v.from];
      s.stays.push({ from, to, place: v.place });
      setCell(s, from, `Move to ${short(v.place)}`);
      return again('stay', p);
    },
  },

  schoolmonth: {
    view: () => ({
      stage: 'School', prompt: 'What month did your school year usually start?', skip: 'Skip school',
      fields: [{ key: 'm', type: 'month', label: 'School year starts', def: 9 }],
    }),
    apply: (s, _p, v) => { s.schoolMonth = +v.m; return [{ k: 'firstgrade' }, { k: 'hsgrad' }]; },
  },
  firstgrade: {
    view: (s) => ({
      stage: 'School', prompt: 'What year did you start first grade (or your first year of primary school)?', skip: 'Not sure',
      fields: [{ key: 'y', type: 'year', label: 'Year', def: s.birth!.y + 6 }],
    }),
    apply: (s, _p, v) => { s.firstGrade = +v.y; },
  },
  hsgrad: {
    view: (s) => ({
      stage: 'School', prompt: 'When did you finish secondary school?', skip: 'Skip',
      help: s.firstGrade ? 'This fills in a grade for every school year in between.' : undefined,
      fields: [{ key: 'when', type: 'ym', label: 'Finished', def: s.firstGrade ? ym(s.firstGrade + 12, ((s.schoolMonth + 8) % 12) + 1) : undefined }],
    }),
    apply: (s, _p, v) => {
      if (s.firstGrade) for (let i = 0; ym(s.firstGrade + i, s.schoolMonth) < v.when && i < 14; i++)
        setCell(s, ym(s.firstGrade + i, s.schoolMonth), `${ord(i + 1)} grade`, true);
      setCell(s, v.when, 'Graduation');
    },
  },

  college: {
    view: (_s, p) => ({
      stage: 'School',
      prompt: p.n ? 'Any other college, degree, trade school or service?' : 'Any college, university, trade school or military service?',
      skip: p.n ? 'No more' : 'None',
      fields: [
        { key: 'name', type: 'text', label: 'Short name', placeholder: 'e.g. UW, Army' },
        { key: 'from', type: 'ym', label: 'Started' }, { key: 'to', type: 'ym', label: 'Finished', optional: true },
      ],
    }),
    apply: (s, p, v) => {
      setCell(s, v.from, `Start ${v.name}`);
      if (v.to) {
        for (let i = 1; addM(v.from, 12 * i) < v.to && i < 12; i++) setCell(s, addM(v.from, 12 * i), `${v.name} yr ${i + 1}`, true);
        setCell(s, v.to, `Finish ${v.name}`);
      }
      cue(s, 'schools', v.name);
      return again('college', p);
    },
  },

  ev: {
    view: (_s, p) => ({
      stage: p.stage,
      prompt: p.n && p.q2 ? p.q2 : p.q,
      help: p.help || (p.repeat ? repeatHelp : undefined),
      skip: p.skip || (p.repeat ? (p.n ? 'No more' : 'None') : 'Skip'),
      submit: p.repeat ? 'Add' : undefined,
      fields: [
        ...(p.what ? [{ key: 'what', type: 'text', label: p.what, def: p.def } as Field] : []),
        { key: 'when', type: 'ym', label: 'When' },
      ],
    }),
    apply: (s, p, v) => {
      const text = p.what ? (p.tpl || '{}').replace('{}', v.what) : p.text;
      setCell(s, v.when, text);
      if (p.cue) cue(s, p.cue, v.what);
      if (p.anchor) s.anchors.push({ label: p.anchor.replace('{}', v.what), month: mOf(v.when), from: yOf(v.when) + 1 });
      return p.repeat ? again('ev', p) : [];
    },
  },

  partner: {
    view: (_s, p) => ({
      stage: 'People', prompt: p.n ? 'Any other significant partner?' : 'Partners: who, when did you meet, and (if relevant) when did you marry?',
      skip: p.n ? 'No more' : 'Skip',
      fields: [
        { key: 'name', type: 'text', label: 'Name' },
        { key: 'met', type: 'ym', label: 'Met', optional: true }, { key: 'wed', type: 'ym', label: 'Married', optional: true },
      ],
    }),
    apply: (s, p, v) => {
      if (v.met) setCell(s, v.met, `Met ${v.name}`);
      if (v.wed) { setCell(s, v.wed, 'Wedding'); s.anchors.push({ label: 'your anniversary', month: mOf(v.wed), from: yOf(v.wed) + 1 }); }
      cue(s, 'partners', v.name);
      return again('partner', p);
    },
  },

  // Writes nothing to the grid; kept as memory cues for gap questions.
  cue: {
    view: (_s, p) => ({ stage: p.stage, prompt: p.q, help: 'Fills nothing yet — used later to jog your memory.', skip: 'Skip', fields: [{ key: 'text', type: 'text', label: p.label || 'Names' }] }),
    apply: (s, p, v) => { cue(s, p.cue, v.text); },
  },
  friends: { expand: (s) => places(s).map((pl) => ({ k: 'cue', p: { stage: 'People', q: `Who were your closest friends in ${short(pl)}?`, cue: `friends:${pl}` } })) },

  tradition: {
    view: (s, p) => ({
      stage: 'Traditions',
      prompt: p.holiday
        ? (p.n ? 'Any other holiday your family gathers for?' : 'Which holidays does your family make a point of gathering for?')
        : (p.n ? 'Anything else you did every year at about the same time?' : 'Is there something you did every year at about the same time — a festival, family trip, camp, conference, religious observance?'),
      help: 'One at a time. It goes into that month for every year in the range.',
      skip: p.n ? 'No more' : 'None', submit: 'Add',
      fields: [
        { key: 'what', type: 'text', label: 'What (1–2 words)', placeholder: p.holiday ? 'e.g. Thanksgiving' : 'e.g. Summer camp' },
        { key: 'm', type: 'month', label: 'Month' },
        { key: 'from', type: 'year', label: 'From year', optional: true, placeholder: String(s.birth!.y) },
        { key: 'to', type: 'year', label: 'To year', optional: true, placeholder: 'now' },
        { key: 'varies', type: 'check', label: 'It was somewhere different each year' },
      ],
    }),
    apply: (s, p, v) => {
      const from = Math.max(+v.from || s.birth!.y, s.birth!.y), to = Math.min(+v.to || yOf(nowYM()), yOf(nowYM()));
      const years: number[] = [];
      for (let y = from; y <= to; y++) { setCell(s, ym(y, +v.m), v.what, true); years.push(y); }
      const next = again('tradition', p);
      return v.varies
        ? [{ k: 'years', p: { stage: 'Traditions', q: `Where was ${v.what} each year?`, help: 'Just the place. Fill in the ones you remember.', month: +v.m, years, tpl: `${v.what} {}` } }, ...next]
        : next;
    },
  },

  // One screen, one short answer per year.
  years: {
    view: (s, p) => {
      const years = (p.years as number[]).filter((y) => { const at = ym(y, p.month); const c = s.cells[at]; return at >= birthYM(s) && at <= nowYM() && (!c || c.p); }).reverse();
      if (!years.length) return null;
      return { stage: p.stage, prompt: p.q, help: p.help, skip: 'Skip all', submit: 'Save these', fields: [{ key: 'by', type: 'years', label: MON[p.month - 1], years, month: p.month }] };
    },
    apply: (s, p, v) => {
      for (const [y, text] of Object.entries(v.by || {})) if (String(text).trim()) setCell(s, ym(+y, p.month), (p.tpl || '{}').replace('{}', String(text).trim()), false, true);
    },
  },
  bdays: {
    expand: (s) => {
      const years: number[] = [];
      for (let y = s.birth!.y + 1; y <= yOf(nowYM()); y++) years.push(y);
      return [{ k: 'years', p: { stage: 'Anchor dates', q: 'Where were you for your birthday each year?', help: 'A place or a few words, e.g. “40th in Porto”. Skip the ones you don’t remember.', month: s.birth!.m, years } }];
    },
  },
  anchors: {
    expand: (s) => s.anchors.map((a) => {
      const years: number[] = [];
      for (let y = a.from; y <= yOf(nowYM()); y++) years.push(y);
      return { k: 'years', p: { stage: 'Anchor dates', q: `What did you do for ${a.label} each year?`, help: 'A place or a few words.', month: a.month, years } };
    }),
  },

  countries: {
    view: () => ({
      stage: 'Trips', prompt: 'List the countries (or states) you’ve travelled to.', help: 'Separate with commas. You’ll be asked when you first visited each.', skip: 'Skip',
      fields: [{ key: 'list', type: 'text', label: 'Places', placeholder: 'Mexico, Japan, Italy' }],
    }),
    apply: (s, _p, v) => {
      const list = String(v.list).split(',').map((x) => x.trim()).filter(Boolean);
      s.cues.countries = list;
      return list.map((pl) => ev('Trips', `${pl}: roughly when was your first visit?`, { text: `${pl} trip` }));
    },
  },

  eras: {
    expand: (s) => spans(s).flatMap((sp) => [
      { k: 'era', p: sp },
      ev('Eras', `What’s the first thing that comes to mind from your time in ${short(sp.place)}? When was it?`, { what: 'In a few words', help: `${fmt(sp.from)} – ${fmt(sp.to)}` }),
    ]),
  },
  era: {
    view: (_s, p) => ({
      stage: 'Eras', prompt: `When you lived in ${short(p.place)} (${yOf(p.from)}–${yOf(p.to)}), what did summers and winters usually involve?`,
      help: 'One or two words each. Goes into empty Julys and Januarys of those years.', skip: 'Skip',
      fields: [{ key: 'summer', type: 'text', label: 'Summers', optional: true }, { key: 'winter', type: 'text', label: 'Winters', optional: true }],
    }),
    apply: (s, p, v) => {
      for (let y = yOf(p.from); y <= yOf(p.to); y++) {
        if (v.summer && ym(y, 7) >= p.from && ym(y, 7) <= p.to) setCell(s, ym(y, 7), v.summer, true);
        if (v.winter && ym(y, 1) >= p.from && ym(y, 1) <= p.to) setCell(s, ym(y, 1), v.winter, true);
      }
    },
  },

  shared: {
    expand: (s) => SHARED
      .filter(([at]) => at >= addM(birthYM(s), 60) && at <= nowYM() && !(s.cells[at] && !s.cells[at].p))
      .map(([at, name]) => ({ k: 'at', p: { at, q: `Where were you when ${name} (${fmt(at)})?` } })),
  },
  at: {
    view: (_s, p) => ({ stage: 'Shared events', prompt: p.q, help: 'A place or what you were doing, in a few words.', skip: 'Don’t remember', fields: [{ key: 'text', type: 'text', label: 'In a few words' }] }),
    apply: (s, p, v) => { setCell(s, p.at, v.text); },
  },
};

const R = { repeat: true };

/**
 * Questions that make no sense for a young person are dropped by age (in whole years, today).
 * An item carries its own `age` in its params; these are the kinds that have their own definitions.
 * A topic the user picks from the menu ignores the limits (`nogate`), in case a twelve-year-old does have a paper round.
 */
const KIND_AGE: Record<string, number> = { college: 17, partner: 16, hsgrad: 16 };
const ageYears = (s: State): number => { const n = nowYM(), b = birthYM(s); return Math.floor(((yOf(n) - yOf(b)) * 12 + mOf(n) - mOf(b)) / 12); };
const tooYoung = (s: State, it: Item): boolean => !!s.birth && !it.p?.nogate && ageYears(s) < (it.p?.age ?? KIND_AGE[it.k] ?? 0);
export const START: Item[] = [
  { k: 'birth' },
  { k: 'move', p: { n: 0 } },
  { k: 'stay', p: { n: 0 } },
  { k: 'schoolmonth' },
  ev('School', 'Did you change schools, skip or repeat a year? When?', { what: 'What happened', def: 'New school', ...R }),
  { k: 'college', p: { n: 0 } },
  ev('School', 'Any other course or qualification that took a month or more?', { what: 'Course', tpl: 'Start {}', age: 15, ...R }),
  { k: 'tradition', p: { n: 0 } },
  { k: 'tradition', p: { n: 0, holiday: true } },
  ev('Work', 'What was your first paid job, and when did you start?', { what: 'Job or employer', tpl: 'Start {}', q2: 'Next job, and when did you start?', cue: 'jobs', skip: 'No more jobs', age: 14, ...R }),
  ev('Work', 'Any gaps — laid off, sabbatical, parental leave, between things?', { what: 'What', age: 18, ...R }),
  ev('People', 'Younger siblings: name and when they were born.', { what: 'Name', tpl: '{} born', cue: 'siblings', ...R }),
  ev('People', 'Children: name and when they were born.', { what: 'Name', tpl: '{} born', cue: 'children', anchor: '{}’s birthday', age: 16, ...R }),
  { k: 'partner', p: { n: 0 } },
  ev('People', 'Weddings you were in or travelled for — whose, and roughly when?', { what: 'Whose', tpl: '{}’s wedding', ...R }),
  ev('People', 'People close to you who died — who, and when? (Entirely optional.)', { what: 'Who', tpl: '{} died', age: 10, ...R }),
  ev('People', 'Pets: name, and when they arrived.', { what: 'Pet’s name', tpl: 'Got {}', cue: 'pets', ...R }),
  { k: 'bdays' },
  { k: 'anchors' },
  ev('Firsts', 'When did you get your driver’s license?', { text: 'Driver’s license', age: 15 }),
  ev('Firsts', 'When did you get your first car?', { text: 'First car', age: 16 }),
  ev('Firsts', 'Homes you bought or built — which, and when?', { what: 'Which', tpl: 'Bought {}', age: 18, ...R }),
  ev('Firsts', 'Purchases you still remember making — a bike, instrument, computer, boat?', { what: 'What', tpl: 'Bought {}', ...R }),
  ev('Firsts', 'When was your first flight?', { text: 'First flight' }),
  ev('Firsts', 'Where and when was your first time abroad?', { what: 'Where', tpl: '{} trip' }),
  ev('Firsts', 'Injuries, surgeries or hospital stays? (Optional.)', { what: 'What', ...R }),
  { k: 'countries' },
  ev('Trips', 'Any place you went back to? Add each visit you remember.', { what: 'Place', tpl: '{} trip', ...R }),
  { k: 'eras' },
  { k: 'shared' },
  ev('Shared events', 'Any storm, blackout, flood, fire or big local news you lived through?', { what: 'What', ...R }),
];

const KIND_STAGE: Record<string, string> = {
  move: 'Homes', stay: 'Homes', schoolmonth: 'School', college: 'School', tradition: 'Traditions', partner: 'People',
  bdays: 'Anchor dates', anchors: 'Anchor dates', countries: 'Trips', eras: 'Eras', shared: 'Shared events',
};
const stageOf = (s: State, it: Item): string | undefined => it.p?.stage || KIND_STAGE[it.k] || DEFS[it.k]?.view?.(s, it.p)?.stage;
export const TOPICS = STAGES.slice(1);

/** Topics that still have questions waiting, in script order. */
export const pending = (s: State): string[] => TOPICS.filter((t) => s.queue.some((it) => stageOf(s, it) === t));

/** A topic's questions from the top, phrased for someone whose grid already has homes in it. */
const topicItems = (s: State, stage: string, nogate = false): Item[] => structuredClone(START.filter((it) => stageOf(s, it) === stage))
  .map((it) => (it.k === 'move' && s.homes.length > 1 ? { k: 'move', p: { n: 1 } } : it))
  .map((it) => (nogate ? { ...it, p: { ...it.p, nogate: true } } : it));

/** Jump to a topic: its waiting questions move to the front; a finished topic starts again from its first question. */
export function goTopic(s: State, stage: string) {
  const mine = s.queue.filter((it) => stageOf(s, it) === stage);
  s.queue = [...(mine.length ? mine : topicItems(s, stage, true)), ...s.queue.filter((it) => stageOf(s, it) !== stage)];
  s.done = false;
  normalize(s);
}

/** Rebuild the waiting questions for a grid opened from a link, which only records which topics were left. */
export function resume(s: State, todo: number[]) {
  s.queue = todo.flatMap((i) => (STAGES[i] ? topicItems(s, STAGES[i]) : []));
  s.done = false;
  normalize(s);
}

/** Expand and drop items until the head of the queue is an askable question. */
export function normalize(s: State) {
  for (;;) {
    const it = s.queue[0];
    if (!it) { s.done = true; return; }
    const d = DEFS[it.k];
    if (tooYoung(s, it)) { s.queue.shift(); continue; }
    if (d?.expand) { s.queue.splice(0, 1, ...d.expand(s, it.p)); continue; }
    if (!d?.view || !d.view(s, it.p)) { s.queue.shift(); continue; }
    return;
  }
}

export const current = (s: State): View | null => {
  const it = s.queue[0];
  return it ? DEFS[it.k].view!(s, it.p) : null;
};

export function answer(s: State, v: any) {
  const it = s.queue.shift()!;
  const d = DEFS[it.k];
  const q = d.view!(s, it.p)?.prompt || '';
  const next = d.apply?.(s, it.p, v) || [];
  s.log.push({ k: it.k, q, a: v, n: new Set(s.changed).size }); // n = cells this answer filled
  s.queue.unshift(...next);
  normalize(s);
}

/**
 * The welcome flow's result: a first cell and a birth month. The usual birth question is replaced by a
 * shorter one that only asks for the place, so the script carries on from there.
 */
export function begin(s: State, v: { name: string; born: YM; day: number; text: string; when: YM }) {
  if (s.queue[0]?.k === 'birth') s.queue.shift();
  if (v.name.trim()) s.name = v.name.trim();
  s.birth = { y: yOf(v.born), m: mOf(v.born), d: v.day, place: '' };
  setCell(s, v.when, v.text);
  s.log.push({ k: 'welcome', q: 'First event', a: v, n: 1 });
  s.queue.unshift({ k: 'birthplace' });
  s.changed = []; // the card has already shown where this cell lands
  normalize(s);
}

export function skip(s: State) {
  const it = s.queue.shift()!;
  s.log.push({ k: it.k, q: DEFS[it.k].view!(s, it.p)?.prompt || '', a: null });
  normalize(s);
}
