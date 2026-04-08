import type { GlobalConfig } from 'payload'

export const FirstPurchasePromo: GlobalConfig = {
  slug: 'first-purchase-promo',
  label: 'Sleva na první nákup',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'discountAmount',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 100,
      label: 'Výše slevy (Kč)',
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      label: 'Ikona na stránce produktu',
      required: false,
    },
  ],
}
