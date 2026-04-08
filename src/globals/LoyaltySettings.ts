import type { GlobalConfig } from 'payload'

export const LoyaltySettings: GlobalConfig = {
  slug: 'loyalty-settings',
  label: 'Nastavení věrnostního programu',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'bonusesEnabled',
      type: 'checkbox',
      label: 'Povolit bonusové body',
      defaultValue: true,
    },
    {
      name: 'earningRule',
      type: 'group',
      label: 'Pravidlo získávání bonusů',
      fields: [
        {
          name: 'spendAmount',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 100,
          label: 'Utracená částka (Kč)',
          admin: {
            description: 'Za každých X Kč zaplacených za produkty připište bonusové body.',
          },
        },
        {
          name: 'bonusUnits',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 5,
          label: 'Počet získaných bonusových bodů',
        },
      ],
    },
    {
      name: 'redemptionRule',
      type: 'group',
      label: 'Pravidlo uplatnění bonusů',
      fields: [
        {
          name: 'bonusUnits',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 5,
          label: 'Počet bonusových bodů k využití',
        },
        {
          name: 'discountAmount',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 100,
          label: 'Výše slevy (Kč)',
          admin: {
            description: 'Kolik peněz odečte vybraný bonusový blok z mezisoučtu produktů.',
          },
        },
      ],
    },
  ],
}
