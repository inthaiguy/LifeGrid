import type { ViewDef, ViewProps } from '../views';
import Timeline from '../Timeline';

export const view: ViewDef = {
  id: 'h',
  name: 'Horizontal timeline',
  at: 5,
  icon: 'M3 12h18M7 12v-5M12 12v-7M17 12v-4M7 12a.6.6 0 1 0 .01 0M12 12a.6.6 0 1 0 .01 0M17 12a.6.6 0 1 0 .01 0',
  legend: false,  // the band names each home itself
};

export default function View({ s, onCell }: ViewProps) {
  return <Timeline s={s} dir="h" onCell={onCell} />;
}
