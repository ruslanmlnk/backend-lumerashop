import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

export const FilterGroups: CollectionConfig = {
  slug: 'filter-groups',
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
      label: 'Group name',
    },
    slugField({
      useAsSlug: 'name',
    }),
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      label: 'Sort order',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active',
    },
  ],
}
