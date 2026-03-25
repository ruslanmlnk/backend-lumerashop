import * as migration_20260309_041140_add_ppl_shipment from './20260309_041140_add_ppl_shipment';
import * as migration_20260319_110000_split_menu_visibility from './20260319_110000_split_menu_visibility';
import * as migration_20260319_160500_add_first_purchase_discount from './20260319_160500_add_first_purchase_discount';
import * as migration_20260322_120000_add_category_desktop_dropdown_menu from './20260322_120000_add_category_desktop_dropdown_menu';
import * as migration_20260323_090000_add_catalog_filter_visibility from './20260323_090000_add_catalog_filter_visibility';
import * as migration_20260325_080952 from './20260325_080952';

export const migrations = [
  {
    up: migration_20260309_041140_add_ppl_shipment.up,
    down: migration_20260309_041140_add_ppl_shipment.down,
    name: '20260309_041140_add_ppl_shipment',
  },
  {
    up: migration_20260319_110000_split_menu_visibility.up,
    down: migration_20260319_110000_split_menu_visibility.down,
    name: '20260319_110000_split_menu_visibility',
  },
  {
    up: migration_20260319_160500_add_first_purchase_discount.up,
    down: migration_20260319_160500_add_first_purchase_discount.down,
    name: '20260319_160500_add_first_purchase_discount',
  },
  {
    up: migration_20260322_120000_add_category_desktop_dropdown_menu.up,
    down: migration_20260322_120000_add_category_desktop_dropdown_menu.down,
    name: '20260322_120000_add_category_desktop_dropdown_menu',
  },
  {
    up: migration_20260323_090000_add_catalog_filter_visibility.up,
    down: migration_20260323_090000_add_catalog_filter_visibility.down,
    name: '20260323_090000_add_catalog_filter_visibility',
  },
  {
    up: migration_20260325_080952.up,
    down: migration_20260325_080952.down,
    name: '20260325_080952'
  },
];
