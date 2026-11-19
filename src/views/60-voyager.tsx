import type { ViewDef, ViewProps } from '../views';
import Voyager from '../Voyager';

export const view: ViewDef = {
  id: 'voyager',
  name: 'Voyager view',
  at: 50,
  icon: 'M4 9.5a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0M8.3 9.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M13.4 13.4l6.1 6.1M17.8 21.2l3.4-3.4M14.7 7.2L21 3.500M6.2 14l-2.4 4.5',
  legend: false,
};

export default function View({ s, onCell }: ViewProps) {
  return <Voyager s={s} onCell={onCell} />;
}
