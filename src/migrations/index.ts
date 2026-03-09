import * as migration_20260309_041140_add_ppl_shipment from './20260309_041140_add_ppl_shipment';

export const migrations = [
  {
    up: migration_20260309_041140_add_ppl_shipment.up,
    down: migration_20260309_041140_add_ppl_shipment.down,
    name: '20260309_041140_add_ppl_shipment'
  },
];
