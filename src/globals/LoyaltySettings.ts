import type { GlobalConfig } from 'payload'

export const LoyaltySettings: GlobalConfig = {
  slug: 'loyalty-settings',
  label: 'Loyalty settings',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'bonusesEnabled',
      type: 'checkbox',
      label: 'Enable bonus points',
      defaultValue: true,
    },
    {
      name: 'earningRule',
      type: 'group',
      label: 'Bonus earning rule',
      fields: [
        {
          name: 'spendAmount',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 100,
          label: 'Spent amount (CZK)',
          admin: {
            description: 'For every X CZK paid for products, award bonus units.',
          },
        },
        {
          name: 'bonusUnits',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 5,
          label: 'Bonus units awarded',
        },
      ],
    },
    {
      name: 'redemptionRule',
      type: 'group',
      label: 'Bonus redemption rule',
      fields: [
        {
          name: 'bonusUnits',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 5,
          label: 'Bonus units to spend',
        },
        {
          name: 'discountAmount',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 100,
          label: 'Discount amount (CZK)',
          admin: {
            description: 'How much money the selected bonus block removes from product subtotal.',
          },
        },
      ],
    },
  ],
}
