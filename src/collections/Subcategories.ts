import { APIError, type CollectionConfig } from 'payload'

import { catalogFilterVisibilityFields } from '../fields/catalogFilterVisibilityFields'
import { buildSubcategorySlug, resolveCategoryGroupRelation, resolveCategoryRelations } from '../utilities/categoryHierarchy'

export const Subcategories: CollectionConfig = {
  slug: 'subcategories',
  labels: {
    singular: 'Podkategorie',
    plural: 'Podkategorie',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'categories', 'categoryGroup', 'slug', 'showInDesktopMenu', 'showInMobileMenu', 'sortOrder', 'updatedAt'],
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

        const categoryGroupValue = data.categoryGroup ?? originalDoc?.categoryGroup
        const categoryValues = data.categories ?? originalDoc?.categories
        const resolvedCategoryGroup = await resolveCategoryGroupRelation(req, categoryGroupValue)
        const resolvedCategories = await resolveCategoryRelations(req, categoryValues)

        if (!resolvedCategoryGroup || resolvedCategories.length === 0) {
          return data
        }

        const groupCategoryIds = new Set(resolvedCategoryGroup.categoryIds.map(String))
        const invalidCategories = resolvedCategories.filter((category) => !groupCategoryIds.has(String(category.id)))

        if (invalidCategories.length > 0) {
          throw new APIError(
            'Každá nadřazená kategorie podkategorie musí být také přiřazena k vybrané skupině kategorií.',
            400,
          )
        }

        return {
          ...data,
          categories: resolvedCategories.map((category) => category.id),
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
      name: 'categoryGroup',
      type: 'relationship',
      relationTo: 'category-groups',
      required: true,
      label: 'Nadřazená skupina kategorií',
      admin: {
        description: 'Vyberte skupinu, pod kterou se má podkategorie zobrazovat.',
      },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      required: true,
      label: 'Nadřazené kategorie',
      admin: {
        description:
          'Vyberte všechny kategorie, ve kterých se má podkategorie zobrazovat. Kategorie musí být současně přiřazené k vybrané skupině.',
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
          'Tyto možnosti filtrů se automaticky přidají k produktu, když je produkt zařazený do této podkategorie.',
      },
    },
    {
      name: 'linkedFilterOptions',
      type: 'relationship',
      relationTo: 'filter-options',
      hasMany: true,
      label: 'Propojené možnosti filtrů',
      admin: {
        description:
          'Pokud jsou vybrané, stránka podkategorie automaticky zobrazí produkty s těmito možnostmi filtrů.',
      },
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
