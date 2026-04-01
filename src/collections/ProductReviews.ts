import type { CollectionConfig, PayloadRequest } from 'payload'

import {
  normalizeDocumentId,
} from '@/lib/commerce'

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

const asReviewAuthor = (value: unknown): ReviewAuthor => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  return value as ReviewAuthor
}

const hasAdminRole = (user: unknown) =>
  typeof user === 'object' && user !== null && 'role' in user && user.role === 'admin'

const isAdmin = ({ req: { user } }: { req: PayloadRequest }) => hasAdminRole(user)

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

export const ProductReviews: CollectionConfig = {
  slug: 'product-reviews',
  labels: {
    singular: 'Product review',
    plural: 'Product reviews',
  },
  admin: {
    useAsTitle: 'authorName',
    defaultColumns: ['product', 'authorName', 'rating', 'show', 'submittedAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (hasAdminRole(user)) {
        return true
      }

      // Allow users to read their own reviews and public reviews
      if (user && typeof user === 'object' && 'id' in user) {
        return {
          or: [
            { show: { equals: true } },
            { user: { equals: user.id } },
          ],
        }
      }

      return {
        show: {
          equals: true,
        },
      }
    },
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    admin: isAdmin,
  },
  endpoints: [
    {
      path: '/submit',
      method: 'post',
      handler: async (req) => {
        const reviewer = asReviewAuthor(req.user)

        if (!reviewer?.id || !reviewer.email) {
          return Response.json({ error: 'Authentication required.' }, { status: 401 })
        }

        const reviewerId = normalizeDocumentId(reviewer.id)
        const numericReviewerId = typeof reviewerId === 'number' ? reviewerId : Number(reviewerId)

        if (!Number.isInteger(numericReviewerId) || numericReviewerId <= 0) {
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
        const numericProductId = typeof productId === 'number' ? productId : Number(productId)

        if (!productId || !Number.isInteger(numericProductId) || numericProductId <= 0 || !rating || !comment) {
          return Response.json(
            { error: 'Product, rating from 1 to 5, and a valid review comment are required.' },
            { status: 400 },
          )
        }

        try {
          await req.payload.findByID({
            collection: 'products',
            id: numericProductId,
            depth: 0,
            overrideAccess: true,
          })

          // Check if purchase is required for reviews
          const homePage = await req.payload.findGlobal({
            slug: 'home-page',
            depth: 0,
          })

          if (homePage.requirePurchaseForReview) {
            // Check if user has purchased this product
            const orders = await req.payload.find({
              collection: 'orders',
              depth: 1,
              where: {
                user: {
                  equals: numericReviewerId,
                },
                status: {
                  in: ['completed', 'shipped', 'delivered'],
                },
                'items.product': {
                  equals: numericProductId,
                },
              },
              limit: 1,
            })

            if (orders.docs.length === 0) {
              return Response.json(
                { error: 'You can only review products you have purchased.' },
                { status: 403 },
              )
            }
          }

          const review = await req.payload.create({
            collection: 'product-reviews',
            depth: 0,
            overrideAccess: true,
            data: {
              product: numericProductId,
              user: numericReviewerId,
              authorName: getReviewerName(reviewer),
              authorEmail: reviewer.email,
              rating,
              comment,
              show: false,
              submittedAt: new Date().toISOString(),
            },
          })

          return Response.json(
            {
              message: 'Review submitted successfully and is awaiting approval.',
              reviewId: review.id,
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
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: 'Product',
    },
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
          required: true,
          label: 'Author name',
          admin: {
            readOnly: true,
            width: '50%',
          },
        },
        {
          name: 'authorEmail',
          type: 'email',
          required: true,
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
}
