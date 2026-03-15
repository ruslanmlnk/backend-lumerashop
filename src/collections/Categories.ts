import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'showInMenu', 'sortOrder', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: '\u041d\u0430\u0437\u0432\u0430 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457',
    },
    slugField({
      useAsSlug: 'name',
    }),
    {
      name: 'showInMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show in menu',
      admin: {
        position: 'sidebar',
        description: 'Display this category in the main header category menu.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      label: 'Sort order',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: '\u041e\u043f\u0438\u0441',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: '\u0417\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457',
    },
  ],
}
