import type { CollectionConfig } from 'payload'

import { catalogFilterVisibilityFields } from '../fields/catalogFilterVisibilityFields'
import { buildSubcategorySlug, resolveCategoryGroupRelation, resolveCategoryRelation } from '../utilities/categoryHierarchy'

export const Subcategories: CollectionConfig = {
  slug: 'subcategories',
  labels: {
    singular: 'Podkategorie',
    plural: 'Podkategorie',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'categoryGroup', 'slug', 'showInDesktopMenu', 'showInMobileMenu', 'sortOrder', 'updatedAt'],
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

        const resolvedCategoryGroup = await resolveCategoryGroupRelation(req, data.categoryGroup)
        const resolvedCategory =
          (await resolveCategoryRelation(req, data.category)) ??
          (resolvedCategoryGroup?.categoryId != null
            ? await resolveCategoryRelation(req, resolvedCategoryGroup.categoryId)
            : null)

        if (!resolvedCategoryGroup || !resolvedCategory) {
          return data
        }

        return {
          ...data,
          category: resolvedCategory.id,
          categoryGroup: resolvedCategoryGroup.id,
          slug: buildSubcategorySlug(resolvedCategoryGroup.slug, name),
        }
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Název podkategorie',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Generuje se z nadřazené skupiny a názvu podkategorie, aby byly URL na webu jedinečné.',
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
        description: 'Zobrazí tuto podkategorii v desktopovém vnořeném menu pod nadřazenou skupinou kategorií.',
      },
    },
    {
      name: 'showInMobileMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Zobrazit v mobilním menu',
      admin: {
        position: 'sidebar',
        description: 'Zobrazí tuto podkategorii v mobilní navigaci.',
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
      name: 'categoryGroup',
      type: 'relationship',
      relationTo: 'category-groups',
      required: true,
      label: 'Nadřazená skupina kategorií',
      filterOptions: ({ data }) => {
        if (data?.category) {
          return {
            category: {
              equals: data.category,
            },
          }
        }

        return true
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
      label: 'Obrázek podkategorie',
    },
  ],
}
