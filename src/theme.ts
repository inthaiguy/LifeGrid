// Themes: each file in themes/*.json is picked up automatically, validated, and applied as CSS variables.
// See docs/themes.md for the file format.
import { setRamp } from './model';
import { setRamp as setReaderRamp } from './lifegrid';

/**
 * Look and feel lives in /themes/*.json, not in code. Each file is picked up automatically,
 * so a new theme is one new file. The format is documented in docs/themes.md.
 */
export interface Theme {
  schema: string;
  id: string;
  name: string;
  description?: string;
  /** URL of a stylesheet that loads the fonts the theme names (for example a Google Fonts css2 link). */
  fonts?: string;
  /** CSS variables, always applied. */
  vars?: Record<string, string>;
  /** CSS variables for light and dark appearance. A theme with only `light` stays light on a dark device. */
  light?: Record<string, string>;
  dark?: Record<string, string>;
  /** Colours spread evenly across a lifetime; also used to colour homes. Omit for the built-in ramp. */
  ramp?: string[];
}

const files = import.meta.glob('../themes/*.json', { eager: true, import: 'default' }) as Record<string, Theme>;
const HEX = /^#[0-9a-f]{6}$/i;
const VAR = /^--[a-z0-9-]+$/;
const SAFE = /^[^;{}<>\\]*$/; // a value is one declaration's worth of text, never markup or another rule

const clean = (m?: Record<string, string>) =>
  Object.fromEntries(Object.entries(m || {}).filter(([k, v]) => VAR.test(k) && typeof v === 'string' && SAFE.test(v)));

export const THEMES: Theme[] = Object.values(files)
  .filter((t) => t && t.schema === 'life-grid-theme/1' && /^[a-z0-9-]+$/.test(t.id) && t.name)
  .sort((a, b) => (a.id === 'default' ? -1 : b.id === 'default' ? 1 : a.name.localeCompare(b.name)));

const KEY = 'life-grid-theme';
export const savedTheme = (): string => { try { return localStorage.getItem(KEY) || 'default'; } catch { return 'default'; } };

const block = (m: Record<string, string>) => Object.entries(m).map(([k, v]) => `${k}:${v}`).join(';');

/** Apply a theme to the page. Unknown ids fall back to the built-in look. */
export function applyTheme(id: string) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  const root = document.documentElement;
  root.dataset.theme = t.id;

  let css = '';
  const vars = clean(t.vars), light = { ...vars, ...clean(t.light) }, dark = clean(t.dark);
  if (Object.keys(light).length) css += `:root{${block(light)}${t.light && !t.dark ? ';color-scheme:light' : ''}}`;
  if (Object.keys(dark).length) css += `@media (prefers-color-scheme:dark){:root{${block({ ...vars, ...dark })}}}`;
  let style = document.getElementById('theme-vars') as HTMLStyleElement | null;
  if (!style) { style = document.createElement('style'); style.id = 'theme-vars'; document.head.appendChild(style); }
  style.textContent = css;

  let link = document.getElementById('theme-fonts') as HTMLLinkElement | null;
  if (t.fonts && /^https:\/\//.test(t.fonts)) {
    if (!link) { link = document.createElement('link'); link.id = 'theme-fonts'; link.rel = 'stylesheet'; document.head.appendChild(link); }
    if (link.href !== t.fonts) link.href = t.fonts;
  } else link?.remove();

  const ramp = t.ramp && t.ramp.length >= 2 && t.ramp.every((c) => HEX.test(c)) ? t.ramp : null;
  setRamp(ramp); setReaderRamp(ramp); // the reader's colours follow the theme too, for views built on it
  try { localStorage.setItem(KEY, t.id); } catch { /* private mode */ }
  return t.id;
}
