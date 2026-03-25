import type { Field } from 'payload'

export const catalogFilterVisibilityFields: Field[] = [
  {
    type: 'collapsible',
    label: 'Catalog filter visibility',
    admin: {
      initCollapsed: true,
    },
    fields: [
      {
        name: 'hiddenFilterGroups',
        type: 'relationship',
        relationTo: 'filter-groups',
        hasMany: true,
        label: 'Hidden filter groups',
        admin: {
          description:
            'Hide entire filter groups such as Material or Barva on this category level in the storefront.',
        },
      },
      {
        name: 'hiddenFilterOptions',
        type: 'relationship',
        relationTo: 'filter-options',
        hasMany: true,
        label: 'Hidden filter options',
        admin: {
          description:
            'Hide only specific filter options such as Cerná while keeping the rest of the filter visible.',
        },
      },
    ],
  },
]
