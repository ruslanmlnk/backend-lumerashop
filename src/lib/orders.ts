import type { Payload } from 'payload'

import { normalizeDocumentId } from '@/lib/commerce'
import {
  sendOrderCanceledEmailToCustomer,
  sendOrderConfirmedEmailToCustomer,
} from '@/lib/customer-order-confirmation-email'
import { notifyAdminAboutOrder } from '@/lib/order-notifications'

export type OrderPaymentProvider = 'stripe' | 'global-payments' | 'cash-on-delivery'
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
  userId?: number | string
  items: InternalOrderItemInput[]
  coupon?: {
    id?: number | string
    code?: string
    discountPercent?: number
    discountAmount?: number
  } | null
  discounts?: {
    couponDiscountAmount?: number
    firstPurchaseDiscountAmount?: number
    bonusDiscountAmount?: number
    discountedSubtotal?: number
  } | null
  loyalty?: {
    bonusUnitsSpent?: number
    bonusUnitsEarned?: number
  } | null
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
    cashOnDelivery?: boolean
    pickupPoint?: {
      carrier?: string
      id?: string
      code?: string
      type?: string
      carrierId?: string
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

export type OrderDecisionSummary = {
  orderId: string
  isConfirmed: boolean
  confirmedAt: string
  confirmationEmailSentAt: string
  isCanceled: boolean
  canceledAt: string
  cancellationEmailSentAt: string
  currentStatus: 'pending' | 'confirmed' | 'canceled'
  alreadyConfirmed: boolean
  alreadyCanceled: boolean
}

type InternalPickupPointInput = NonNullable<NonNullable<InternalOrderCreateInput['shipping']>['pickupPoint']>

type PayloadOrderDoc = {
  id: number
  orderId?: string | null
  provider?: OrderPaymentProvider | null
  paymentStatus?: OrderPaymentStatus | null
  user?: number | string | { id?: number | string } | null
  customerEmail?: string | null
  currency?: string | null
  subtotal?: number | null
  shippingTotal?: number | null
  total?: number | null
  customerPhone?: string | null
  customerFirstName?: string | null
  customerLastName?: string | null
  isConfirmed?: boolean | null
  confirmedAt?: string | null
  confirmationEmailSentAt?: string | null
  isCanceled?: boolean | null
  canceledAt?: string | null
  cancellationEmailSentAt?: string | null
  purchaseCountRecorded?: boolean | null
  bonusLedgerRecorded?: boolean | null
  stockDecremented?: boolean | null
  shippingAddress?: {
    country?: string | null
    address?: string | null
    city?: string | null
    zip?: string | null
    notes?: string | null
  } | null
  billing?: {
    sameAsShipping?: boolean | null
    isCompany?: boolean | null
    firstName?: string | null
    lastName?: string | null
    address?: string | null
    city?: string | null
    zip?: string | null
    country?: string | null
    companyName?: string | null
    companyId?: string | null
    vatId?: string | null
  } | null
  shipping?: {
    methodId?: string | null
    label?: string | null
    price?: number | null
    cashOnDelivery?: boolean | null
    pickupCarrier?: string | null
    pickupPointId?: string | null
    pickupPointCode?: string | null
    pickupPointType?: string | null
    pickupPointCarrierId?: string | null
    pickupPointName?: string | null
    pickupPointAddress?: string | null
  } | null
  discounts?: {
    coupon?: number | string | { id?: number | string } | null
    couponCode?: string | null
    couponDiscountPercent?: number | null
    couponDiscountAmount?: number | null
    firstPurchaseDiscountAmount?: number | null
    bonusDiscountAmount?: number | null
    discountedSubtotal?: number | null
  } | null
  loyalty?: {
    bonusUnitsSpent?: number | null
    bonusUnitsEarned?: number | null
  } | null
  items?:
    | Array<{
        product?: number | { id?: number | string } | null
        name?: string | null
        quantity?: number | null
        unitPrice?: number | null
        lineTotal?: number | null
        sku?: string | null
        variant?: string | null
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

const toWholeUnits = (value: unknown) => Math.max(0, Math.floor(toPositiveNumber(value)))

const extractDocumentId = (value: unknown) => {
  if (value && typeof value === 'object' && 'id' in value) {
    return normalizeDocumentId(value.id)
  }

  return normalizeDocumentId(value)
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

const findOrderByDocumentId = async (
  payload: Payload,
  documentId: number | string,
): Promise<PayloadOrderDoc | null> => {
  try {
    return (await payload.findByID({
      collection: 'orders' as never,
      id: documentId,
      depth: 0,
      overrideAccess: true,
    })) as PayloadOrderDoc
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) {
      return null
    }

    throw error
  }
}

const normalizeOrderSummary = (order: PayloadOrderDoc) => ({
  id: order.id,
  orderId: order.orderId || '',
  provider: order.provider || 'stripe',
  paymentStatus: order.paymentStatus || 'pending',
  userId: extractDocumentId(order.user) ? String(extractDocumentId(order.user)) : '',
  customerEmail: order.customerEmail || '',
  currency: order.currency || 'CZK',
  total: typeof order.total === 'number' ? order.total : 0,
  purchaseCountRecorded: order.purchaseCountRecorded === true,
  bonusLedgerRecorded: order.bonusLedgerRecorded === true,
  couponCode: order.discounts?.couponCode || '',
  couponDiscountAmount: toPositiveNumber(order.discounts?.couponDiscountAmount),
  firstPurchaseDiscountAmount: toPositiveNumber(order.discounts?.firstPurchaseDiscountAmount),
  bonusDiscountAmount: toPositiveNumber(order.discounts?.bonusDiscountAmount),
  discountedSubtotal: toPositiveNumber(order.discounts?.discountedSubtotal),
  bonusUnitsSpent: toWholeUnits(order.loyalty?.bonusUnitsSpent),
  bonusUnitsEarned: toWholeUnits(order.loyalty?.bonusUnitsEarned),
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

const getCurrentOrderStatus = (order: PayloadOrderDoc): OrderDecisionSummary['currentStatus'] => {
  if (order.isCanceled === true) {
    return 'canceled'
  }

  if (order.isConfirmed === true) {
    return 'confirmed'
  }

  return 'pending'
}

const getOrderDecisionSummary = (
  order: PayloadOrderDoc,
  overrides?: Partial<Pick<OrderDecisionSummary, 'alreadyConfirmed' | 'alreadyCanceled'>>,
): OrderDecisionSummary => ({
  orderId: order.orderId || '',
  isConfirmed: order.isConfirmed === true,
  confirmedAt: sanitizeString(order.confirmedAt),
  confirmationEmailSentAt: sanitizeString(order.confirmationEmailSentAt),
  isCanceled: order.isCanceled === true,
  canceledAt: sanitizeString(order.canceledAt),
  cancellationEmailSentAt: sanitizeString(order.cancellationEmailSentAt),
  currentStatus: getCurrentOrderStatus(order),
  alreadyConfirmed: overrides?.alreadyConfirmed === true,
  alreadyCanceled: overrides?.alreadyCanceled === true,
})

const sendOrderNotificationSafely = async (
  order: PayloadOrderDoc,
  reason: 'paid' | 'cash-on-delivery-created',
) => {
  try {
    await notifyAdminAboutOrder(order, reason)
  } catch (error) {
    console.error('Failed to send order notification email.', error)
  }
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

const decrementStockQuantities = async (payload: Payload, order: PayloadOrderDoc) => {
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

    const currentStock = toPositiveNumber((product as { stockQuantity?: unknown }).stockQuantity)

    await payload.update({
      collection: 'products' as never,
      id: productId,
      data: {
        stockQuantity: Math.max(0, currentStock - quantity),
      } as never,
      depth: 0,
      overrideAccess: true,
    })
  }
}

const restoreStockQuantities = async (payload: Payload, order: PayloadOrderDoc) => {
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

    const currentStock = toPositiveNumber((product as { stockQuantity?: unknown }).stockQuantity)

    await payload.update({
      collection: 'products' as never,
      id: productId,
      data: {
        stockQuantity: currentStock + quantity,
      } as never,
      depth: 0,
      overrideAccess: true,
    })
  }
}

const syncUserBonusLedger = async (payload: Payload, order: PayloadOrderDoc) => {
  const userId = extractDocumentId(order.user)

  if (typeof userId !== 'number') {
    return
  }

  const spent = toWholeUnits(order.loyalty?.bonusUnitsSpent)
  const earned = toWholeUnits(order.loyalty?.bonusUnitsEarned)

  if (spent <= 0 && earned <= 0) {
    return
  }

  const user = await payload.findByID({
    collection: 'users' as never,
    id: userId,
    depth: 0,
    overrideAccess: true,
  })

  const currentBalance = toWholeUnits((user as { bonusBalance?: unknown }).bonusBalance)
  const currentEarned = toWholeUnits((user as { earnedBonusTotal?: unknown }).earnedBonusTotal)
  const currentSpent = toWholeUnits((user as { spentBonusTotal?: unknown }).spentBonusTotal)

  await payload.update({
    collection: 'users' as never,
    id: userId,
    depth: 0,
    overrideAccess: true,
    data: {
      bonusBalance: Math.max(0, currentBalance - spent + earned),
      earnedBonusTotal: currentEarned + earned,
      spentBonusTotal: currentSpent + spent,
    } as never,
  })
}

const markFirstPurchaseDiscountUsed = async (payload: Payload, order: PayloadOrderDoc) => {
  const userId = extractDocumentId(order.user)

  if (typeof userId !== 'number') {
    return
  }

  if (toPositiveNumber(order.discounts?.firstPurchaseDiscountAmount) <= 0) {
    return
  }

  const user = await payload.findByID({
    collection: 'users' as never,
    id: userId,
    depth: 0,
    overrideAccess: true,
  })

  if ((user as { firstPurchaseDiscountUsed?: unknown }).firstPurchaseDiscountUsed === true) {
    return
  }

  await payload.update({
    collection: 'users' as never,
    id: userId,
    depth: 0,
    overrideAccess: true,
    data: {
      firstPurchaseDiscountUsed: true,
    } as never,
  })
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
      user: extractDocumentId(input.userId) || undefined,
      customerEmail,
      customerPhone: sanitizeString(input.customer.phone) || undefined,
      customerFirstName: sanitizeString(input.customer.firstName) || undefined,
      customerLastName: sanitizeString(input.customer.lastName) || undefined,
      currency: sanitizeString(input.currency) || 'CZK',
      subtotal: toPositiveNumber(input.subtotal),
      shippingTotal: toPositiveNumber(input.shippingTotal),
      total: toPositiveNumber(input.total),
      discounts: {
        coupon: extractDocumentId(input.coupon?.id) || undefined,
        couponCode: sanitizeString(input.coupon?.code) || undefined,
        couponDiscountPercent: toPositiveNumber(input.coupon?.discountPercent),
        couponDiscountAmount:
          toPositiveNumber(input.coupon?.discountAmount) || toPositiveNumber(input.discounts?.couponDiscountAmount),
        firstPurchaseDiscountAmount: toPositiveNumber(input.discounts?.firstPurchaseDiscountAmount),
        bonusDiscountAmount: toPositiveNumber(input.discounts?.bonusDiscountAmount),
        discountedSubtotal: toPositiveNumber(input.discounts?.discountedSubtotal),
      },
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
        cashOnDelivery: input.shipping?.cashOnDelivery === true,
        pickupCarrier: sanitizeString(input.shipping?.pickupPoint?.carrier) || undefined,
        pickupPointId: sanitizeString(input.shipping?.pickupPoint?.id) || undefined,
        pickupPointCode: sanitizeString(input.shipping?.pickupPoint?.code) || undefined,
        pickupPointType: sanitizeString(input.shipping?.pickupPoint?.type) || undefined,
        pickupPointCarrierId: sanitizeString(input.shipping?.pickupPoint?.carrierId) || undefined,
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
      loyalty: {
        bonusUnitsSpent: toWholeUnits(input.loyalty?.bonusUnitsSpent),
        bonusUnitsEarned: toWholeUnits(input.loyalty?.bonusUnitsEarned),
      },
      purchaseCountRecorded: false,
      bonusLedgerRecorded: false,
      stockDecremented: false,
    } as never,
  })

  let createdOrder = created as PayloadOrderDoc

  if (createdOrder.stockDecremented !== true) {
    try {
      await decrementStockQuantities(payload, createdOrder)
      
      const res = await payload.update({
        collection: 'orders' as never,
        id: createdOrder.id,
        data: { stockDecremented: true } as never,
        depth: 0,
        overrideAccess: true,
      })
      createdOrder = res as PayloadOrderDoc
    } catch (e) {
      console.error('Failed to decrement stock for new order', createdOrder.id, e)
    }
  }

  if (input.provider === 'cash-on-delivery') {
    await sendOrderNotificationSafely(createdOrder, 'cash-on-delivery-created')
  }

  return normalizeOrderSummary(createdOrder)
}

export const getOrderSummary = async (payload: Payload, orderId: string) => {
  const order = await findOrderByOrderId(payload, orderId)
  if (!order) {
    return null
  }

  return normalizeOrderSummary(order)
}

export const getOrderDecision = async (
  payload: Payload,
  documentId: number | string,
): Promise<OrderDecisionSummary | null> => {
  const order = await findOrderByDocumentId(payload, documentId)
  if (!order) {
    return null
  }

  return getOrderDecisionSummary(order)
}

export const updateOrder = async (payload: Payload, orderId: string, input: InternalOrderUpdateInput) => {
  const existing = await findOrderByOrderId(payload, orderId)
  if (!existing) {
    return null
  }

  const nextPaymentStatus = resolvePaymentStatus(existing.paymentStatus, input.paymentStatus)
  const shouldRecordPurchaseCount = nextPaymentStatus === 'paid' && existing.purchaseCountRecorded !== true
  const shouldRecordBonusLedger = nextPaymentStatus === 'paid' && existing.bonusLedgerRecorded !== true
  const shouldMarkFirstPurchaseDiscountUsed =
    nextPaymentStatus === 'paid' &&
    existing.paymentStatus !== 'paid' &&
    toPositiveNumber(existing.discounts?.firstPurchaseDiscountAmount) > 0
  const shouldRestoreStockQuantities =
    nextPaymentStatus === 'canceled' &&
    existing.paymentStatus !== 'canceled' &&
    existing.stockDecremented === true

  if (shouldRestoreStockQuantities) {
    try {
      await restoreStockQuantities(payload, existing)
    } catch (e) {
      console.error('Failed to restore stock for cancelled order', existing.id, e)
    }
  }

  if (shouldRecordPurchaseCount) {
    await incrementPurchaseCounts(payload, existing)
  }

  if (shouldRecordBonusLedger) {
    await syncUserBonusLedger(payload, existing)
  }

  if (shouldMarkFirstPurchaseDiscountUsed) {
    await markFirstPurchaseDiscountUsed(payload, existing)
  }

  const updated = await payload.update({
    collection: 'orders' as never,
    id: existing.id,
    depth: 0,
    overrideAccess: true,
    data: {
      paymentStatus: nextPaymentStatus,
      purchaseCountRecorded: existing.purchaseCountRecorded === true || shouldRecordPurchaseCount,
      bonusLedgerRecorded: existing.bonusLedgerRecorded === true || shouldRecordBonusLedger,
      stockDecremented: shouldRestoreStockQuantities ? false : existing.stockDecremented,
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

  const updatedOrder = updated as PayloadOrderDoc

  if (nextPaymentStatus === 'paid' && existing.paymentStatus !== 'paid') {
    await sendOrderNotificationSafely(updatedOrder, 'paid')
  }

  return normalizeOrderSummary(updatedOrder)
}

export const confirmOrder = async (
  payload: Payload,
  documentId: number | string,
): Promise<OrderDecisionSummary | null> => {
  const existing = await findOrderByDocumentId(payload, documentId)
  if (!existing) {
    return null
  }

  if (existing.isCanceled === true) {
    throw new Error('Canceled orders cannot be accepted.')
  }

  if (existing.isConfirmed === true) {
    return getOrderDecisionSummary(existing, { alreadyConfirmed: true })
  }

  if (!sanitizeString(existing.customerEmail)) {
    throw new Error('Order is missing customer email.')
  }

  await sendOrderConfirmedEmailToCustomer(existing)

  const timestamp = new Date().toISOString()
  const updated = await payload.update({
    collection: 'orders' as never,
    id: existing.id,
    depth: 0,
    overrideAccess: true,
    data: {
      isConfirmed: true,
      confirmedAt: timestamp,
      confirmationEmailSentAt: timestamp,
    } as never,
  })

  return getOrderDecisionSummary(updated as PayloadOrderDoc)
}

export const cancelOrder = async (
  payload: Payload,
  documentId: number | string,
): Promise<OrderDecisionSummary | null> => {
  const existing = await findOrderByDocumentId(payload, documentId)
  if (!existing) {
    return null
  }

  if (existing.isCanceled === true) {
    return getOrderDecisionSummary(existing, { alreadyCanceled: true })
  }

  if (!sanitizeString(existing.customerEmail)) {
    throw new Error('Order is missing customer email.')
  }

  if (existing.stockDecremented === true) {
    try {
      await restoreStockQuantities(payload, existing)
    } catch (e) {
      console.error('Failed to restore stock for cancelled order via API', existing.id, e)
    }
  }

  await sendOrderCanceledEmailToCustomer(existing)

  const timestamp = new Date().toISOString()
  const updated = await payload.update({
    collection: 'orders' as never,
    id: existing.id,
    depth: 0,
    overrideAccess: true,
    data: {
      isCanceled: true,
      canceledAt: timestamp,
      cancellationEmailSentAt: timestamp,
      stockDecremented: false,
    } as never,
  })

  return getOrderDecisionSummary(updated as PayloadOrderDoc)
}
