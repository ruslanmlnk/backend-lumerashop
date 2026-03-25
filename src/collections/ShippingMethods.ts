import type { CollectionConfig } from 'payload'

import { SHIPPING_METHOD_PRESETS } from '../data/shipping-methods'

export const ShippingMethods: CollectionConfig = {
  slug: 'shipping-methods',
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
      label: 'Shipping method',
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
      label: 'Price (CZK)',
      min: 0,
    },
    {
      name: 'isActive',
      type: 'checkbox',
      label: 'Active on checkout',
      defaultValue: true,
    },
    {
      name: 'cashOnDelivery',
      type: 'checkbox',
      label: 'Na dobirku',
      defaultValue: false,
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Sort order',
      defaultValue: 10,
    },
  ],
}
