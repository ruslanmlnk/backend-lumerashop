import type { CollectionConfig, Where } from 'payload'
import { slugField } from 'payload'

type ReviewAuthor = {
  id?: number | string
  email?: string
  firstName?: string
  lastName?: string
  role?: string
} | null

type ReviewSubmissionBody = {
  productId?: unknown
  rating?: unknown
  comment?: unknown
}

const requireUploadedImage = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return true
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return true
  }

  if (typeof value === 'object' && value !== null) {
    return true
  }

  return 'Upload an image.'
}

const asReviewAuthor = (value: unknown): ReviewAuthor => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  return value as ReviewAuthor
}

const normalizeDocumentId = (value: unknown) => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const trimmed = value.trim()
    const numeric = Number(trimmed)

    return Number.isInteger(numeric) ? numeric : trimmed
  }

  return null
}

const parseReviewRating = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)

  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
    return null
  }

  return numeric
}

const parseReviewComment = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()

  if (trimmed.length < 3 || trimmed.length > 2000) {
    return ''
  }

  return trimmed
}

const getReviewerName = (value: unknown) => {
  const reviewer = asReviewAuthor(value)
  if (!reviewer) {
    return 'Customer'
  }

  const fullName = [reviewer.firstName, reviewer.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim())
    .join(' ')

  return fullName || reviewer.email || 'Customer'
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
      'stockStatus',
      'isFeatured',
      'isRecommended',
      'updatedAt',
    ],
  },
  access: {
    read: () => true,
  },
  endpoints: [
    {
      path: '/submit-review',
      method: 'post',
      handler: async (req) => {
        const reviewer = asReviewAuthor(req.user)

        if (!reviewer?.id || !reviewer.email) {
          return Response.json({ error: 'Authentication required.' }, { status: 401 })
        }

        const reviewerId = normalizeDocumentId(reviewer.id)
        if (typeof reviewerId !== 'number') {
          return Response.json({ error: 'Invalid reviewer ID.' }, { status: 400 })
        }

        let body: ReviewSubmissionBody

        try {
          body = (await req.json?.()) as ReviewSubmissionBody
        } catch {
          return Response.json({ error: 'Invalid request body.' }, { status: 400 })
        }

        const productId = normalizeDocumentId(body.productId)
        const rating = parseReviewRating(body.rating)
        const comment = parseReviewComment(body.comment)

        if (!productId || !rating || !comment) {
          return Response.json(
            { error: 'Product, rating from 1 to 5, and a valid review comment are required.' },
            { status: 400 },
          )
        }

        try {
          const product = await req.payload.findByID({
            collection: 'products',
            id: productId,
            depth: 0,
            overrideAccess: true,
          })

          const existingReviews = Array.isArray(product?.reviews) ? product.reviews : []

          await req.payload.update({
            collection: 'products',
            id: productId,
            depth: 0,
            overrideAccess: true,
            data: {
              reviews: [
                ...existingReviews,
                {
                  user: reviewerId,
                  authorName: getReviewerName(reviewer),
                  authorEmail: reviewer.email,
                  rating,
                  comment,
                  show: false,
                  submittedAt: new Date().toISOString(),
                },
              ],
            },
          })

          return Response.json(
            {
              message: 'Review submitted successfully and is awaiting approval.',
              productId: product.id,
            },
            { status: 201 },
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to submit review.'
          const status = /not found/i.test(message) ? 404 : 400

          return Response.json({ error: message }, { status })
        }
      },
    },
  ],
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
      name: 'stockStatus',
      type: 'select',
      defaultValue: 'in-stock',
      label: 'Stock status',
      options: [
        {
          label: 'In stock',
          value: 'in-stock',
        },
        {
          label: 'Low stock',
          value: 'low-stock',
        },
        {
          label: 'Out of stock',
          value: 'out-of-stock',
        },
      ],
      admin: {
        description: 'Controls the stock badge on the product page.',
        position: 'sidebar',
      },
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
      validate: requireUploadedImage,
    },
    {
      name: 'gallery',
      type: 'array',
      label: 'Gallery',
      fields: [
        {
          name: 'image',
          type: 'upload',
          hasMany: false,
          relationTo: 'media',
          label: 'Image',
          validate: requireUploadedImage,
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
      name: 'reviews',
      type: 'array',
      label: 'Product reviews',
      admin: {
        description: 'Customer reviews submitted from the storefront. Toggle "Show" to publish them.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          label: 'Customer',
          admin: {
            readOnly: true,
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'authorName',
              type: 'text',
              label: 'Author name',
              admin: {
                readOnly: true,
                width: '50%',
              },
            },
            {
              name: 'authorEmail',
              type: 'email',
              label: 'Author email',
              admin: {
                readOnly: true,
                width: '50%',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'rating',
              type: 'number',
              required: true,
              min: 1,
              max: 5,
              label: 'Rating',
              admin: {
                width: '33%',
              },
            },
            {
              name: 'show',
              type: 'checkbox',
              defaultValue: false,
              label: 'Show',
              admin: {
                width: '33%',
                description: 'Publish this review on the product page.',
              },
            },
            {
              name: 'submittedAt',
              type: 'date',
              label: 'Submitted at',
              admin: {
                readOnly: true,
                width: '34%',
              },
            },
          ],
        },
        {
          name: 'comment',
          type: 'textarea',
          required: true,
          label: 'Review',
        },
      ],
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
  ],
}
