import type { CollectionConfig } from 'payload'

import { catalogFilterVisibilityFields } from '../fields/catalogFilterVisibilityFields'
import { buildCategoryGroupSlug, resolveCategoryRelation } from '../utilities/categoryHierarchy'

export const CategoryGroups: CollectionConfig = {
  slug: 'category-groups',
  labels: {
    singular: 'Skupina kategorií',
    plural: 'Skupiny kategorií',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'slug', 'showInDesktopMenu', 'showInMobileMenu', 'sortOrder', 'updatedAt'],
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
        description: 'Generuje se z nadřazené kategorie a názvu skupiny, aby byly URL v menu jedinečné.',
      },
    },
    {
      name: 'showInMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Původní viditelnost v menu',
      admin: {
        hidden: true,
        position: 'sidebar',
        description: 'Původní přepínač viditelnosti ponechaný jen kvůli zpětné kompatibilitě.',
      },
    },
    {
      name: 'showInDesktopMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Zobrazit v desktopovém menu',
      admin: {
        position: 'sidebar',
        description: 'Zobrazí tuto skupinu v desktopovém rozbalovacím menu pod nadřazenou kategorií.',
      },
    },
    {
      name: 'showInMobileMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Zobrazit v mobilním menu',
      admin: {
        position: 'sidebar',
        description: 'Zobrazí tuto skupinu v mobilní navigaci.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      label: 'Pořadí',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: 'Nadřazená kategorie',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Popis',
    },
    ...catalogFilterVisibilityFields,
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Obrázek skupiny',
    },
  ],
}
