import type { CollectionConfig, PayloadRequest } from 'payload'

import { downloadPplOrderLabel, syncPplOrderLabel } from '@/lib/ppl-labels'
import { cancelOrder, confirmOrder, getOrderDecision } from '@/lib/orders'
import { downloadZasilkovnaOrderLabel, syncZasilkovnaOrderLabel } from '@/lib/zasilkovna-labels'

const hasAdminRole = (user: unknown) =>
  typeof user === 'object' && user !== null && 'role' in user && user.role === 'admin'

const isAdmin = ({ req: { user } }: { req: PayloadRequest }) => hasAdminRole(user)
const isAdminRequest = (req: PayloadRequest) => hasAdminRole(req.user)
const isAdminOrOrderOwner = ({ req: { user } }: { req: PayloadRequest }) => {
  if (hasAdminRole(user)) {
    return true
  }

  if (typeof user !== 'object' || user === null || !('id' in user) || !user.id) {
    return false
  }

  return {
    user: {
      equals: user.id,
    },
  }
}
const readOnlyAdmin = { readOnly: true }
const hiddenReadOnlyAdmin = { readOnly: true, hidden: true }

const parseOrderDocId = (req: PayloadRequest) => {
  const raw = req.routeParams?.id

  if (typeof raw === 'number' && Number.isInteger(raw)) {
    return raw
  }

  if (typeof raw === 'string' && raw.trim()) {
    const numeric = Number(raw)
    return Number.isInteger(numeric) ? numeric : raw.trim()
  }

  throw new Error('Missing order document ID.')
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderId',
    defaultColumns: ['orderId', 'paymentStatus', 'provider', 'total', 'customerEmail', 'updatedAt'],
  },
  endpoints: [
    {
      path: '/:id/decision',
      method: 'get',
      handler: async (req) => {
        if (!isAdminRequest(req)) {
          return Response.json({ error: 'Forbidden.' }, { status: 403 })
        }

        try {
          const result = await getOrderDecision(req.payload, parseOrderDocId(req))

          if (!result) {
            return Response.json({ error: 'Order not found.' }, { status: 404 })
          }

          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to read order decision.'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
    {
      path: '/:id/confirm',
      method: 'post',
      handler: async (req) => {
        if (!isAdminRequest(req)) {
          return Response.json({ error: 'Forbidden.' }, { status: 403 })
        }

        try {
          const result = await confirmOrder(req.payload, parseOrderDocId(req))

          if (!result) {
            return Response.json({ error: 'Order not found.' }, { status: 404 })
          }

          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to confirm order.'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
    {
      path: '/:id/cancel',
      method: 'post',
      handler: async (req) => {
        if (!isAdminRequest(req)) {
          return Response.json({ error: 'Forbidden.' }, { status: 403 })
        }

        try {
          const result = await cancelOrder(req.payload, parseOrderDocId(req))

          if (!result) {
            return Response.json({ error: 'Order not found.' }, { status: 404 })
          }

          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to cancel order.'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
    {
      path: '/:id/ppl-label',
      method: 'post',
      handler: async (req) => {
        if (!isAdminRequest(req)) {
          return Response.json({ error: 'Forbidden.' }, { status: 403 })
        }

        try {
          const result = await syncPplOrderLabel(req.payload, parseOrderDocId(req))

          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to sync PPL label.'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
    {
      path: '/:id/ppl-label/download',
      method: 'get',
      handler: async (req) => {
        if (!isAdminRequest(req)) {
          return Response.json({ error: 'Forbidden.' }, { status: 403 })
        }

        try {
          const result = await downloadPplOrderLabel(req.payload, parseOrderDocId(req))

          return new Response(result.data, {
            status: 200,
            headers: {
              'Content-Type': result.contentType,
              'Content-Disposition': `inline; filename="${result.fileName}"`,
              'Cache-Control': 'no-store',
            },
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to download PPL label.'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
    {
      path: '/:id/zasilkovna-label',
      method: 'post',
      handler: async (req) => {
        if (!isAdminRequest(req)) {
          return Response.json({ error: 'Forbidden.' }, { status: 403 })
        }

        try {
          const result = await syncZasilkovnaOrderLabel(req.payload, parseOrderDocId(req))

          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to sync Zasilkovna label.'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
    {
      path: '/:id/zasilkovna-label/download',
      method: 'get',
      handler: async (req) => {
        if (!isAdminRequest(req)) {
          return Response.json({ error: 'Forbidden.' }, { status: 403 })
        }

        try {
          const result = await downloadZasilkovnaOrderLabel(req.payload, parseOrderDocId(req))

          return new Response(result.data, {
            status: 200,
            headers: {
              'Content-Type': result.contentType,
              'Content-Disposition': `inline; filename="${result.fileName}"`,
              'Cache-Control': 'no-store',
            },
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to download Zasilkovna label.'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  ],
  access: {
    read: isAdminOrOrderOwner,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    admin: ({ req }) => isAdminRequest(req),
  },
  fields: [
    {
      name: 'orderId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Order ID',
    },
    {
      name: 'provider',
      type: 'select',
      required: true,
      label: 'Payment provider',
      options: [
        {
          label: 'Stripe',
          value: 'stripe',
        },
        {
          label: 'Global Payments',
          value: 'global-payments',
        },
        {
          label: 'Cash on delivery',
          value: 'cash-on-delivery',
        },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: 'Payment status',
      options: [
        {
          label: 'Pending',
          value: 'pending',
        },
        {
          label: 'Paid',
          value: 'paid',
        },
        {
          label: 'Failed',
          value: 'failed',
        },
        {
          label: 'Canceled',
          value: 'canceled',
        },
      ],
    },
    {
      name: 'isConfirmed',
      type: 'checkbox',
      label: 'Order confirmed',
      defaultValue: false,
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'confirmedAt',
      type: 'date',
      label: 'Confirmed at',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'confirmationEmailSentAt',
      type: 'date',
      label: 'Confirmation email sent at',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'isCanceled',
      type: 'checkbox',
      label: 'Order canceled',
      defaultValue: false,
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'canceledAt',
      type: 'date',
      label: 'Canceled at',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'cancellationEmailSentAt',
      type: 'date',
      label: 'Cancellation email sent at',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Customer account',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'customerEmail',
          type: 'text',
          required: true,
          label: 'Customer email',
        },
        {
          name: 'customerPhone',
          type: 'text',
          label: 'Customer phone',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'customerFirstName',
          type: 'text',
          label: 'Customer first name',
        },
        {
          name: 'customerLastName',
          type: 'text',
          label: 'Customer last name',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'currency',
          type: 'text',
          required: true,
          defaultValue: 'CZK',
          label: 'Currency',
        },
        {
          name: 'subtotal',
          type: 'number',
          required: true,
          label: 'Subtotal',
          min: 0,
        },
        {
          name: 'shippingTotal',
          type: 'number',
          required: true,
          label: 'Shipping total',
          min: 0,
        },
        {
          name: 'total',
          type: 'number',
          required: true,
          label: 'Order total',
          min: 0,
        },
      ],
    },
    {
      name: 'discounts',
      type: 'group',
      label: 'Discounts',
      fields: [
        {
          name: 'coupon',
          type: 'relationship',
          relationTo: 'coupons',
          label: 'Coupon',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'couponCode',
              type: 'text',
              label: 'Coupon code',
            },
            {
              name: 'couponDiscountPercent',
              type: 'number',
              min: 0,
              max: 100,
              label: 'Coupon discount percent',
            },
            {
              name: 'couponDiscountAmount',
              type: 'number',
              min: 0,
              label: 'Coupon discount amount',
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'firstPurchaseDiscountAmount',
              type: 'number',
              min: 0,
              label: 'First purchase discount amount',
            },
            {
              name: 'bonusDiscountAmount',
              type: 'number',
              min: 0,
              label: 'Bonus discount amount',
            },
            {
              name: 'discountedSubtotal',
              type: 'number',
              min: 0,
              label: 'Discounted subtotal',
            },
          ],
        },
      ],
    },
    {
      name: 'shippingAddress',
      type: 'group',
      label: 'Shipping address',
      fields: [
        {
          name: 'country',
          type: 'text',
          label: 'Country',
        },
        {
          name: 'address',
          type: 'text',
          label: 'Address',
        },
        {
          name: 'city',
          type: 'text',
          label: 'City',
        },
        {
          name: 'zip',
          type: 'text',
          label: 'ZIP',
        },
        {
          name: 'notes',
          type: 'textarea',
          label: 'Notes',
        },
      ],
    },
    {
      name: 'billing',
      type: 'group',
      label: 'Billing details',
      fields: [
        {
          name: 'sameAsShipping',
          type: 'checkbox',
          label: 'Same as shipping',
          defaultValue: true,
        },
        {
          name: 'isCompany',
          type: 'checkbox',
          label: 'Company purchase',
          defaultValue: false,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'firstName',
              type: 'text',
              label: 'First name',
            },
            {
              name: 'lastName',
              type: 'text',
              label: 'Last name',
            },
          ],
        },
        {
          name: 'address',
          type: 'text',
          label: 'Address',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'city',
              type: 'text',
              label: 'City',
            },
            {
              name: 'zip',
              type: 'text',
              label: 'ZIP',
            },
            {
              name: 'country',
              type: 'text',
              label: 'Country',
            },
          ],
        },
        {
          name: 'companyName',
          type: 'text',
          label: 'Company name',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'companyId',
              type: 'text',
              label: 'Company ID',
            },
            {
              name: 'vatId',
              type: 'text',
              label: 'VAT ID',
            },
          ],
        },
      ],
    },
    {
      name: 'shipping',
      type: 'group',
      label: 'Shipping method',
      fields: [
        {
          name: 'methodId',
          type: 'text',
          label: 'Method ID',
        },
        {
          name: 'label',
          type: 'text',
          label: 'Label',
        },
        {
          name: 'price',
          type: 'number',
          label: 'Price',
          min: 0,
        },
        {
          name: 'cashOnDelivery',
          type: 'checkbox',
          label: 'Cash on delivery',
          defaultValue: false,
        },
        {
          name: 'pickupCarrier',
          type: 'text',
          label: 'Pickup carrier',
        },
        {
          name: 'pickupPointId',
          type: 'text',
          label: 'Pickup point ID',
        },
        {
          name: 'pickupPointCode',
          type: 'text',
          label: 'Pickup point code',
        },
        {
          name: 'pickupPointName',
          type: 'text',
          label: 'Pickup point name',
        },
        {
          name: 'pickupPointAddress',
          type: 'textarea',
          label: 'Pickup point address',
        },
      ],
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      label: 'Order items',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          label: 'Product',
        },
        {
          name: 'productSnapshotId',
          type: 'text',
          label: 'Product ID snapshot',
        },
        {
          name: 'slug',
          type: 'text',
          label: 'Product slug',
        },
        {
          name: 'sku',
          type: 'text',
          label: 'SKU',
        },
        {
          name: 'variant',
          type: 'text',
          label: 'Variant',
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Product name',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'quantity',
              type: 'number',
              required: true,
              label: 'Quantity',
              min: 1,
            },
            {
              name: 'unitPrice',
              type: 'number',
              required: true,
              label: 'Unit price',
              min: 0,
            },
            {
              name: 'lineTotal',
              type: 'number',
              required: true,
              label: 'Line total',
              min: 0,
            },
          ],
        },
      ],
    },
    {
      name: 'pplShipment',
      type: 'group',
      label: 'PPL shipment',
      fields: [
        {
          name: 'batchId',
          type: 'text',
          label: 'Batch ID',
          admin: readOnlyAdmin,
        },
        {
          name: 'shipmentNumber',
          type: 'text',
          label: 'Shipment number',
          admin: readOnlyAdmin,
        },
        {
          name: 'importState',
          type: 'text',
          label: 'Import state',
          admin: readOnlyAdmin,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'labelFormat',
              type: 'text',
              label: 'Label format',
              admin: readOnlyAdmin,
            },
            {
              name: 'labelPageSize',
              type: 'text',
              label: 'Label page size',
              admin: readOnlyAdmin,
            },
          ],
        },
        {
          name: 'labelUrl',
          type: 'text',
          label: 'Label URL',
          admin: readOnlyAdmin,
        },
        {
          name: 'completeLabelUrl',
          type: 'text',
          label: 'Complete label URL',
          admin: readOnlyAdmin,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'generatedAt',
              type: 'date',
              label: 'Generated at',
              admin: readOnlyAdmin,
            },
            {
              name: 'lastCheckedAt',
              type: 'date',
              label: 'Last checked at',
              admin: readOnlyAdmin,
            },
          ],
        },
        {
          name: 'lastError',
          type: 'textarea',
          label: 'Last label error',
          admin: readOnlyAdmin,
        },
      ],
    },
    {
      name: 'providerData',
      type: 'group',
      label: 'Provider data',
      fields: [
        {
          name: 'stripeSessionId',
          type: 'text',
          label: 'Stripe session ID',
        },
        {
          name: 'stripePaymentIntentId',
          type: 'text',
          label: 'Stripe payment intent ID',
        },
        {
          name: 'globalTransactionId',
          type: 'text',
          label: 'Global Payments transaction ID',
        },
        {
          name: 'globalAuthCode',
          type: 'text',
          label: 'Global Payments auth code',
        },
        {
          name: 'lastEvent',
          type: 'text',
          label: 'Last payment event',
        },
        {
          name: 'lastError',
          type: 'textarea',
          label: 'Last payment error',
        },
        {
          name: 'providerResponse',
          type: 'textarea',
          label: 'Provider response payload',
        },
      ],
    },
    {
      name: 'loyalty',
      type: 'group',
      label: 'Loyalty and bonuses',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'bonusUnitsSpent',
              type: 'number',
              min: 0,
              defaultValue: 0,
              label: 'Bonus units spent',
            },
            {
              name: 'bonusUnitsEarned',
              type: 'number',
              min: 0,
              defaultValue: 0,
              label: 'Bonus units earned',
            },
          ],
        },
      ],
    },
    {
      name: 'zasilkovnaShipment',
      type: 'group',
      label: 'Zasilkovna shipment',
      fields: [
        {
          name: 'packetId',
          type: 'text',
          label: 'Packet ID',
          admin: readOnlyAdmin,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'packetNumber',
              type: 'text',
              label: 'Packet number',
              admin: readOnlyAdmin,
            },
            {
              name: 'carrierNumber',
              type: 'text',
              label: 'Carrier number',
              admin: readOnlyAdmin,
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'labelFormat',
              type: 'text',
              label: 'Label format',
              admin: readOnlyAdmin,
            },
            {
              name: 'labelMode',
              type: 'text',
              label: 'Label mode',
              admin: readOnlyAdmin,
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'generatedAt',
              type: 'date',
              label: 'Generated at',
              admin: readOnlyAdmin,
            },
            {
              name: 'lastCheckedAt',
              type: 'date',
              label: 'Last checked at',
              admin: readOnlyAdmin,
            },
          ],
        },
        {
          name: 'lastError',
          type: 'textarea',
          label: 'Last label error',
          admin: readOnlyAdmin,
        },
      ],
    },
    {
      name: 'orderConfirmationControls',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '@/components/admin/orders/OrderConfirmationControls',
        },
      },
    },
    {
      name: 'pplLabelControls',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (data) => typeof data?.shipping?.methodId === 'string' && data.shipping.methodId.startsWith('ppl-'),
        components: {
          Field: '@/components/admin/orders/PPLLabelControls',
        },
      },
    },
    {
      name: 'zasilkovnaLabelControls',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (data) => typeof data?.shipping?.methodId === 'string' && data.shipping.methodId.startsWith('zasilkovna-'),
        components: {
          Field: '@/components/admin/orders/ZasilkovnaLabelControls',
        },
      },
    },
    {
      name: 'purchaseCountRecorded',
      type: 'checkbox',
      label: 'Purchase count recorded',
      defaultValue: false,
    },
    {
      name: 'bonusLedgerRecorded',
      type: 'checkbox',
      label: 'Bonus ledger recorded',
      defaultValue: false,
    },
  ],
}
