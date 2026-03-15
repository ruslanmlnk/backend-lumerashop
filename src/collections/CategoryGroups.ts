import type { CollectionConfig } from 'payload'

import { buildCategoryGroupSlug, resolveCategoryRelation } from '../utilities/categoryHierarchy'

export const CategoryGroups: CollectionConfig = {
  slug: 'category-groups',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'slug', 'showInMenu', 'sortOrder', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data || typeof data !== 'object') {
          return data
        }

        const name = typeof data.name === 'string' ? data.name.trim() : ''
        if (!name) {
          return data
        }

        const resolvedCategory = await resolveCategoryRelation(req, data.category)
        if (!resolvedCategory) {
          return data
        }

        return {
          ...data,
          category: resolvedCategory.id,
          slug: buildCategoryGroupSlug(resolvedCategory.slug, name),
        }
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Název skupiny kategorií',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Generated from the parent category and group name to keep menu URLs unique.',
      },
    },
    {
      name: 'showInMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show in menu',
      admin: {
        position: 'sidebar',
        description: 'Display this group in the header dropdown under its parent category.',
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
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: 'Parent category',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Popis',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Obrázek skupiny',
    },
  ],
}
