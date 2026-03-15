import type { CollectionConfig, PayloadRequest } from 'payload'

import { buildCouponPreviewAssets, sanitizeCouponCode } from '@/lib/coupon-preview'
import { generateCouponCode, validateCouponForUser } from '@/lib/commerce'

type CouponApplyBody = {
  code?: unknown
  subtotal?: unknown
}

type CouponUser = {
  id?: number | string
  role?: string
} | null

const asUser = (value: unknown): CouponUser => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  return value as CouponUser
}

const hasAdminRole = (user: unknown) => asUser(user)?.role === 'admin'
const isAdmin = ({ req: { user } }: { req: PayloadRequest }) => hasAdminRole(user)

const parseSubtotal = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0
  }

  return Math.round((numeric + Number.EPSILON) * 100) / 100
}

const generateIfMissing = ({ value }: { value?: unknown }) => {
  const normalized = sanitizeCouponCode(value)
  return normalized || generateCouponCode()
}

export const Coupons: CollectionConfig = {
  slug: 'coupons',
  labels: {
    singular: 'Coupon',
    plural: 'Coupons',
  },
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'name', 'discountPercent', 'isActive', 'updatedAt'],
  },
  hooks: {
    beforeChange: [
      async ({ data }) => {
        if (!data || typeof data !== 'object') {
          return data
        }

        const source = data as Record<string, unknown>
        const assets = await buildCouponPreviewAssets({
          code: sanitizeCouponCode(source.code) || generateCouponCode(),
          discountPercent: source.discountPercent,
          couponName: typeof source.name === 'string' ? source.name : 'Lumera Coupon',
          preview: source.qrCard && typeof source.qrCard === 'object' ? source.qrCard : undefined,
          websiteLink: source.websiteLink,
        })

        return {
          ...source,
          previewSvg: assets.previewSvg,
          qrSvg: assets.qrSvg,
        }
      },
    ],
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    admin: isAdmin,
  },
  endpoints: [
    {
      path: '/apply',
      method: 'post',
      handler: async (req) => {
        const currentUser = asUser(req.user)

        if (!currentUser?.id) {
          return Response.json({ error: 'Please sign in to use a coupon.' }, { status: 401 })
        }

        let body: CouponApplyBody

        try {
          body = (await req.json?.()) as CouponApplyBody
        } catch {
          return Response.json({ error: 'Invalid request body.' }, { status: 400 })
        }

        const code = sanitizeCouponCode(body.code)
        const subtotal = parseSubtotal(body.subtotal)

        if (!code) {
          return Response.json({ error: 'Coupon code is required.' }, { status: 400 })
        }

        try {
          const applied = await validateCouponForUser(req.payload, {
            code,
            subtotal,
            userId: currentUser.id,
          })

          return Response.json(applied, { status: 200 })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Coupon could not be applied.'
          const status = /not found|not active|already been used/i.test(message) ? 400 : 500

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
      label: 'Coupon name',
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Coupon code',
      defaultValue: generateCouponCode,
      hooks: {
        beforeValidate: [generateIfMissing],
      },
      admin: {
        description: 'Leave empty to auto-generate a random code.',
      },
    },
    {
      name: 'discountPercent',
      type: 'number',
      required: true,
      min: 1,
      max: 100,
      label: 'Discount percent',
    },
    {
      name: 'websiteLink',
      type: 'text',
      defaultValue: '/checkout',
      label: 'QR website link',
      admin: {
        description: 'Use a full URL like https://lumerashop.cz/checkout or an internal path like /checkout. The coupon code is appended automatically.',
      },
    },
    {
      name: 'qrCard',
      type: 'group',
      label: 'QR card content',
      admin: {
        description: 'Choose which coupon details should appear on the branded QR card preview.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'showTitle',
              type: 'checkbox',
              defaultValue: true,
              label: 'Show title',
              admin: {
                width: '25%',
              },
            },
            {
              name: 'showDiscount',
              type: 'checkbox',
              defaultValue: true,
              label: 'Show discount',
              admin: {
                width: '25%',
              },
            },
            {
              name: 'showCode',
              type: 'checkbox',
              defaultValue: true,
              label: 'Show code',
              admin: {
                width: '25%',
              },
            },
            {
              name: 'showSubtitle',
              type: 'checkbox',
              defaultValue: false,
              label: 'Show subtitle',
              admin: {
                width: '25%',
              },
            },
          ],
        },
        {
          name: 'title',
          type: 'text',
          label: 'Title on card',
          admin: {
            description: 'Leave empty to use the coupon name automatically.',
          },
        },
        {
          name: 'subtitle',
          type: 'text',
          label: 'Subtitle on card',
        },
        {
          name: 'note',
          type: 'text',
          label: 'Bottom note',
        },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Active',
    },
    {
      name: 'orders',
      type: 'join',
      collection: 'orders',
      on: 'discounts.coupon',
      label: 'Orders using this coupon',
      admin: {
        allowCreate: false,
        defaultColumns: ['orderId', 'paymentStatus', 'total', 'customerEmail', 'updatedAt'],
      },
    },
    {
      name: 'preview',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '@/components/admin/coupons/CouponPreview',
        },
      },
    },
    {
      name: 'previewSvg',
      type: 'textarea',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'qrSvg',
      type: 'textarea',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
  ],
}
