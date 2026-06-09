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
      async ({ data, originalDoc, req }) => {
        if (!data || typeof data !== 'object') {
          return data
        }

        const name = typeof data.name === 'string' ? data.name.trim() : ''
        if (!name) {
          return data
        }

        const categoryValues = [
          ...(Array.isArray(data.category) ? data.category : data.category != null ? [data.category] : []),
          ...(Array.isArray(data.categories) ? data.categories : []),
        ]
        const resolvedCategories = (
          await Promise.all(categoryValues.map((value) => resolveCategoryRelation(req, value)))
        ).filter((category): category is NonNullable<typeof category> => category !== null)
        const uniqueCategories = Array.from(
          new Map(resolvedCategories.map((category) => [String(category.id), category])).values(),
        )
        const primaryCategory = uniqueCategories[0]

        if (!primaryCategory) {
          return data
        }

        const existingSlug =
          (typeof data.slug === 'string' ? data.slug.trim() : '') ||
          (originalDoc && typeof originalDoc.slug === 'string' ? originalDoc.slug.trim() : '')

        return {
          ...data,
          category: uniqueCategories.map((category) => category.id),
          categories: undefined,
          slug: existingSlug || buildCategoryGroupSlug(primaryCategory.slug, name),
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
      hasMany: true,
      required: true,
      label: 'Nadřazené kategorie',
      admin: {
        description:
          'Vyberte všechny kategorie, ve kterých se má skupina zobrazovat. První kategorie zachovává původní chování existujících URL.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Popis',
    },
    {
      name: 'productFilterOptions',
      type: 'relationship',
      relationTo: 'filter-options',
      hasMany: true,
      label: 'Automatické filtry produktů',
      admin: {
        description:
          'Tyto možnosti filtrů se automaticky přidají k produktu, když je produkt zařazený do této skupiny kategorií.',
      },
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
