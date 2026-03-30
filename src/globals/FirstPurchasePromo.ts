import type { GlobalConfig } from 'payload'

export const FirstPurchasePromo: GlobalConfig = {
  slug: 'first-purchase-promo',
  label: 'First purchase promo',
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
      label: 'Discount amount (CZK)',
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      label: 'Product page icon',
      required: false,
    },
  ],
}
