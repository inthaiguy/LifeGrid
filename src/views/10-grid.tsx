import type { ViewDef, ViewProps } from '../views';
import Grid from '../Grid';

export const view: ViewDef = {
  id: 'grid',
  name: 'Grid',
  at: 0,
  icon: 'M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16',
  readable: true, // the header offers the Read / Overview toggle
};

export default function View({ s, read, onCell }: ViewProps) {
  return <Grid s={s} read={!!read} full onCell={onCell} />;
}
