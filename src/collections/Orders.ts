import type { CollectionConfig, PayloadRequest } from 'payload'

import { normalizeDocumentId } from '@/lib/commerce'
import { downloadOrderInvoice } from '@/lib/order-invoice-pdf'
import { downloadPplOrderLabel, syncPplOrderLabel } from '@/lib/ppl-labels'
import { cancelOrder, confirmOrder, getOrderDecision } from '@/lib/orders'
import { isPplShippingSelection, isZasilkovnaShippingSelection } from '@/lib/shipping-carriers'
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

const extractDocumentId = (value: unknown) => {
  if (value && typeof value === 'object' && 'id' in value) {
    return normalizeDocumentId(value.id)
  }

  return normalizeDocumentId(value)
}

const canAccessOrderInvoice = async (req: PayloadRequest, documentId: number | string) => {
  if (isAdminRequest(req)) {
    return true
  }

  const userRecord = req.user && typeof req.user === 'object' ? req.user : null
  const userId = extractDocumentId(userRecord && 'id' in userRecord ? userRecord.id : null)

  if (!userId) {
    return false
  }

  try {
    const order = (await req.payload.findByID({
      collection: 'orders' as never,
      id: documentId,
      depth: 0,
      overrideAccess: true,
    })) as {
      user?: unknown
    }

    const orderUserId = extractDocumentId(order?.user)
    return orderUserId !== null && String(orderUserId) === String(userId)
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      return false
    }

    throw error
  }
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: {
    singular: 'Objednávka',
    plural: 'Objednávky',
  },
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
      path: '/:id/invoice',
      method: 'get',
      handler: async (req) => {
        try {
          const documentId = parseOrderDocId(req)
          const isAdminUser = isAdminRequest(req)
          const hasAccess = await canAccessOrderInvoice(req, documentId)

          if (!hasAccess) {
            return Response.json({ error: 'Order not found.' }, { status: 404 })
          }

          const result = await downloadOrderInvoice(req.payload, documentId, {
            persistIfMissing: isAdminUser,
          })

          if (!result) {
            return Response.json(
              {
                error: isAdminUser ? 'Order not found.' : 'Invoice has not been generated yet.',
              },
              { status: 404 },
            )
          }

          return new Response(result.data, {
            status: 200,
            headers: {
              'Content-Type': result.contentType,
              'Content-Disposition': `inline; filename="${result.fileName}"`,
              'Cache-Control': 'no-store',
            },
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to generate invoice PDF.'
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
      label: 'Číslo objednávky',
    },
    {
      name: 'provider',
      type: 'select',
      required: true,
      label: 'Platební brána',
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
          label: 'Dobírka',
          value: 'cash-on-delivery',
        },
      ],
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      label: 'Stav platby',
      options: [
        {
          label: 'Čeká na platbu',
          value: 'pending',
        },
        {
          label: 'Zaplaceno',
          value: 'paid',
        },
        {
          label: 'Neúspěšná',
          value: 'failed',
        },
        {
          label: 'Zrušeno',
          value: 'canceled',
        },
      ],
    },
    {
      name: 'isConfirmed',
      type: 'checkbox',
      label: 'Objednávka potvrzena',
      defaultValue: false,
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'confirmedAt',
      type: 'date',
      label: 'Potvrzeno dne',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'confirmationEmailSentAt',
      type: 'date',
      label: 'Potvrzovací e-mail odeslán',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'isCanceled',
      type: 'checkbox',
      label: 'Objednávka zrušena',
      defaultValue: false,
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'canceledAt',
      type: 'date',
      label: 'Zrušeno dne',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'cancellationEmailSentAt',
      type: 'date',
      label: 'E-mail o zrušení odeslán',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'invoiceGeneratedAt',
      type: 'date',
      label: 'Faktura vygenerována',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'invoiceFileName',
      type: 'text',
      label: 'Název souboru faktury',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'invoiceContentType',
      type: 'text',
      label: 'Typ obsahu faktury',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'invoiceData',
      type: 'textarea',
      label: 'Data souboru faktury',
      admin: hiddenReadOnlyAdmin,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Zákaznický účet',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'customerEmail',
          type: 'text',
          required: true,
          label: 'E-mail zákazníka',
        },
        {
          name: 'customerPhone',
          type: 'text',
          label: 'Telefon zákazníka',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'customerFirstName',
          type: 'text',
          label: 'Jméno zákazníka',
        },
        {
          name: 'customerLastName',
          type: 'text',
          label: 'Příjmení zákazníka',
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
          label: 'Měna',
        },
        {
          name: 'subtotal',
          type: 'number',
          required: true,
          label: 'Mezisoučet',
          min: 0,
        },
        {
          name: 'shippingTotal',
          type: 'number',
          required: true,
          label: 'Doprava',
          min: 0,
        },
        {
          name: 'total',
          type: 'number',
          required: true,
          label: 'Celkem',
          min: 0,
        },
      ],
    },
    {
      name: 'discounts',
      type: 'group',
      label: 'Slevy',
      fields: [
        {
          name: 'coupon',
          type: 'relationship',
          relationTo: 'coupons',
          label: 'Kupón',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'couponCode',
              type: 'text',
              label: 'Kód kupónu',
            },
            {
              name: 'couponDiscountPercent',
              type: 'number',
              min: 0,
              max: 100,
              label: 'Sleva kupónem (%)',
            },
            {
              name: 'couponDiscountAmount',
              type: 'number',
              min: 0,
              label: 'Sleva kupónem (Kč)',
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
              label: 'Sleva na první nákup (Kč)',
            },
            {
              name: 'bonusDiscountAmount',
              type: 'number',
              min: 0,
              label: 'Bonusová sleva (Kč)',
            },
            {
              name: 'discountedSubtotal',
              type: 'number',
              min: 0,
              label: 'Mezisoučet po slevě',
            },
          ],
        },
      ],
    },
    {
      name: 'shippingAddress',
      type: 'group',
      label: 'Doručovací adresa',
      fields: [
        {
          name: 'country',
          type: 'text',
          label: 'Země',
        },
        {
          name: 'address',
          type: 'text',
          label: 'Adresa',
        },
        {
          name: 'city',
          type: 'text',
          label: 'Město',
        },
        {
          name: 'zip',
          type: 'text',
          label: 'PSČ',
        },
        {
          name: 'notes',
          type: 'textarea',
          label: 'Poznámka',
        },
      ],
    },
    {
      name: 'billing',
      type: 'group',
      label: 'Fakturační údaje',
      fields: [
        {
          name: 'sameAsShipping',
          type: 'checkbox',
          label: 'Stejné jako doručovací',
          defaultValue: true,
        },
        {
          name: 'isCompany',
          type: 'checkbox',
          label: 'Nákup na firmu',
          defaultValue: false,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'firstName',
              type: 'text',
              label: 'Jméno',
            },
            {
              name: 'lastName',
              type: 'text',
              label: 'Příjmení',
            },
          ],
        },
        {
          name: 'address',
          type: 'text',
          label: 'Adresa',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'city',
              type: 'text',
              label: 'Město',
            },
            {
              name: 'zip',
              type: 'text',
              label: 'PSČ',
            },
            {
              name: 'country',
              type: 'text',
              label: 'Země',
            },
          ],
        },
        {
          name: 'companyName',
          type: 'text',
          label: 'Název firmy',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'companyId',
              type: 'text',
              label: 'IČO',
            },
            {
              name: 'vatId',
              type: 'text',
              label: 'DIČ',
            },
          ],
        },
      ],
    },
    {
      name: 'shipping',
      type: 'group',
      label: 'Doprava',
      fields: [
        {
          name: 'methodId',
          type: 'text',
          label: 'ID metody',
        },
        {
          name: 'label',
          type: 'text',
          label: 'Název',
        },
        {
          name: 'price',
          type: 'number',
          label: 'Cena',
          min: 0,
        },
        {
          name: 'cashOnDelivery',
          type: 'checkbox',
          label: 'Dobírka',
          defaultValue: false,
        },
        {
          name: 'pickupCarrier',
          type: 'text',
          label: 'Dopravce výdejního místa',
        },
        {
          name: 'pickupPointId',
          type: 'text',
          label: 'ID výdejního místa',
        },
        {
          name: 'pickupPointCode',
          type: 'text',
          label: 'Kód výdejního místa',
        },
        {
          name: 'pickupPointType',
          type: 'text',
          label: 'Typ výdejního místa',
        },
        {
          name: 'pickupPointCarrierId',
          type: 'text',
          label: 'ID dopravce výdejního místa',
        },
        {
          name: 'pickupPointName',
          type: 'text',
          label: 'Název výdejního místa',
        },
        {
          name: 'pickupPointAddress',
          type: 'textarea',
          label: 'Adresa výdejního místa',
        },
      ],
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      label: 'Položky objednávky',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          label: 'Produkt',
        },
        {
          name: 'productSnapshotId',
          type: 'text',
          label: 'Snapshot ID produktu',
        },
        {
          name: 'slug',
          type: 'text',
          label: 'Slug produktu',
        },
        {
          name: 'sku',
          type: 'text',
          label: 'SKU',
        },
        {
          name: 'variant',
          type: 'text',
          label: 'Varianta',
        },
        {
          name: 'name',
          type: 'text',
          required: true,
          label: 'Název produktu',
        },
        {
          type: 'row',
          fields: [
            {
              name: 'quantity',
              type: 'number',
              required: true,
              label: 'Množství',
              min: 1,
            },
            {
              name: 'unitPrice',
              type: 'number',
              required: true,
              label: 'Cena za kus',
              min: 0,
            },
            {
              name: 'lineTotal',
              type: 'number',
              required: true,
              label: 'Cena celkem',
              min: 0,
            },
          ],
        },
      ],
    },
    {
      name: 'pplShipment',
      type: 'group',
      label: 'PPL zásilka',
      fields: [
        {
          name: 'batchId',
          type: 'text',
          label: 'ID dávky',
          admin: readOnlyAdmin,
        },
        {
          name: 'shipmentNumber',
          type: 'text',
          label: 'Číslo zásilky',
          admin: readOnlyAdmin,
        },
        {
          name: 'importState',
          type: 'text',
          label: 'Stav importu',
          admin: readOnlyAdmin,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'labelFormat',
              type: 'text',
              label: 'Formát štítku',
              admin: readOnlyAdmin,
            },
            {
              name: 'labelPageSize',
              type: 'text',
              label: 'Velikost stránky štítku',
              admin: readOnlyAdmin,
            },
          ],
        },
        {
          name: 'labelUrl',
          type: 'text',
          label: 'URL štítku',
          admin: readOnlyAdmin,
        },
        {
          name: 'completeLabelUrl',
          type: 'text',
          label: 'URL finálního štítku',
          admin: readOnlyAdmin,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'generatedAt',
              type: 'date',
              label: 'Vygenerováno',
              admin: readOnlyAdmin,
            },
            {
              name: 'lastCheckedAt',
              type: 'date',
              label: 'Naposledy zkontrolováno',
              admin: readOnlyAdmin,
            },
          ],
        },
        {
          name: 'lastError',
          type: 'textarea',
          label: 'Poslední chyba štítku',
          admin: readOnlyAdmin,
        },
      ],
    },
    {
      name: 'providerData',
      type: 'group',
      label: 'Data platební brány',
      fields: [
        {
          name: 'stripeSessionId',
          type: 'text',
          label: 'ID Stripe session',
        },
        {
          name: 'stripePaymentIntentId',
          type: 'text',
          label: 'ID Stripe payment intent',
        },
        {
          name: 'globalTransactionId',
          type: 'text',
          label: 'ID transakce Global Payments',
        },
        {
          name: 'globalAuthCode',
          type: 'text',
          label: 'Autorizační kód Global Payments',
        },
        {
          name: 'lastEvent',
          type: 'text',
          label: 'Poslední platební událost',
        },
        {
          name: 'lastError',
          type: 'textarea',
          label: 'Poslední chyba platby',
        },
        {
          name: 'providerResponse',
          type: 'textarea',
          label: 'Odpověď poskytovatele',
        },
      ],
    },
    {
      name: 'loyalty',
      type: 'group',
      label: 'Věrnostní program a bonusy',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'bonusUnitsSpent',
              type: 'number',
              min: 0,
              defaultValue: 0,
              label: 'Využité bonusové body',
            },
            {
              name: 'bonusUnitsEarned',
              type: 'number',
              min: 0,
              defaultValue: 0,
              label: 'Získané bonusové body',
            },
          ],
        },
      ],
    },
    {
      name: 'zasilkovnaShipment',
      type: 'group',
      label: 'Zásilkovna zásilka',
      fields: [
        {
          name: 'packetId',
          type: 'text',
          label: 'ID zásilky',
          admin: readOnlyAdmin,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'packetNumber',
              type: 'text',
              label: 'Číslo zásilky',
              admin: readOnlyAdmin,
            },
            {
              name: 'carrierNumber',
              type: 'text',
              label: 'Číslo dopravce',
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
              label: 'Formát štítku',
              admin: readOnlyAdmin,
            },
            {
              name: 'labelMode',
              type: 'text',
              label: 'Režim štítku',
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
              label: 'Vygenerováno',
              admin: readOnlyAdmin,
            },
            {
              name: 'lastCheckedAt',
              type: 'date',
              label: 'Naposledy zkontrolováno',
              admin: readOnlyAdmin,
            },
          ],
        },
        {
          name: 'lastError',
          type: 'textarea',
          label: 'Poslední chyba štítku',
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
        condition: (data) =>
          isPplShippingSelection(data?.shipping) || Boolean(data?.pplShipment?.batchId || data?.pplShipment?.lastError),
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
        condition: (data) =>
          isZasilkovnaShippingSelection(data?.shipping) ||
          Boolean(data?.zasilkovnaShipment?.packetId || data?.zasilkovnaShipment?.lastError),
        components: {
          Field: '@/components/admin/orders/ZasilkovnaLabelControls',
        },
      },
    },
    {
      name: 'purchaseCountRecorded',
      type: 'checkbox',
      label: 'Započítáno do počtu nákupů',
      defaultValue: false,
    },
    {
      name: 'bonusLedgerRecorded',
      type: 'checkbox',
      label: 'Zapsáno do bonusové evidence',
      defaultValue: false,
    },
  ],
}
