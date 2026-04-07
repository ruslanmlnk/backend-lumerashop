import type { Payload } from 'payload'

type PplShipmentDoc = {
  batchId?: string | null
  shipmentNumber?: string | null
  importState?: string | null
  labelFormat?: string | null
  labelPageSize?: string | null
  labelUrl?: string | null
  completeLabelUrl?: string | null
  generatedAt?: string | null
  lastCheckedAt?: string | null
  lastError?: string | null
}

type PplOrderDoc = {
  id: number | string
  orderId?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  customerFirstName?: string | null
  customerLastName?: string | null
  paymentStatus?: string | null
  shippingAddress?: {
    country?: string | null
    address?: string | null
    city?: string | null
    zip?: string | null
    notes?: string | null
  } | null
  billing?: {
    address?: string | null
    city?: string | null
    zip?: string | null
    country?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null
  shipping?: {
    methodId?: string | null
    label?: string | null
    pickupPointId?: string | null
    pickupPointCode?: string | null
    pickupPointName?: string | null
    pickupPointAddress?: string | null
  } | null
  pplShipment?: PplShipmentDoc | null
}

type PplBatchStatusItem = {
  importState?: string
  labelUrl?: string
  shipmentNumber?: string
  referenceId?: string
  completeLabel?: {
    labelUrls?: string[]
  }
}

type PplBatchStatusResponse = {
  importState?: string
  items?: PplBatchStatusItem[]
}

type PplSyncResult = {
  shipment: PplShipmentDoc
  labelReady: boolean
  wasCreated: boolean
}

type DownloadedLabel = {
  contentType: string
  data: Uint8Array
  fileName: string
}

const DEFAULT_PPL_API_BASE_URL = 'https://api-dev.dhl.com/ecs/ppl/myapi2'
const DEFAULT_LABEL_FORMAT = 'Pdf'
const DEFAULT_LABEL_PAGE_SIZE = 'A4'
const DEFAULT_LABEL_DPI = 300
const DEFAULT_POLL_INTERVAL_MS = 1500
const DEFAULT_POLL_ATTEMPTS = 10

let cachedToken: string | null = null
let cachedTokenExpiresAt = 0

const readEnv = (name: string) => process.env[name]?.trim() || ''

const asCleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const sanitizePplText = (value: unknown, maxLength = 100) => {
  const normalized = asCleanString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized.slice(0, maxLength)
}

const sanitizePhone = (value: unknown) => asCleanString(value).replace(/[^\d+]/g, '')

const sanitizeZip = (value: unknown) => asCleanString(value).replace(/\s+/g, '')

const sanitizeCountry = (value: unknown) => {
  const normalized = sanitizePplText(value, 32).toUpperCase()

  if (normalized === 'CZECH REPUBLIC' || normalized === 'CZ') {
    return 'CZ'
  }

  if (normalized === 'SLOVAKIA' || normalized === 'SK') {
    return 'SK'
  }

  return normalized || 'CZ'
}

const getPplApiBaseUrl = () => readEnv('PPL_API_BASE_URL') || DEFAULT_PPL_API_BASE_URL

const getRequiredEnv = (name: string) => {
  const value = readEnv(name)
  if (!value) {
    throw new Error(`Missing ${name}.`)
  }

  return value
}

const getSenderConfig = () => ({
  name: sanitizePplText(getRequiredEnv('PPL_SENDER_NAME'), 70),
  street: sanitizePplText(getRequiredEnv('PPL_SENDER_STREET'), 70),
  city: sanitizePplText(getRequiredEnv('PPL_SENDER_CITY'), 50),
  zipCode: sanitizeZip(getRequiredEnv('PPL_SENDER_ZIP')),
  country: sanitizeCountry(getRequiredEnv('PPL_SENDER_COUNTRY')),
  email: asCleanString(getRequiredEnv('PPL_SENDER_EMAIL')),
  phone: sanitizePhone(getRequiredEnv('PPL_SENDER_PHONE')),
  contact: sanitizePplText(readEnv('PPL_SENDER_CONTACT') || readEnv('PPL_SENDER_NAME'), 70),
  depot: sanitizePplText(getRequiredEnv('PPL_DEPOT'), 10),
})

const isPplShippingMethod = (methodId: unknown) =>
  typeof methodId === 'string' && methodId.startsWith('ppl-')

const isPplPickupMethod = (methodId: unknown) =>
  typeof methodId === 'string' && methodId.includes('pickup')

const getProductTypeForOrder = (order: PplOrderDoc) => {
  if (isPplPickupMethod(order.shipping?.methodId)) {
    return readEnv('PPL_PRODUCT_TYPE_PICKUP') || 'BUSS'
  }

  return readEnv('PPL_PRODUCT_TYPE_COURIER') || 'PRIV'
}

const buildRecipientName = (order: PplOrderDoc) => {
  const fromCustomer = [order.customerFirstName, order.customerLastName]
    .map((value) => sanitizePplText(value, 35))
    .filter(Boolean)
    .join(' ')

  if (fromCustomer) {
    return fromCustomer
  }

  const fromBilling = [order.billing?.firstName, order.billing?.lastName]
    .map((value) => sanitizePplText(value, 35))
    .filter(Boolean)
    .join(' ')

  if (fromBilling) {
    return fromBilling
  }

  return sanitizePplText(order.customerEmail || order.orderId || 'Lumera customer', 70)
}

const buildRecipientAddress = (order: PplOrderDoc) => {
  const street =
    sanitizePplText(order.shippingAddress?.address, 70) ||
    sanitizePplText(order.billing?.address, 70) ||
    sanitizePplText(order.shipping?.pickupPointAddress, 70)

  const city =
    sanitizePplText(order.shippingAddress?.city, 50) ||
    sanitizePplText(order.billing?.city, 50)

  const zipCode = sanitizeZip(order.shippingAddress?.zip || order.billing?.zip)
  const country = sanitizeCountry(order.shippingAddress?.country || order.billing?.country || 'CZ')

  if (!street || !city || !zipCode) {
    throw new Error('Order is missing shipping address data required for PPL shipment.')
  }

  return {
    street,
    city,
    zipCode,
    country,
  }
}

const buildShipmentPayload = (order: PplOrderDoc) => {
  const sender = getSenderConfig()
  const recipientAddress = buildRecipientAddress(order)
  const recipientName = buildRecipientName(order)
  const phone = sanitizePhone(order.customerPhone)
  const email = asCleanString(order.customerEmail)

  if (!phone) {
    throw new Error('Order is missing customer phone required for PPL shipment.')
  }

  if (!email) {
    throw new Error('Order is missing customer email required for PPL shipment.')
  }

  const shipment: Record<string, unknown> = {
    referenceId: sanitizePplText(order.orderId, 40),
    productType: getProductTypeForOrder(order),
    note: sanitizePplText(order.shipping?.label || order.shippingAddress?.notes, 120),
    depot: sender.depot,
    sender: {
      name: sender.name,
      street: sender.street,
      city: sender.city,
      zipCode: sender.zipCode,
      country: sender.country,
      contact: sender.contact,
      email: sender.email,
      phone: sender.phone,
    },
    recipient: {
      name: recipientName,
      street: recipientAddress.street,
      city: recipientAddress.city,
      zipCode: recipientAddress.zipCode,
      country: recipientAddress.country,
      contact: recipientName,
      email,
      phone,
    },
  }

  const accessPointCode = sanitizePplText(order.shipping?.pickupPointCode || order.shipping?.pickupPointId, 40)
  if (isPplPickupMethod(order.shipping?.methodId)) {
    if (!accessPointCode) {
      throw new Error('PPL pickup shipment requires a pickup point code.')
    }

    shipment.specificDelivery = {
      accessPointCode,
    }
  }

  return {
    returnChannel: {
      type: 'Email',
      address: sender.email,
    },
    labelSettings: {
      format: readEnv('PPL_LABEL_FORMAT') || DEFAULT_LABEL_FORMAT,
      dpi: Number(readEnv('PPL_LABEL_DPI')) || DEFAULT_LABEL_DPI,
      completeLabelSettings: {
        isCompleteLabelRequested: true,
        pageSize: readEnv('PPL_LABEL_PAGE_SIZE') || DEFAULT_LABEL_PAGE_SIZE,
        position: 1,
      },
    },
    shipments: [shipment],
  }
}

const getAuthHeaders = (accessToken: string, contentType?: string): HeadersInit => {
  const headers: HeadersInit = {
    Authorization: `Bearer ${accessToken}`,
  }

  if (contentType) {
    headers['Content-Type'] = contentType
  }

  return headers
}

const getPplAccessToken = async (forceRefresh = false) => {
  const now = Date.now()
  if (!forceRefresh && cachedToken && cachedTokenExpiresAt > now + 60_000) {
    return cachedToken
  }

  const tokenEndpoint = `${getPplApiBaseUrl()}/login/getAccessToken`

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: getRequiredEnv('PPL_CLIENT_ID'),
    client_secret: getRequiredEnv('PPL_CLIENT_SECRET'),
    scope: 'myapi2',
  })

  // Try form-encoded client credentials first
  let response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  })

  let data = (await response.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    detail?: string
    title?: string
  }

  // If the API didn't accept the form params, try Basic auth fallback
  if ((!response.ok || !data.access_token) && getRequiredEnv('PPL_CLIENT_ID') && getRequiredEnv('PPL_CLIENT_SECRET')) {
    try {
      const basic = Buffer.from(`${getRequiredEnv('PPL_CLIENT_ID')}:${getRequiredEnv('PPL_CLIENT_SECRET')}`).toString('base64')

      response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'myapi2' }),
        cache: 'no-store',
      })

      data = (await response.json().catch(() => ({}))) as {
        access_token?: string
        expires_in?: number
        detail?: string
        title?: string
      }
    } catch (err) {
      // ignore and fall through to error handling below
    }
  }

  // If still not authenticated, try alternate parameter names (camelCase) and JSON body
  if ((!response.ok || !data.access_token) && getRequiredEnv('PPL_CLIENT_ID') && getRequiredEnv('PPL_CLIENT_SECRET')) {
    try {
      // try camelCase form fields
      response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          clientId: getRequiredEnv('PPL_CLIENT_ID'),
          clientSecret: getRequiredEnv('PPL_CLIENT_SECRET'),
          scope: 'myapi2',
        } as any),
        cache: 'no-store',
      })

      data = (await response.json().catch(() => ({}))) as {
        access_token?: string
        expires_in?: number
        detail?: string
        title?: string
      }

      // try JSON body if still not successful
      if ((!response.ok || !data.access_token)) {
        response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'client_credentials',
            clientId: getRequiredEnv('PPL_CLIENT_ID'),
            clientSecret: getRequiredEnv('PPL_CLIENT_SECRET'),
            scope: 'myapi2',
          }),
          cache: 'no-store',
        })

        data = (await response.json().catch(() => ({}))) as {
          access_token?: string
          expires_in?: number
          detail?: string
          title?: string
        }
      }
    } catch (err) {
      // ignore and fall through to error handling below
    }
  }

  if (!response.ok || !data.access_token) {
    const status = response.status
    const text = await response.text().catch(() => '')
    const detail = data.detail || data.title || text
    throw new Error(`Failed to authenticate with PPL (status: ${status}) - ${detail || 'no details'})`)
  }

  cachedToken = data.access_token
  cachedTokenExpiresAt = now + Math.max(60, Number(data.expires_in) || 1800) * 1000

  return cachedToken
}

