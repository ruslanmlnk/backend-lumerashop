import type { CollectionConfig, Where } from 'payload'
import { slugField } from 'payload'

const requireUploadedMedia = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return true
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return true
  }

  if (typeof value === 'object' && value !== null) {
    return true
  }

  return 'Upload a media file.'
}

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: [
      'name',
      'price',
      'category',
      'categoryGroup',
      'status',
      'isFeatured',
      'isRecommended',
      'updatedAt',
    ],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Product name',
    },
    slugField({
      useAsSlug: 'name',
    }),
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          type: 'number',
          required: true,
          label: 'Price (CZK)',
        },
        {
          name: 'oldPrice',
          type: 'number',
          label: 'Old price',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'sku',
          type: 'text',
          label: 'SKU',
        },
        {
          name: 'stockQuantity',
          type: 'number',
          label: 'Stock quantity',
          defaultValue: 0,
          admin: {
            width: '50%',
          },
        },
        {
          name: 'purchaseCount',
          type: 'number',
          label: 'Purchase count',
          defaultValue: 0,
          min: 0,
          admin: {
            width: '50%',
            description: 'Used for popularity sorting on the storefront.',
          },
        },
      ],
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      label: 'Short description',
      admin: {
        description: 'Compact intro shown next to the product title.',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Plain description',
      admin: {
        description: 'Plain text used for summaries, fallbacks and feeds.',
      },
    },
    {
      name: 'descriptionContent',
      type: 'richText',
      label: 'Popis tab content',
      admin: {
        description: 'Fully editable content for the first "Popis" tab on the product page.',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      label: 'Category',
    },
    {
      name: 'categoryGroup',
      type: 'relationship',
      relationTo: 'category-groups',
      label: 'Category group',
      filterOptions: ({ data }) => {
        if (data?.category) {
          return {
            category: {
              equals: data.category,
            },
          } as Where
        }

        return true
      },
      admin: {
        description: 'Second navigation level used for grouped catalog menus and category landing pages.',
      },
    },
    {
      name: 'subcategories',
      type: 'relationship',
      relationTo: 'subcategories',
      hasMany: true,
      label: 'Subcategories',
      filterOptions: ({ data }) => {
        if (data?.categoryGroup) {
          return {
            categoryGroup: {
              equals: data.categoryGroup,
            },
          } as Where
        }

        if (data?.category) {
          return {
            category: {
              equals: data.category,
            },
          } as Where
        }

        return true
      },
    },
    {
      name: 'mainImage',
      type: 'upload',
      hasMany: false,
      relationTo: 'media',
      label: 'Main image',
      validate: requireUploadedMedia,
    },
    {
      name: 'gallery',
      type: 'array',
      label: 'Gallery media',
      admin: {
        description: 'Add images or videos shown in the product gallery on the storefront.',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          hasMany: false,
          relationTo: 'media',
          label: 'Media',
          validate: requireUploadedMedia,
        },
      ],
    },
    {
      name: 'highlights',
      type: 'array',
      label: 'Top bullet list',
      admin: {
        description: 'Bullets shown under shipping/returns on the product page. Separate from the "Specifications / Další informace" tab.',
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
          label: 'Highlight',
        },
      ],
    },
    {
      name: 'specifications',
      type: 'array',
      label: 'Specifications',
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
          label: 'Field',
        },
        {
          name: 'value',
          type: 'text',
          required: true,
          label: 'Value',
        },
      ],
    },
    {
      name: 'productReviews',
      type: 'join',
      collection: 'product-reviews',
      on: 'product',
      label: 'Product reviews',
      admin: {
        allowCreate: false,
        defaultColumns: ['authorName', 'rating', 'show', 'submittedAt'],
      },
    },
    {
      name: 'variantProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Variant products',
      admin: {
        description: 'Pick products that should appear in the color/variant block on the product page.',
      },
    },
    {
      name: 'filterOptions',
      type: 'relationship',
      relationTo: 'filter-options',
      hasMany: true,
      label: 'Filter options',
      admin: {
        description: 'Pick all filter options that apply to this product.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        {
          label: 'Draft',
          value: 'draft',
        },
        {
          label: 'Published',
          value: 'published',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      label: 'Featured product',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isRecommended',
      type: 'checkbox',
      label: 'Recommended product',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'deliveryTime',
      type: 'number',
      label: 'Delivery time (days)',
      admin: {
        description: 'If set, displays "Do X dnů" on the storefront.',
        position: 'sidebar',
      },
    },
  ],
}
