import type { GlobalConfig } from 'payload'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Nastavení webu',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'hideStripe',
      type: 'checkbox',
      label: 'Skrýt Stripe',
      defaultValue: false,
      admin: {
        description: 'Po zaškrtnutí se Stripe nezobrazí mezi platebními metodami.',
      },
    },
    {
      name: 'hideGlobalPayments',
      type: 'checkbox',
      label: 'Skrýt Global Payments',
      defaultValue: false,
      admin: {
        description: 'Po zaškrtnutí se Global Payments nezobrazí mezi platebními metodami.',
      },
    },
    {
      name: 'freeShippingThreshold',
      type: 'number',
      label: 'Doprava zdarma od',
      min: 0,
      defaultValue: 1500,
      admin: {
        description:
          'Hodnota objednavky v Kc, od ktere budou bezne dopravy zdarma. Dopravy na dobirku zustavaji vzdy placene.',
      },
    },
  ],
}
