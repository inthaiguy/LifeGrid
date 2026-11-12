import { useState } from 'react';
import { Typer } from './Typer';

/** The last bit of the welcome: a short note over the grid, one line at a time, ending in a button. */
export default function Coach({ lines, onClose }: { lines: string[]; onClose: () => void }) {
  const [done, setDone] = useState(false), [fast, setFast] = useState(false);
  return (
    <div className="coach" role="status" onClick={() => setFast(true)}>
      <Typer lines={lines} fast={fast} onDone={() => setDone(true)} />
      <button className="primary" disabled={!done} onClick={(e) => { e.stopPropagation(); onClose(); }}>Got it</button>
    </div>
  );
}
