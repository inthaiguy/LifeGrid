import type { ViewDef, ViewProps } from '../views';
import Tree from '../Tree';

export const view: ViewDef = {
  id: 'tree',
  name: 'Tree view',
  at: 35,
  icon: 'M12 21v-8M12 13c-5 0-7.5-2.4-7.5-5.4C4.500 4.800 6.800 3 9.300 3.600 10 2.600 11 2.200 12 2.200s2 .4 2.700 1.400c2.500-.6 4.800 1.200 4.800 4 0 3-2.500 5.400-7.500 5.400zM12 17l3-2.500M8.500 21h7',
};

export default function View({ s, onCell }: ViewProps) {
  return <Tree s={s} onCell={onCell} />;
}
