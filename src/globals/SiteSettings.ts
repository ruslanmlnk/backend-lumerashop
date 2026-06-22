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
  ],
}
