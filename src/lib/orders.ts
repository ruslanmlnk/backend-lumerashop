import type { Payload } from 'payload'

export type OrderPaymentProvider = 'stripe' | 'global-payments'
export type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'canceled'

export type InternalOrderItemInput = {
  id?: number | string
  name?: string
  slug?: string
  sku?: string
  variant?: string
  quantity?: number
  unitPrice?: number
  lineTotal?: number
}

export type InternalOrderCreateInput = {
  orderId: string
  provider: OrderPaymentProvider
  currency: string
  subtotal: number
  shippingTotal: number
  total: number
  items: InternalOrderItemInput[]
  customer: {
    email: string
    phone?: string
    firstName?: string
    lastName?: string
    address?: string
    city?: string
    zip?: string
    country?: string
    notes?: string
  }
  shipping?: {
    methodId?: string
    label?: string
    price?: number
    pickupPoint?: {
      carrier?: string
      id?: string
      code?: string
      name?: string
      street?: string
      city?: string
      zip?: string
      country?: string
    } | null
  }
  billing?: {
    sameAsShipping?: boolean
    isCompany?: boolean
    firstName?: string
    lastName?: string
    address?: string
    city?: string
    zip?: string
    country?: string
    companyName?: string
    companyId?: string
    vatId?: string
  }
}

export type InternalOrderUpdateInput = {
  paymentStatus?: OrderPaymentStatus
  stripeSessionId?: string
  stripePaymentIntentId?: string
  globalTransactionId?: string
  globalAuthCode?: string
  lastEvent?: string
  lastError?: string
  providerResponse?: unknown
}

type InternalPickupPointInput = NonNullable<NonNullable<InternalOrderCreateInput['shipping']>['pickupPoint']>

type PayloadOrderDoc = {
  id: number
  orderId?: string | null
  provider?: OrderPaymentProvider | null
  paymentStatus?: OrderPaymentStatus | null
  customerEmail?: string | null
  currency?: string | null
  total?: number | null
  purchaseCountRecorded?: boolean | null
  items?:
    | Array<{
        product?: number | { id?: number | string } | null
        quantity?: number | null
      }>
    | null
  providerData?: {
    stripeSessionId?: string | null
    stripePaymentIntentId?: string | null
    globalTransactionId?: string | null
    globalAuthCode?: string | null
    lastEvent?: string | null
    lastError?: string | null
    providerResponse?: string | null
  } | null
}

const sanitizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const toPositiveNumber = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0
}

const toProductId = (value: unknown): number | undefined => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return undefined
  }

  return numeric
}

