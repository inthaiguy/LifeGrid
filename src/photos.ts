import { type YM, yOf, mOf } from './model';

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
