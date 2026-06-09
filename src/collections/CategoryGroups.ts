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

        const categoryValues = Array.isArray(data.categories) ? data.categories : []
        const resolvedCategory =
          (await resolveCategoryRelation(req, data.category)) ??
          (categoryValues.length > 0 ? await resolveCategoryRelation(req, categoryValues[0]) : null)
        if (!resolvedCategory) {
          return data
        }

        const categories = Array.from(
          new Set([
            resolvedCategory.id,
            ...categoryValues
              .map((value) =>
                typeof value === 'object' && value && 'id' in value && value.id != null ? value.id : value,
              )
              .filter((value): value is number | string => typeof value === 'number' || typeof value === 'string'),
          ]),
        )

        return {
          ...data,
          category: resolvedCategory.id,
          categories,
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
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      required: true,
      label: 'Kategorie, ve kterých se skupina zobrazuje',
      admin: {
        description:
          'Jednu skupinu, například Materiál, lze zobrazit ve více kategoriích bez vytváření kopií. Původní nadřazená kategorie zůstává primární kvůli kompatibilitě.',
      },
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
