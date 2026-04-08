import type { CollectionConfig } from 'payload'

import { SHIPPING_METHOD_PRESETS } from '../data/shipping-methods'

export const ShippingMethods: CollectionConfig = {
  slug: 'shipping-methods',
  labels: {
    singular: 'Způsob dopravy',
    plural: 'Způsoby dopravy',
  },
  admin: {
    useAsTitle: 'methodId',
    defaultColumns: ['methodId', 'price', 'cashOnDelivery', 'isActive', 'sortOrder', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'methodId',
      type: 'select',
      required: true,
      unique: true,
      label: 'Způsob dopravy',
      options: SHIPPING_METHOD_PRESETS.map((method) => ({
        label: method.label,
        value: method.id,
      })),
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Cena (Kč)',
      min: 0,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Aktivní v pokladně',
      defaultValue: true,
    },
    {
      name: 'cashOnDelivery',
      type: 'checkbox',
      label: 'Dobírka',
      defaultValue: false,
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Pořadí',
      defaultValue: 10,
    },
  ],
}
