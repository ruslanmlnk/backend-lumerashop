import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

export const Subcategories: CollectionConfig = {
  slug: 'subcategories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'showInMenu', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: '\u041d\u0430\u0437\u0432\u0430 \u043f\u0456\u0434\u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457',
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
        description: 'Display this subcategory in the header dropdown under its parent category.',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: '\u0411\u0430\u0442\u044c\u043a\u0456\u0432\u0441\u044c\u043a\u0430 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f',
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
      label: '\u0417\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u043d\u044f \u043f\u0456\u0434\u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457',
    },
  ],
}
