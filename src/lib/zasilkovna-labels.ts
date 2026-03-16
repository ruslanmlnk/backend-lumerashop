import type { Payload } from 'payload'

type ZasilkovnaShipmentDoc = {
  packetId?: string | null
  packetNumber?: string | null
  carrierNumber?: string | null
  labelFormat?: string | null
  labelMode?: string | null
  generatedAt?: string | null
  lastCheckedAt?: string | null
  lastError?: string | null
}

type ZasilkovnaOrderItem = {
  product?: number | { id?: number | string } | null
  quantity?: number | null
}

type ZasilkovnaOrderDoc = {
  id: number | string
  orderId?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  customerFirstName?: string | null
  customerLastName?: string | null
  total?: number | null
  currency?: string | null
  shippingAddress?: {
    country?: string | null
    address?: string | null
    city?: string | null
    zip?: string | null
    notes?: string | null
  } | null
  billing?: {
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    address?: string | null
    city?: string | null
    zip?: string | null
    country?: string | null
  } | null
  shipping?: {
    methodId?: string | null
    label?: string | null
    pickupPointId?: string | null
    pickupPointCode?: string | null
    pickupPointName?: string | null
    pickupPointAddress?: string | null
  } | null
  items?: ZasilkovnaOrderItem[] | null
  zasilkovnaShipment?: ZasilkovnaShipmentDoc | null
}

type ProductSpec = {
  key?: string | null
  value?: string | null
}

type ProductDoc = {
  id: number | string
  specifications?: ProductSpec[] | null
}

type ZasilkovnaSyncResult = {
  shipment: ZasilkovnaShipmentDoc
  labelReady: boolean
  wasCreated: boolean
}

type DownloadedLabel = {
  contentType: string
  data: Uint8Array
  fileName: string
  shipment: ZasilkovnaShipmentDoc
}

const DEFAULT_API_BASE_URL = 'https://www.zasilkovna.cz/api/rest'
const DEFAULT_LABEL_FORMAT = 'pdf'
const DEFAULT_WEIGHT_KG = 1

const readEnv = (name: string) => process.env[name]?.trim() || ''

const asCleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const sanitizeText = (value: unknown, maxLength = 100) =>
  asCleanString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)

const sanitizePhone = (value: unknown) => asCleanString(value).replace(/[^\d+]/g, '')

const sanitizeZip = (value: unknown) => asCleanString(value).replace(/\s+/g, '')

const sanitizeCountry = (value: unknown) => {
  const normalized = sanitizeText(value, 32).toUpperCase()

  if (normalized === 'CZECH REPUBLIC' || normalized === 'CESKA REPUBLIKA' || normalized === 'CZ') {
    return 'CZ'
  }

  if (normalized === 'SLOVAKIA' || normalized === 'SLOVENSKO' || normalized === 'SK') {
    return 'SK'
  }

  return normalized || 'CZ'
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const decodeXml = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

const getRequiredEnv = (name: string) => {
  const value = readEnv(name)
  if (!value) {
    throw new Error(`Missing ${name}.`)
  }

  return value
}

const getApiBaseUrl = () => readEnv('PACKETA_API_BASE_URL') || DEFAULT_API_BASE_URL

const isZasilkovnaShippingMethod = (methodId: unknown) =>
  typeof methodId === 'string' && methodId.startsWith('zasilkovna-')

const isZasilkovnaPickupMethod = (methodId: unknown) =>
  typeof methodId === 'string' && methodId.includes('pickup')

const isCashOnDeliveryMethod = (methodId: unknown) =>
  typeof methodId === 'string' && methodId.endsWith('-cod')

const getOrderById = async (payload: Payload, id: number | string) => {
  const order = await payload.findByID({
    collection: 'orders' as never,
    id,
    depth: 0,
    overrideAccess: true,
  })

  return order as unknown as ZasilkovnaOrderDoc
}

const assertZasilkovnaOrder = (order: ZasilkovnaOrderDoc) => {
  if (!order) {
    throw new Error('Order not found.')
  }

  if (!isZasilkovnaShippingMethod(order.shipping?.methodId)) {
    throw new Error('This order does not use a Zasilkovna shipping method.')
  }
}

const getRecipientName = (order: ZasilkovnaOrderDoc) => {
  const firstName =
    sanitizeText(order.customerFirstName, 50) || sanitizeText(order.billing?.firstName, 50) || 'Customer'
  const lastName = sanitizeText(order.customerLastName, 50) || sanitizeText(order.billing?.lastName, 50) || '.'

  return {
    firstName,
    lastName,
  }
}

const getRecipientAddress = (order: ZasilkovnaOrderDoc) => {
  const street = sanitizeText(order.shippingAddress?.address || order.billing?.address, 80)
  const city = sanitizeText(order.shippingAddress?.city || order.billing?.city, 60)
  const zip = sanitizeZip(order.shippingAddress?.zip || order.billing?.zip)
  const country = sanitizeCountry(order.shippingAddress?.country || order.billing?.country || 'CZ')

  if (!street || !city || !zip) {
    throw new Error('Order is missing address data required for Zasilkovna shipment.')
  }

  return {
    street,
    city,
    zip,
    country,
  }
}

const getPickupPointId = (order: ZasilkovnaOrderDoc) =>
  sanitizeText(order.shipping?.pickupPointId || order.shipping?.pickupPointCode, 50)

const toPositiveNumber = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0
}

