import { type YM, yOf, mOf, addM } from './model';

// Google Photos search links carry a small base64 protobuf, worked out from links the app itself produces:
//   1: query text   4.2.1.4.1: { 1: year, 2: month, 3: day (0 = whole month) }   5: time of search (ms)   7: 3
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const varint = (n: number) => { const o: number[] = []; while (n > 127) { o.push((n % 128) | 128); n = Math.floor(n / 128); } o.push(n); return o; };
const num = (f: number, n: number) => [f << 3, ...varint(n)];
const len = (f: number, b: number[]) => [(f << 3) | 2, ...varint(b.length), ...b];

/** Link to the signed-in user's own Google Photos for one month. */
export function photosLink(at: YM, now = Date.now()): string {
  const y = yOf(at), m = mOf(at);
  const text = [...new TextEncoder().encode(`${MONTHS[m - 1]} ${y}`)];
  const date = len(4, len(2, len(1, len(4, len(1, [...num(1, y), ...num(2, m), ...num(3, 0)])))));
  const bytes = [...len(1, text), ...date, ...num(5, now), ...num(7, 3)];
  return 'https://photos.google.com/search/' + encodeURIComponent(btoa(String.fromCharCode(...bytes)));
}

/** Google Calendar on the web, month view. Undocumented, but it is the address the site itself uses. */
export function googleCalLink(at: YM): string {
  return `https://calendar.google.com/calendar/r/month/${yOf(at)}/${mOf(at)}/1`;
}

/** Apple Calendar on iPhone and iPad: calshow: plus seconds since 1 Jan 2001, here the 1st of the month. Undocumented. */
export function appleCalLink(at: YM): string {
  return `calshow:${Math.round((new Date(yOf(at), mOf(at) - 1, 1).getTime() - Date.UTC(2001, 0, 1)) / 1000)}`;
}


/** iPhone, iPod, or iPad (which reports itself as a Mac with a touch screen). */
export const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_PHONE = IS_IOS || /Android/.test(navigator.userAgent);


/** Gmail opened on 1 April 2004, so earlier months have no mail to show. */
export const GMAIL_START: YM = '2004-04';

/** Gmail began marking mail as important with Priority Inbox, launched 30 August 2010; September is the first full month. */
const GMAIL_IMPORTANT_START: YM = '2010-09';

/**
 * Gmail on the web, searched for everything dated within the month. Tried narrowing it (starred,
 * important, receipts, trips): the filter is accepted, but many months then come back empty, and a
 * link cannot fall back to a wider search, so the whole month is the dependable choice. A phone browser gets Gmail's
 * separate mobile site, which ignores the desktop #search/ route and has its own (#tl/search/, undocumented).
 */
export function gmailLink(at: YM): string {
  const day = (x: YM) => `${yOf(x)}/${String(mOf(x)).padStart(2, '0')}/01`;
  const q = encodeURIComponent(`after:${day(at)} before:${day(addM(at, 1))}`);
  if (IS_PHONE) return `https://mail.google.com/mail/mu/mp/#tl/search/${q}`;
  // On a computer, narrow to mail Gmail marked important, for months since it began doing so.
  const imp = at >= GMAIL_IMPORTANT_START ? '+is%3Aimportant' : '';
  return `https://mail.google.com/mail/u/0/#search/${q.replace(/%20/g, '+')}${imp}`;
}
