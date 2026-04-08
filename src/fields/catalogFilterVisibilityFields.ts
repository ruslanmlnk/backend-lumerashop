import type { Field } from 'payload'

export const catalogFilterVisibilityFields: Field[] = [
  {
    type: 'collapsible',
    label: 'Viditelnost katalogových filtrů',
    admin: {
      initCollapsed: true,
    },
    fields: [
      {
        name: 'hiddenFilterGroups',
        type: 'relationship',
        relationTo: 'filter-groups',
        hasMany: true,
        label: 'Skryté skupiny filtrů',
        admin: {
          description: 'Skryje celé skupiny filtrů, například Materiál nebo Barva, na této úrovni kategorie ve storefrontu.',
        },
      },
      {
        name: 'hiddenFilterOptions',
        type: 'relationship',
        relationTo: 'filter-options',
        hasMany: true,
        label: 'Skryté možnosti filtrů',
        admin: {
          description: 'Skryje jen konkrétní možnosti filtrů, například Černá, a ostatní část filtru zůstane viditelná.',
        },
      },
    ],
  },
]