const parseBatchId = (value: string) => {
  const trimmed = value.trim().replace(/^"+|"+$/g, '')
  if (!trimmed) {
    return ''
  }

  if (!trimmed.includes('/')) {
    return trimmed
  }

  const parts = trimmed.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

const createShipmentBatch = async (order: PplOrderDoc) => {
  const accessToken = await getPplAccessToken()
  const response = await fetch(`${getPplApiBaseUrl()}/shipment/batch`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken, 'application/json'),
    body: JSON.stringify(buildShipmentPayload(order)),
    cache: 'no-store',
  })

  const locationHeader = response.headers.get('location') || response.headers.get('Location') || ''
  const responseText = await response.text()
  const batchId = parseBatchId(locationHeader) || parseBatchId(responseText)

  if (!response.ok || !batchId) {
    throw new Error(responseText || 'PPL did not return a shipment batch ID.')
  }

  return {
    batchId,
    accessToken,
  }
}

const getBatchStatus = async (batchId: string, accessToken: string) => {
  const response = await fetch(`${getPplApiBaseUrl()}/shipment/batch/${encodeURIComponent(batchId)}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => ({}))) as PplBatchStatusResponse & {
    detail?: string
    title?: string
  }

  if (!response.ok) {
    throw new Error(payload.detail || payload.title || 'Failed to fetch PPL shipment batch status.')
  }

  return payload
}

const pickBatchItem = (batchStatus: PplBatchStatusResponse, referenceId: string) => {
  const items = Array.isArray(batchStatus.items) ? batchStatus.items : []

  return (
    items.find((item) => asCleanString(item.referenceId) === referenceId) ||
    items[0] ||
    null
  )
}

const pickCompleteLabelUrl = (item: PplBatchStatusItem | null) => {
  const urls = Array.isArray(item?.completeLabel?.labelUrls) ? item.completeLabel?.labelUrls : []
  return urls.find((url) => typeof url === 'string' && url.trim()) || ''
}

const normalizeShipmentState = (order: PplOrderDoc, batchId: string, batchStatus: PplBatchStatusResponse): PplShipmentDoc => {
  const item = pickBatchItem(batchStatus, asCleanString(order.orderId))
  const existing = order.pplShipment || {}

  return {
    batchId,
    shipmentNumber: asCleanString(item?.shipmentNumber) || existing.shipmentNumber || '',
    importState: asCleanString(item?.importState || batchStatus.importState) || existing.importState || '',
    labelFormat: readEnv('PPL_LABEL_FORMAT') || existing.labelFormat || DEFAULT_LABEL_FORMAT,
    labelPageSize: readEnv('PPL_LABEL_PAGE_SIZE') || existing.labelPageSize || DEFAULT_LABEL_PAGE_SIZE,
    labelUrl: asCleanString(item?.labelUrl) || existing.labelUrl || '',
    completeLabelUrl: pickCompleteLabelUrl(item) || existing.completeLabelUrl || '',
    generatedAt: existing.generatedAt || new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
    lastError: '',
  }
}

const persistShipmentState = async (payload: Payload, order: PplOrderDoc, shipment: PplShipmentDoc) =>
  payload.update({
    collection: 'orders' as never,
    id: order.id,
    depth: 0,
    overrideAccess: true,
    data: {
      pplShipment: shipment,
    } as never,
  })

const persistShipmentError = async (payload: Payload, order: PplOrderDoc, message: string) =>
  payload.update({
    collection: 'orders' as never,
    id: order.id,
    depth: 0,
    overrideAccess: true,
    data: {
      pplShipment: {
        ...(order.pplShipment || {}),
        batchId: asCleanString(order.pplShipment?.batchId),
        shipmentNumber: asCleanString(order.pplShipment?.shipmentNumber),
        importState: asCleanString(order.pplShipment?.importState) || 'Error',
        labelFormat: asCleanString(order.pplShipment?.labelFormat) || readEnv('PPL_LABEL_FORMAT') || DEFAULT_LABEL_FORMAT,
        labelPageSize:
          asCleanString(order.pplShipment?.labelPageSize) || readEnv('PPL_LABEL_PAGE_SIZE') || DEFAULT_LABEL_PAGE_SIZE,
        labelUrl: asCleanString(order.pplShipment?.labelUrl),
        completeLabelUrl: asCleanString(order.pplShipment?.completeLabelUrl),
        generatedAt: order.pplShipment?.generatedAt || new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
        lastError: message,
      },
    } as never,
  })

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForLabel = async (order: PplOrderDoc, batchId: string, accessToken: string) => {
  const attempts = Number(readEnv('PPL_POLL_ATTEMPTS')) || DEFAULT_POLL_ATTEMPTS
  const intervalMs = Number(readEnv('PPL_POLL_INTERVAL_MS')) || DEFAULT_POLL_INTERVAL_MS

  let lastStatus = await getBatchStatus(batchId, accessToken)

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const state = asCleanString(pickBatchItem(lastStatus, asCleanString(order.orderId))?.importState || lastStatus.importState)
    const labelUrl = asCleanString(pickBatchItem(lastStatus, asCleanString(order.orderId))?.labelUrl)
    const completeLabelUrl = pickCompleteLabelUrl(pickBatchItem(lastStatus, asCleanString(order.orderId)))

    if (state.toLowerCase() === 'complete' && (labelUrl || completeLabelUrl)) {
      return lastStatus
    }

    if (state && /(error|failed|invalid)/i.test(state)) {
      return lastStatus
    }

    if (attempt < attempts - 1) {
      await sleep(intervalMs)
      lastStatus = await getBatchStatus(batchId, accessToken)
    }
  }

  return lastStatus
}

const getOrderById = async (payload: Payload, id: number | string) => {
  const order = await payload.findByID({
    collection: 'orders' as never,
    id,
    depth: 0,
    overrideAccess: true,
  })

  return order as unknown as PplOrderDoc
}

const assertPplOrder = (order: PplOrderDoc) => {
  if (!order) {
    throw new Error('Order not found.')
  }

  if (!isPplShippingMethod(order.shipping?.methodId)) {
    throw new Error('This order does not use a PPL shipping method.')
  }
}

export const syncPplOrderLabel = async (payload: Payload, id: number | string): Promise<PplSyncResult> => {
  const order = await getOrderById(payload, id)
  assertPplOrder(order)

  try {
    let accessToken = await getPplAccessToken()
    let batchId = asCleanString(order.pplShipment?.batchId)
    let wasCreated = false

    if (!batchId) {
      const createdBatch = await createShipmentBatch(order)
      accessToken = createdBatch.accessToken
      batchId = createdBatch.batchId
      wasCreated = true
    }

    const batchStatus = await waitForLabel(order, batchId, accessToken)
    const shipment = normalizeShipmentState(order, batchId, batchStatus)
    await persistShipmentState(payload, order, shipment)

    return {
      shipment,
      labelReady: Boolean(shipment.completeLabelUrl || shipment.labelUrl),
      wasCreated,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync PPL label.'
    await persistShipmentError(payload, order, message)
    throw error
  }
}

const resolveLabelDownloadUrl = (shipment: PplShipmentDoc) =>
  asCleanString(shipment.completeLabelUrl) || asCleanString(shipment.labelUrl)

const downloadLabelAsset = async (url: string, accessToken: string, depth = 0): Promise<DownloadedLabel> => {
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || 'Failed to download PPL label.')
  }

  const contentType = response.headers.get('content-type') || ''

  if (depth < 2 && /application\/json|text\/plain|text\/html/i.test(contentType)) {
    const text = await response.text()
    const maybeUrl = parseBatchId(text)

    if (/^https?:\/\//i.test(maybeUrl)) {
      return downloadLabelAsset(maybeUrl, accessToken, depth + 1)
    }

    try {
      const json = JSON.parse(text) as { labelUrl?: string; url?: string } | string
      const nestedUrl =
        typeof json === 'string'
          ? parseBatchId(json)
          : parseBatchId(asCleanString(json.labelUrl || json.url))

      if (/^https?:\/\//i.test(nestedUrl)) {
        return downloadLabelAsset(nestedUrl, accessToken, depth + 1)
      }

      return {
        contentType: 'text/plain; charset=utf-8',
        data: new TextEncoder().encode(text),
        fileName: 'ppl-label.txt',
      }
    } catch {
      return {
        contentType: 'text/plain; charset=utf-8',
        data: new TextEncoder().encode(text),
        fileName: 'ppl-label.txt',
      }
    }
  }

  const extension = /pdf/i.test(contentType)
    ? 'pdf'
    : /jpeg|jpg/i.test(contentType)
      ? 'jpg'
      : /png/i.test(contentType)
        ? 'png'
        : /zpl/i.test(contentType)
          ? 'zpl'
          : 'bin'

  return {
    contentType: contentType || 'application/octet-stream',
    data: new Uint8Array(await response.arrayBuffer()),
    fileName: `ppl-label.${extension}`,
  }
}

export const downloadPplOrderLabel = async (payload: Payload, id: number | string) => {
  const syncResult = await syncPplOrderLabel(payload, id)
  const downloadUrl = resolveLabelDownloadUrl(syncResult.shipment)

  if (!downloadUrl) {
    throw new Error('PPL label is not ready yet.')
  }

  const accessToken = await getPplAccessToken()
  const order = await getOrderById(payload, id)
  const asset = await downloadLabelAsset(downloadUrl, accessToken)

  const safeOrderId = sanitizePplText(order.orderId || 'lumera-order', 40).replace(/\s+/g, '-').toLowerCase()
  const extension = asset.fileName.split('.').pop() || 'bin'

  return {
    contentType: asset.contentType,
    data: asset.data,
    fileName: `${safeOrderId}-ppl-label.${extension}`,
    shipment: syncResult.shipment,
  }
}
