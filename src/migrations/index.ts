import * as migration_20260309_041140_add_ppl_shipment from './20260309_041140_add_ppl_shipment';
import * as migration_20260319_110000_split_menu_visibility from './20260319_110000_split_menu_visibility';

export const migrations = [
  {
    up: migration_20260309_041140_add_ppl_shipment.up,
    down: migration_20260309_041140_add_ppl_shipment.down,
    name: '20260309_041140_add_ppl_shipment'
  },
  {
    up: migration_20260319_110000_split_menu_visibility.up,
    down: migration_20260319_110000_split_menu_visibility.down,
    name: '20260319_110000_split_menu_visibility'
  },
];