const parseWeightKg = (value: unknown) => {
  const normalized = asCleanString(value).toLowerCase().replace(',', '.')
  const match = normalized.match(/(\d+(?:\.\d+)?)/)

  if (!match) {
    return 0
  }

  const numeric = Number(match[1])
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0
  }

  if (/\bg\b/.test(normalized) && !/\bkg\b/.test(normalized)) {
    return numeric / 1000
  }

  return numeric
}

const resolveProductId = (value: unknown) => {
  if (value && typeof value === 'object' && 'id' in value) {
    return resolveProductId(value.id)
  }

  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined
}

const estimateOrderWeightKg = async (payload: Payload, order: ZasilkovnaOrderDoc) => {
  let totalWeightKg = 0

  for (const item of order.items || []) {
    const productId = resolveProductId(item?.product)
    if (!productId) {
      continue
    }

    const product = (await payload.findByID({
      collection: 'products' as never,
      id: productId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as ProductDoc

    const weightSpec = (product.specifications || []).find((spec) => /hmotnost|weight/i.test(asCleanString(spec?.key)))
    const weightKg = parseWeightKg(weightSpec?.value)
    if (weightKg <= 0) {
      continue
    }

    const quantity = Math.max(1, Math.floor(toPositiveNumber(item?.quantity) || 1))
    totalWeightKg += weightKg * quantity
  }

  if (totalWeightKg > 0) {
    return Number(totalWeightKg.toFixed(3))
  }

  const envWeight = Number(readEnv('PACKETA_DEFAULT_WEIGHT_KG')) || DEFAULT_WEIGHT_KG
  return Number(Math.max(0.001, envWeight).toFixed(3))
}

const tag = (name: string, value: string | number | undefined) => {
  if (value == null) {
    return ''
  }

  const stringValue = typeof value === 'number' ? String(value) : value
  if (!stringValue.trim()) {
    return ''
  }

  return `<${name}>${escapeXml(stringValue)}</${name}>`
}

const getTagContent = (xml: string, tagName: string) => {
  const match = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'i'))
  return match ? decodeXml(match[1].trim()) : ''
}

const getFaultMessage = (xml: string) =>
  getTagContent(xml, 'string') || getTagContent(xml, 'fault') || 'Packeta API request failed.'

const getResultContent = (xml: string) => getTagContent(xml, 'result')

const callPacketaApi = async (methodName: string, innerXml: string) => {
  const apiPassword = getRequiredEnv('PACKETA_API_PASSWORD')
  const body = `<?xml version="1.0" encoding="utf-8"?><${methodName}><apiPassword>${escapeXml(
    apiPassword,
  )}</apiPassword>${innerXml}</${methodName}>`

  const response = await fetch(getApiBaseUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
    },
    body,
    cache: 'no-store',
  })

  const text = await response.text()

  if (!response.ok || /<status>\s*fault\s*<\/status>/i.test(text)) {
    throw new Error(getFaultMessage(text))
  }

  return text
}

