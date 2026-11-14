import type { ViewDef, ViewProps } from '../views';
import Timeline from '../Timeline';

export const view: ViewDef = {
  id: 'hw',
  name: 'Timeline with significant events',
  at: 10,
  icon: 'M3 12h18M7 12v-5M12 12v-7M17 12v-4M9.5 12v5M14.5 12v6',
  legend: false,
};

export default function View({ s, onCell }: ViewProps) {
  return <Timeline s={s} dir="h" world onCell={onCell} />;
}
