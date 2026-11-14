// Typewriter text for the welcome flow. Respects prefers-reduced-motion.
import { useEffect, useRef, useState } from 'react';
import { blip } from './sound';

export const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Dialogue, one line at a time: each line types itself out, holds, then is replaced by the next.
 * The last line stays. `fast` jumps straight to the end; onDone fires once the last line is typed.
 */
export function Typer({ lines, fast, onDone }: { lines: string[]; fast?: boolean; onDone?: () => void }) {
  const [i, setI] = useState(0), [n, setN] = useState(0);
  const sent = useRef(false);
  const instant = fast || still();
  const last = lines.length - 1;
  useEffect(() => {
    if (instant && i < last) { setI(last); setN(lines[last].length); return; }
    if (n < lines[i].length) {
      if (instant) { setN(lines[i].length); return; }
      const t = setTimeout(() => { blip(lines[i][n]); setN(n + 1); }, 28);
      return () => clearTimeout(t);
    }
    if (i < last) { const t = setTimeout(() => { setI(i + 1); setN(0); }, 1100); return () => clearTimeout(t); }
    if (!sent.current) { const t = setTimeout(() => { sent.current = true; onDone?.(); }, instant ? 0 : 450); return () => clearTimeout(t); }
  }, [i, n, instant]);
  return <p>{lines[i].slice(0, n)}{(n < lines[i].length || i < last) && <span className="caret" aria-hidden="true" />}</p>;
}
