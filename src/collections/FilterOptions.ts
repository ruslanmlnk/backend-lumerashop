import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

export const FilterOptions: CollectionConfig = {
  slug: 'filter-options',
  labels: {
    singular: 'Možnost filtru',
    plural: 'Možnosti filtrů',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'group', 'slug', 'sortOrder', 'isActive', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Název možnosti',
    },
    slugField({
      useAsSlug: 'name',
    }),
    {
      name: 'group',
      type: 'relationship',
      relationTo: 'filter-groups',
      required: true,
      label: 'Skupina filtrů',
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      label: 'Pořadí',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Aktivní',
    },
  ],
}
