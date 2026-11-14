import type { ViewDef, ViewProps } from '../views';
import Timeline from '../Timeline';

export const view: ViewDef = {
  id: 'v',
  name: 'Vertical timeline',
  at: 20,
  icon: 'M7 3v18M7 7h5M7 12h9M7 17h6',
};

export default function View({ s, onCell }: ViewProps) {
  return <Timeline s={s} dir="v" onCell={onCell} />;
}
