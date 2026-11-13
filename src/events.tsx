import type { ReactNode } from 'react';
import type { YM } from './model';

/**
 * Moments most people alive at the time will remember, marked with a quiet silhouette in the
 * month's cell. Shapes are drawn on a 100 x 90 canvas and anchored to the cell's right edge.
 * `.sil` = filled shape, `.ln` = stroked line, `.gap` = a thin cut in the cell's own colour.
 */
export type Mark = { title: string; label: string; art: ReactNode; box?: string };

export const EVENTS: Record<YM, Mark> = {
  '1969-07': {
    title: 'July 20, 1969', label: 'Apollo 11 lands on the Moon',
    // Front view of the Lunar Module: stacked ascent and descent stages with the panelled front faces,
    // the tank and equipment bays either side, antennas on top, four legs, the engine skirt and the lunar surface.
    art: (<>
      <g className="sil">
        <path d="M30 11.5L41 10.4V44L35 44.4L27.2 34.6L24.6 27L24.9 21L27 13Z" />
        <path d="M58.4 14.6L63 18L66 23L72 27.4V45L66 46L58.4 44Z" />
        <path d="M40.6 15.4V10.4H44.4V8.6H46.6V10.4H53.4V8.6H55V10.4H58.4V15.4L58.4 41L54.1 45.2H44.8L40.5 41Z" />
        <path d="M23.4 46.4L76.6 46.4L77.2 49.4L22.7 49.4Z" /><path d="M30.7 49L68.6 49L67.2 70L32 70Z" />
        <rect x="44.8" y="73" width="11.8" height="3.6" rx=".6" /><rect x="42" y="77.9" width="15.8" height="1.4" rx=".7" /><rect x="49" y="69.5" width="1.3" height="17" />
        <ellipse cx="64.6" cy="7.9" rx="2.3" ry="3" transform="rotate(16 64.6 7.9)" /><rect x="27.6" y="8" width="2.8" height="1.8" transform="rotate(20 29 9)" />
        <rect x="38.5" y="1" width="7.4" height=".9" rx=".4" /><rect x="41.9" y="1" width=".9" height="9.5" />
        <ellipse cx="14.8" cy="76.9" rx="3.4" ry="1" /><ellipse cx="83.4" cy="76.9" rx="3.4" ry="1" />
        <ellipse cx="12.6" cy="87" rx="4.3" ry="1.1" /><ellipse cx="86.8" cy="87" rx="4.3" ry="1.1" />
        <path d="M0 89Q50 83.5 100 89V90H0Z" />
      </g>
      <g className="ln">
        <path d="M24.6 51.6L12 86.4M74.4 51.6L87 86.4M16.8 76.6L36.6 71.6M82.8 76.6L63 71.6" />
        <path d="M58.4 13.8L62.4 9.8M40.6 11.4L29.6 8.8" />
      </g>
      <g className="gap">
        <path d="M43.5 26.5H55.3V38.5H43.5ZM45 20L43.5 26.5M54 20L55.3 26.5M43.5 38.5L46.2 43M55.3 38.5L52.6 43M40.5 15.4L45 20H54L58.4 15.4" />
        <path d="M40.9 47V70M58.4 47V70M40.9 46.9L49.6 51.2L58.4 46.9M40.9 69L49.6 64.4L58.4 69M40.9 56.3H58.4M40.9 60.5H58.4M49.6 51.2V64.4" />
        <path d="M29 16L40.6 15.4M26 28L40.6 31.5M29.6 34L40.6 43M35 17L31 29M62.5 21L58.4 24M65.5 36L58.4 40" />
      </g>
      <rect className="hole" x="47.3" y="12.4" width="4.3" height="3" /><rect className="hole" x="66.2" y="32.4" width="5" height="12.6" />
    </>),
  },
  '1955-07': {
    title: 'July 17, 1955', label: 'Disneyland opens',
    // Sleeping Beauty Castle: a tall central tower, paired turrets, a low curtain wall and the gate.
    art: (<>
      <g className="sil">
        <rect x="43" y="28" width="14" height="56" /><path d="M42 28L50 6L58 28Z" /><rect x="49.5" y="1" width=".9" height="5.5" /><path d="M50.4 1L55.5 2.6L50.4 4.2Z" />
        <rect x="33" y="40" width="8.4" height="44" /><path d="M32 40L37.2 22L42.4 40Z" /><rect x="58.6" y="40" width="8.4" height="44" /><path d="M57.6 40L62.8 22L68 40Z" />
        <rect x="23" y="52" width="7.4" height="32" /><path d="M22 52L26.7 38L31.4 52Z" /><rect x="69.6" y="52" width="7.4" height="32" /><path d="M68.6 52L73.3 38L78 52Z" />
        <rect x="13.5" y="60" width="6.5" height="24" /><path d="M12.6 60L16.8 51L21 60Z" /><rect x="80" y="60" width="6.5" height="24" /><path d="M79 60L83.2 51L87.4 60Z" />
        <rect x="14" y="66" width="72" height="18" /><rect x="0" y="84" width="100" height="3.4" />
      </g>
      <path className="hole" d="M45.4 84V75Q50 66.4 54.6 75V84Z" />
      <path className="gap" d="M50 31V40M37.2 44V50M62.8 44V50M26.7 56V62M73.3 56V62M16 66H84M43 66H57" />
    </>),
  },
  '1984-01': {
    title: 'January 24, 1984', label: 'The Apple Macintosh (128K) launches', box: '0 0 70 78',
    // The original all-in-one Mac: a tall beige case with a small screen and floppy slot, the keyboard and the mouse on its cord.
    art: (<>
      <g className="sil">
        <rect x="6" y="2" width="49.5" height="51.5" rx="3.2" /><rect x="10" y="53" width="42" height="4.4" />
        <rect x="1.5" y="56.5" width="54" height="19" rx="2.2" /><rect x="57.5" y="63" width="10.8" height="12.5" rx="2.6" />
      </g>
      <g className="ln"><path d="M55.5 53.5Q63 53.5 63.4 63" /></g>
      <g className="hole"><rect x="11.3" y="9" width="34.2" height="25" rx="3.4" /><rect x="29" y="42.4" width="17" height="2" rx="1" /></g>
      <g className="gap">
        <rect x="9.5" y="8.4" width="37.7" height="27.2" rx="1.2" style={{ fill: 'none' }} /><rect x="9.8" y="46.6" width="2.8" height="3" style={{ fill: 'none' }} />
        <rect x="7" y="58.4" width="43.6" height="9.6" rx="1" style={{ fill: 'none' }} /><path d="M7 62.6H50.6M11 59.4V65.4M14.5 59.4V65.4M18 59.4V65.4M21.5 59.4V65.4M25 59.4V65.4M28.5 59.4V65.4M32 59.4V65.4M35.5 59.4V65.4M39 59.4V65.4M42.5 59.4V65.4M46 59.4V65.4" />
        <path d="M17 67.2H41M57.5 67H68.3" />
      </g>
    </>),
  },
  '1981-08': {
    title: 'August 1, 1981', label: 'MTV launches', box: '0 0 100 58',
    // A blocky striped "M" with a scrawled "TV" over it, the channel's look when it launched.
    art: (<>
      <defs><clipPath id="mtv-clip"><path d="M3 3.4H33.6L45 15L56.4 3.4H87V53.4H57V31.4L45 39.6L34.2 31.4V53.4H3Z" /><path d="M87 3.4L93 6V52L87 53.4Z" /></clipPath></defs>
      <g className="sil"><path d="M3 3.4H33.6L45 15L56.4 3.4H87V53.4H57V31.4L45 39.6L34.2 31.4V53.4H3Z" /><path d="M87 3.4L93 6V52L87 53.4Z" /></g>
      <g clipPath="url(#mtv-clip)"><path className="gap" style={{ strokeWidth: 1.6 }} d="M-56 0L4 60M-48 0L12 60M-40 0L20 60M-32 0L28 60M-24 0L36 60M-16 0L44 60M-8 0L52 60M0 0L60 60M8 0L68 60M16 0L76 60M24 0L84 60M32 0L92 60M40 0L100 60M48 0L108 60M56 0L116 60M64 0L124 60M72 0L132 60M80 0L140 60M88 0L148 60" /></g>
      <path className="gap" d="M87 3.4V53.4" />
      <path className="gap" style={{ strokeWidth: 6.4, strokeLinecap: 'round', strokeLinejoin: 'round' }} d="M41.4 30L75.6 15M62 19.2L60.8 46.8M70.8 26.8L80.4 42L97 13" />
    </>),
  },
  '1969-08': {
    title: 'August 15–18, 1969', label: 'Woodstock', box: '0 0 100 70',
    // A dove perched on the neck of a guitar held by a hand: the festival's emblem.
    art: (<>
      <g className="sil">
        <circle cx="42.6" cy="6.6" r="5.4" />
        <path d="M45 10L39.6 11L32.4 19Q31.2 22 31.8 26.2Q32.4 31 34.2 34.6Q37 38.5 40.2 40.6Q44.5 43 48.6 43L52.2 42.4Q56 40 59.4 37L65.4 31L70.2 31L67.6 27.5L69 24Q73 21 75 17.8L74.5 14.5L67 13Q63 16 61.4 19.6Z" />
        <rect x="51.5" y="36" width="1.3" height="9" />
        <path d="M3 45.4H64L64.2 42.4L69 40.6H90.6L95.4 43L96 55L93 58.8H69L64.2 57.4H3Z" />
        <rect x="66.6" y="33.6" width="4.8" height="4.4" rx="2" /><rect x="75" y="33.6" width="4.8" height="4.4" rx="2" /><rect x="83.4" y="33.6" width="4.8" height="4.4" rx="2" />
        <rect x="64.2" y="62.2" width="4.8" height="4.6" rx="2" /><rect x="73.8" y="62.2" width="4.8" height="4.6" rx="2" /><rect x="82.8" y="62.2" width="4.8" height="4.6" rx="2" />
        <rect x="68.4" y="37" width="1.2" height="30" /><rect x="76.8" y="37" width="1.2" height="30" /><rect x="85.2" y="37" width="1.2" height="30" />
        <path d="M17.8 44.2L19 41.2L24.4 38.2H37.2L41.4 40.6L42.4 48.4L39.6 49L34.2 46.6H19Z" />
        <rect x="15.6" y="52.6" width="5.4" height="12.4" rx="2.4" /><rect x="21.6" y="51" width="5.4" height="15.4" rx="2.4" /><rect x="28.8" y="50" width="6" height="17" rx="2.6" />
        <rect x="35.4" y="54" width="11.6" height="9.4" rx="3.6" />
      </g>
      <g className="hole"><rect x="65.6" y="44" width="24" height="3.6" rx="1.8" /><rect x="65.6" y="53.8" width="24" height="3.6" rx="1.8" /><path d="M45 8.2L46.6 10L44.4 10.4Z" /></g>
      <path className="gap" d="M17.8 44.2L19 41.2L24.4 38.2H37.2L41.4 40.6L42.4 48.4M19 46.6H34.2M15.6 52.6V62.6M21.3 51.4V65M27.8 50.2V65M35.2 53.4H47" />
    </>),
  },
  '1945-05': {
    title: 'May 8, 1945', label: 'Victory in Europe: the war in Europe ends',
    // A dove in flight carrying an olive branch.
    art: (<>
      <g className="sil">
        <path d="M25 44Q27 38.5 33.4 39.4Q39 40.4 43 44.4Q55 46.6 66 52L88 58.6L83.4 61.4L90 67L79 66.6L83 71L66.6 63.4Q55 62.4 46.4 57.4Q39.6 53.4 36.4 48.4Q30 47.6 25 44Z" />
        <path d="M18 43.6L25.4 42L25 45.4Z" />
        <path d="M43 45Q41.4 27 59 9Q63.6 21 59 36Q57.4 42 55.6 48Z" />
        <path d="M44 46Q34 33 41 19Q46.6 28 50.6 41Z" />
        <ellipse cx="12" cy="45" rx="3.2" ry="1.3" transform="rotate(-50 12 45)" /><ellipse cx="8.6" cy="49.6" rx="3.2" ry="1.3" transform="rotate(-20 8.6 49.6)" />
        <ellipse cx="14.8" cy="41" rx="3" ry="1.2" transform="rotate(-80 14.8 41)" /><ellipse cx="6" cy="54" rx="3" ry="1.2" transform="rotate(15 6 54)" />
      </g>
      <g className="ln"><path d="M19 43.4Q10 44 5.6 55" /></g>
      <path className="gap" d="M48 40Q54 30 58 18M51 44Q58 34 60 24M44.6 40Q42 32 42.6 25M70 55L82 60.6M72 59L82 64" />
    </>),
  },
  '2007-06': {
    title: 'June 29, 2007', label: 'The first iPhone', box: '0 0 72 48',
    art: (<g transform="rotate(-12 36 24)">
      <rect className="sil" x="4" y="7" width="64" height="34" rx="5.5" />
      <rect className="hole" x="15.4" y="10" width="41.2" height="28" rx="1" />
      <circle className="hole" cx="62.3" cy="24" r="3.3" />
      <rect className="hole" x="8.9" y="19.5" width="1.7" height="9" rx=".85" />
    </g>),
  },
  '2001-09': {
    title: 'September 11, 2001', label: 'September 11 attacks',
    art: (<>
      <g className="sil">
        <rect x="34" y="22" width="14" height="64" /><rect x="53" y="22" width="14" height="64" />
        <path d="M40.3 22L40.8 3L41.2 1L41.6 3L42 14L42.6 14L42.8 22Z" /><rect x="35" y="20.6" width="12" height=".9" /><rect x="55" y="20.4" width="10" height=".9" />
        <rect x="3" y="82" width="94" height="5" />
        <rect x="6" y="72" width="8" height="12" rx="1" /><rect x="17" y="62" width="9" height="22" /><rect x="26" y="76" width="8" height="8" />
        <rect x="47" y="76" width="7" height="8" /><rect x="67" y="75" width="3" height="9" /><rect x="70" y="65" width="8" height="19" /><rect x="78" y="76" width="4" height="8" />
        <rect x="82" y="78" width="8" height="6" /><rect x="88" y="80" width="7" height="4" />
      </g>
      <path className="gap" d="M47 24V84M66 24V84" />
    </>),
  },
};

/** The silhouette for a month, if it has one. */
export function EventMark({ at }: { at: YM }) {
  const m = EVENTS[at];
  return m ? <svg className="towers" viewBox={m.box || '0 0 100 90'} preserveAspectRatio="xMaxYMax meet" aria-hidden="true">{m.art}</svg> : null;
}