const buildCreatePacketInnerXml = async (payload: Payload, order: ZasilkovnaOrderDoc) => {
  const recipient = getRecipientName(order)
  const phone = sanitizePhone(order.customerPhone)
  const email = asCleanString(order.customerEmail)
  const insuredValue = Math.max(1, Math.round(toPositiveNumber(order.total) * 100) / 100)
  const currency = sanitizeText(order.currency || 'CZK', 8) || 'CZK'
  const eshopId = getRequiredEnv('PACKETA_ESHOP_ID')
  const weightKg = await estimateOrderWeightKg(payload, order)

  if (!phone) {
    throw new Error('Order is missing customer phone required for Zasilkovna shipment.')
  }

  if (!email) {
    throw new Error('Order is missing customer email required for Zasilkovna shipment.')
  }

  const baseFields = [
    tag('number', sanitizeText(order.orderId, 40)),
    tag('name', recipient.firstName),
    tag('surname', recipient.lastName),
    tag('company', sanitizeText(order.billing?.companyName, 80)),
    tag('email', email),
    tag('phone', phone),
    tag('value', insuredValue.toFixed(2)),
    tag('currency', currency),
    tag('eshop_id', eshopId),
    tag('weight', weightKg.toFixed(3)),
  ]

  if (isCashOnDeliveryMethod(order.shipping?.methodId)) {
    baseFields.push(tag('cod', insuredValue.toFixed(2)))
  }

  if (isZasilkovnaPickupMethod(order.shipping?.methodId)) {
    const addressId = getPickupPointId(order)
    if (!addressId) {
      throw new Error('Zasilkovna pickup shipment requires a pickup point ID.')
    }

    baseFields.push(tag('addressId', addressId))
  } else {
    const address = getRecipientAddress(order)
    baseFields.push(tag('homeDelivery', '1'))
    baseFields.push(tag('street', address.street))
    baseFields.push(tag('city', address.city))
    baseFields.push(tag('zip', address.zip))
    baseFields.push(tag('country', address.country))
  }

  return `<packet>${baseFields.join('')}</packet>`
}

const parseCreatedPacket = (xml: string) => {
  const result = getResultContent(xml)
  const packetId = getTagContent(result, 'id') || getTagContent(result, 'packetId') || getTagContent(xml, 'id')
  const packetNumber =
    getTagContent(result, 'barcode') || getTagContent(result, 'number') || getTagContent(xml, 'barcode')

  if (!packetId) {
    throw new Error('Packeta did not return a packet ID.')
  }

  return {
    packetId,
    packetNumber,
  }
}

const createPacket = async (payload: Payload, order: ZasilkovnaOrderDoc) => {
  const xml = await callPacketaApi('createPacket', await buildCreatePacketInnerXml(payload, order))
  return parseCreatedPacket(xml)
}

const fetchCourierNumber = async (packetId: string) => {
  const xml = await callPacketaApi('packetCourierNumber', tag('packetId', packetId))
  return getResultContent(xml) || getTagContent(xml, 'number')
}

const fetchLabelPdf = async (packetId: string, courier: boolean) => {
  const methodName = courier ? 'packetCourierLabelPdf' : 'packetLabelPdf'
  const xml = await callPacketaApi(methodName, tag('packetId', packetId))
  const result = getResultContent(xml)
  const normalized = result.replace(/\s+/g, '')

  if (!normalized) {
    throw new Error('Packeta did not return a label payload.')
  }

  return normalized
}