const stringifyProviderResponse = (value: unknown) => {
  if (value == null) {
    return undefined
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const getPickupPointAddress = (pickupPoint: InternalPickupPointInput | null | undefined) => {
  if (!pickupPoint) {
    return undefined
  }

  const cityLine = [pickupPoint.zip, pickupPoint.city].filter(Boolean).join(' ').trim()
  const value = [pickupPoint.street, cityLine, pickupPoint.country].filter(Boolean).join(', ').trim()
  return value || undefined
}

const findOrderByOrderId = async (payload: Payload, orderId: string): Promise<PayloadOrderDoc | null> => {
  const result = await payload.find({
    collection: 'orders' as never,
    where: {
      orderId: {
        equals: orderId,
      },
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })

  return (result.docs[0] as PayloadOrderDoc | undefined) ?? null
}

const normalizeOrderSummary = (order: PayloadOrderDoc) => ({
  id: order.id,
  orderId: order.orderId || '',
  provider: order.provider || 'stripe',
  paymentStatus: order.paymentStatus || 'pending',
  customerEmail: order.customerEmail || '',
  currency: order.currency || 'CZK',
  total: typeof order.total === 'number' ? order.total : 0,
  purchaseCountRecorded: order.purchaseCountRecorded === true,
  providerData: {
    stripeSessionId: order.providerData?.stripeSessionId || '',
    stripePaymentIntentId: order.providerData?.stripePaymentIntentId || '',
    globalTransactionId: order.providerData?.globalTransactionId || '',
    globalAuthCode: order.providerData?.globalAuthCode || '',
    lastEvent: order.providerData?.lastEvent || '',
    lastError: order.providerData?.lastError || '',
  },
})

const resolvePaymentStatus = (
  currentStatus: OrderPaymentStatus | null | undefined,
  nextStatus: OrderPaymentStatus | undefined,
): OrderPaymentStatus => {
  if (!nextStatus) {
    return currentStatus || 'pending'
  }

  if (currentStatus === 'paid' && nextStatus !== 'paid') {
    return 'paid'
  }

  return nextStatus
}

const incrementPurchaseCounts = async (payload: Payload, order: PayloadOrderDoc) => {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return
  }

  const quantities = new Map<number, number>()

  for (const item of order.items) {
    const productId =
      typeof item?.product === 'object' && item.product
        ? toProductId(item.product.id)
        : toProductId(item?.product)

    if (!productId) {
      continue
    }

    const quantity = Math.max(0, Math.floor(toPositiveNumber(item?.quantity)))
    if (quantity <= 0) {
      continue
    }

    quantities.set(productId, (quantities.get(productId) || 0) + quantity)
  }

  for (const [productId, quantity] of quantities.entries()) {
    const product = await payload.findByID({
      collection: 'products' as never,
      id: productId,
      depth: 0,
      overrideAccess: true,
    })

    const currentPurchaseCount = toPositiveNumber((product as { purchaseCount?: unknown }).purchaseCount)

    await payload.update({
      collection: 'products' as never,
      id: productId,
      data: {
        purchaseCount: currentPurchaseCount + quantity,
      } as never,
      depth: 0,
      overrideAccess: true,
    })
  }
}

export const createOrder = async (payload: Payload, input: InternalOrderCreateInput) => {
  const orderId = sanitizeString(input.orderId)
  const customerEmail = sanitizeString(input.customer.email)

  if (!orderId) {
    throw new Error('Order ID is required.')
  }

  if (!customerEmail) {
    throw new Error('Customer email is required.')
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('At least one order item is required.')
  }

  const created = await payload.create({
    collection: 'orders' as never,
    overrideAccess: true,
    depth: 0,
    data: {
      orderId,
      provider: input.provider,
      paymentStatus: 'pending',
      customerEmail,
      customerPhone: sanitizeString(input.customer.phone) || undefined,
      customerFirstName: sanitizeString(input.customer.firstName) || undefined,
      customerLastName: sanitizeString(input.customer.lastName) || undefined,
      currency: sanitizeString(input.currency) || 'CZK',
      subtotal: toPositiveNumber(input.subtotal),
      shippingTotal: toPositiveNumber(input.shippingTotal),
      total: toPositiveNumber(input.total),
      shippingAddress: {
        country: sanitizeString(input.customer.country) || undefined,
        address: sanitizeString(input.customer.address) || undefined,
        city: sanitizeString(input.customer.city) || undefined,
        zip: sanitizeString(input.customer.zip) || undefined,
        notes: sanitizeString(input.customer.notes) || undefined,
      },
      billing: {
        sameAsShipping: input.billing?.sameAsShipping !== false,
        isCompany: input.billing?.isCompany === true,
        firstName: sanitizeString(input.billing?.firstName) || undefined,
        lastName: sanitizeString(input.billing?.lastName) || undefined,
        address: sanitizeString(input.billing?.address) || undefined,
        city: sanitizeString(input.billing?.city) || undefined,
        zip: sanitizeString(input.billing?.zip) || undefined,
        country: sanitizeString(input.billing?.country) || undefined,
        companyName: sanitizeString(input.billing?.companyName) || undefined,
        companyId: sanitizeString(input.billing?.companyId) || undefined,
        vatId: sanitizeString(input.billing?.vatId) || undefined,
      },
      shipping: {
        methodId: sanitizeString(input.shipping?.methodId) || undefined,
        label: sanitizeString(input.shipping?.label) || undefined,
        price: toPositiveNumber(input.shipping?.price),
        pickupCarrier: sanitizeString(input.shipping?.pickupPoint?.carrier) || undefined,
        pickupPointId: sanitizeString(input.shipping?.pickupPoint?.id) || undefined,
        pickupPointCode: sanitizeString(input.shipping?.pickupPoint?.code) || undefined,
        pickupPointName: sanitizeString(input.shipping?.pickupPoint?.name) || undefined,
        pickupPointAddress: getPickupPointAddress(input.shipping?.pickupPoint),
      },
      items: input.items.map((item) => ({
        product: toProductId(item.id),
        productSnapshotId: sanitizeString(item.id) || undefined,
        slug: sanitizeString(item.slug) || undefined,
        sku: sanitizeString(item.sku) || undefined,
        variant: sanitizeString(item.variant) || undefined,
        name: sanitizeString(item.name) || 'Produkt',
        quantity: Math.max(1, Math.floor(toPositiveNumber(item.quantity) || 1)),
        unitPrice: toPositiveNumber(item.unitPrice),
        lineTotal: toPositiveNumber(item.lineTotal),
      })),
      providerData: {
        lastEvent: 'order.created',
      },
      purchaseCountRecorded: false,
    } as never,
  })

  return normalizeOrderSummary(created as PayloadOrderDoc)
}

export const getOrderSummary = async (payload: Payload, orderId: string) => {
  const order = await findOrderByOrderId(payload, orderId)
  if (!order) {
    return null
  }

  return normalizeOrderSummary(order)
}

export const updateOrder = async (payload: Payload, orderId: string, input: InternalOrderUpdateInput) => {
  const existing = await findOrderByOrderId(payload, orderId)
  if (!existing) {
    return null
  }

  const nextPaymentStatus = resolvePaymentStatus(existing.paymentStatus, input.paymentStatus)
  const shouldRecordPurchaseCount = nextPaymentStatus === 'paid' && existing.purchaseCountRecorded !== true

  if (shouldRecordPurchaseCount) {
    await incrementPurchaseCounts(payload, existing)
  }

  const updated = await payload.update({
    collection: 'orders' as never,
    id: existing.id,
    depth: 0,
    overrideAccess: true,
    data: {
      paymentStatus: nextPaymentStatus,
      purchaseCountRecorded: existing.purchaseCountRecorded === true || shouldRecordPurchaseCount,
      providerData: {
        stripeSessionId: sanitizeString(input.stripeSessionId) || existing.providerData?.stripeSessionId || undefined,
        stripePaymentIntentId:
          sanitizeString(input.stripePaymentIntentId) || existing.providerData?.stripePaymentIntentId || undefined,
        globalTransactionId:
          sanitizeString(input.globalTransactionId) || existing.providerData?.globalTransactionId || undefined,
        globalAuthCode:
          sanitizeString(input.globalAuthCode) || existing.providerData?.globalAuthCode || undefined,
        lastEvent: sanitizeString(input.lastEvent) || existing.providerData?.lastEvent || undefined,
        lastError: sanitizeString(input.lastError) || existing.providerData?.lastError || undefined,
        providerResponse:
          stringifyProviderResponse(input.providerResponse) || existing.providerData?.providerResponse || undefined,
      },
    } as never,
  })

  return normalizeOrderSummary(updated as PayloadOrderDoc)
}
