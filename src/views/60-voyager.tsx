import type { ViewDef, ViewProps } from '../views';
import Voyager from '../Voyager';

export const view: ViewDef = {
  id: 'voyager',
  name: 'Voyager view',
  at: 50,
  icon: 'M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0M3 15.500c3 2.500 15 -2.500 18 -7M4 4.500l.01 0M19 18.500l.01 0M17.500 4l.01 0',
  legend: false,
};

export default function View({ s, onCell }: ViewProps) {
  return <Voyager s={s} onCell={onCell} />;
}
