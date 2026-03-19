import type { CollectionConfig } from 'payload'

import { buildSubcategorySlug, resolveCategoryGroupRelation, resolveCategoryRelation } from '../utilities/categoryHierarchy'

export const Subcategories: CollectionConfig = {
  slug: 'subcategories',
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
      label: '\u041d\u0430\u0437\u0432\u0430 \u043f\u0456\u0434\u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u0457',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Generated from the parent group and subcategory name to keep storefront URLs unique.',
      },
    },
    {
      name: 'showInMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Legacy menu visibility',
      admin: {
        hidden: true,
        position: 'sidebar',
        description: 'Legacy visibility flag kept only for backward compatibility.',
      },
    },
    {
      name: 'showInDesktopMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show in desktop menu',
      admin: {
        position: 'sidebar',
        description: 'Display this subcategory in the desktop nested menu under its parent category group.',
      },
    },
    {
      name: 'showInMobileMenu',
      type: 'checkbox',
      defaultValue: false,
      label: 'Show in mobile menu',
      admin: {
        position: 'sidebar',
        description: 'Display this subcategory in the mobile navigation menu.',
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
      label: '\u0411\u0430\u0442\u044c\u043a\u0456\u0432\u0441\u044c\u043a\u0430 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0456\u044f',
    },
    {
      name: 'categoryGroup',
      type: 'relationship',
      relationTo: 'category-groups',
      required: true,
      label: 'Parent category group',
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
