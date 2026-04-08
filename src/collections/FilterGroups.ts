import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

export const FilterGroups: CollectionConfig = {
  slug: 'filter-groups',
  labels: {
    singular: 'Skupina filtrů',
    plural: 'Skupiny filtrů',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'sortOrder', 'isActive', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Název skupiny',
    },
    slugField({
      useAsSlug: 'name',
    }),
    {
      name: 'description',
      type: 'textarea',
      label: 'Popis',
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
