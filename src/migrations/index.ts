import * as migration_20260309_041140_add_ppl_shipment from './20260309_041140_add_ppl_shipment';
import * as migration_20260319_110000_split_menu_visibility from './20260319_110000_split_menu_visibility';
import * as migration_20260319_160500_add_first_purchase_discount from './20260319_160500_add_first_purchase_discount';
import * as migration_20260322_120000_add_category_desktop_dropdown_menu from './20260322_120000_add_category_desktop_dropdown_menu';
import * as migration_20260323_090000_add_catalog_filter_visibility from './20260323_090000_add_catalog_filter_visibility';
import * as migration_20260325_080952 from './20260325_080952';
import * as migration_20260325_120000_add_cash_on_delivery_and_order_notifications from './20260325_120000_add_cash_on_delivery_and_order_notifications';
import * as migration_20260326_000000_add_order_confirmation_fields from './20260326_000000_add_order_confirmation_fields';
import * as migration_20260326_010000_add_order_cancellation_fields from './20260326_010000_add_order_cancellation_fields';

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
  {
    up: migration_20260325_120000_add_cash_on_delivery_and_order_notifications.up,
    down: migration_20260325_120000_add_cash_on_delivery_and_order_notifications.down,
    name: '20260325_120000_add_cash_on_delivery_and_order_notifications',
  },
  {
    up: migration_20260326_000000_add_order_confirmation_fields.up,
    down: migration_20260326_000000_add_order_confirmation_fields.down,
    name: '20260326_000000_add_order_confirmation_fields',
  },
  {
    up: migration_20260326_010000_add_order_cancellation_fields.up,
    down: migration_20260326_010000_add_order_cancellation_fields.down,
    name: '20260326_010000_add_order_cancellation_fields',
  },
];
