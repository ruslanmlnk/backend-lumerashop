import * as migration_20260309_041140_add_ppl_shipment from './20260309_041140_add_ppl_shipment';
import * as migration_20260319_110000_split_menu_visibility from './20260319_110000_split_menu_visibility';
import * as migration_20260319_160500_add_first_purchase_discount from './20260319_160500_add_first_purchase_discount';

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
  {
    up: migration_20260319_160500_add_first_purchase_discount.up,
    down: migration_20260319_160500_add_first_purchase_discount.down,
    name: '20260319_160500_add_first_purchase_discount'
  },
];