const persistShipmentState = async (payload: Payload, order: ZasilkovnaOrderDoc, shipment: ZasilkovnaShipmentDoc) =>
  payload.update({
    collection: 'orders' as never,
    id: order.id,
    depth: 0,
    overrideAccess: true,
    data: {
      zasilkovnaShipment: shipment,
    } as never,
  })

const persistShipmentError = async (payload: Payload, order: ZasilkovnaOrderDoc, message: string) =>
  payload.update({
    collection: 'orders' as never,
    id: order.id,
    depth: 0,
    overrideAccess: true,
    data: {
      zasilkovnaShipment: {
        ...(order.zasilkovnaShipment || {}),
        packetId: asCleanString(order.zasilkovnaShipment?.packetId),
        packetNumber: asCleanString(order.zasilkovnaShipment?.packetNumber),
        carrierNumber: asCleanString(order.zasilkovnaShipment?.carrierNumber),
        labelFormat: asCleanString(order.zasilkovnaShipment?.labelFormat) || DEFAULT_LABEL_FORMAT,
        labelMode: asCleanString(order.zasilkovnaShipment?.labelMode) || '',
        generatedAt: order.zasilkovnaShipment?.generatedAt || new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
        lastError: message,
      },
    } as never,
  })

const normalizeShipmentState = (order: ZasilkovnaOrderDoc, created: { packetId: string; packetNumber?: string }, carrierNumber: string) => ({
  packetId: created.packetId,
  packetNumber: created.packetNumber || asCleanString(order.zasilkovnaShipment?.packetNumber),
  carrierNumber: carrierNumber || asCleanString(order.zasilkovnaShipment?.carrierNumber),
  labelFormat: DEFAULT_LABEL_FORMAT,
  labelMode: isZasilkovnaPickupMethod(order.shipping?.methodId) ? 'pickup' : 'courier',
  generatedAt: order.zasilkovnaShipment?.generatedAt || new Date().toISOString(),
  lastCheckedAt: new Date().toISOString(),
  lastError: '',
})

export const syncZasilkovnaOrderLabel = async (payload: Payload, id: number | string): Promise<ZasilkovnaSyncResult> => {
  const order = await getOrderById(payload, id)
  assertZasilkovnaOrder(order)

  try {
    let wasCreated = false
    let packetId = asCleanString(order.zasilkovnaShipment?.packetId)
    let packetNumber = asCleanString(order.zasilkovnaShipment?.packetNumber)

    if (!packetId) {
      const created = await createPacket(payload, order)
      packetId = created.packetId
      packetNumber = created.packetNumber
      wasCreated = true
    }

    const carrierNumber =
      isZasilkovnaPickupMethod(order.shipping?.methodId) ? '' : await fetchCourierNumber(packetId)

    const shipment = normalizeShipmentState(
      order,
      {
        packetId,
        packetNumber,
      },
      carrierNumber,
    )

    await persistShipmentState(payload, order, shipment)

    return {
      shipment,
      labelReady: true,
      wasCreated,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync Zasilkovna label.'
    await persistShipmentError(payload, order, message)
    throw error
  }
}

export const downloadZasilkovnaOrderLabel = async (payload: Payload, id: number | string): Promise<DownloadedLabel> => {
  const syncResult = await syncZasilkovnaOrderLabel(payload, id)
  const courier = syncResult.shipment.labelMode === 'courier'
  const packetId = asCleanString(syncResult.shipment.packetId)

  if (!packetId) {
    throw new Error('Zasilkovna packet ID is missing.')
  }

  const pdfBase64 = await fetchLabelPdf(packetId, courier)
  const order = await getOrderById(payload, id)
  const safeOrderId = sanitizeText(order.orderId || 'lumera-order', 40).replace(/\s+/g, '-').toLowerCase()

  return {
    contentType: 'application/pdf',
    data: new Uint8Array(Buffer.from(pdfBase64, 'base64')),
    fileName: `${safeOrderId}-zasilkovna-label.pdf`,
    shipment: syncResult.shipment,
  }
}
