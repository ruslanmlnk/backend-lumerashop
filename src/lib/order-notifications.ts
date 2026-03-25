import nodemailer from 'nodemailer'

type OrderNotificationReason = 'paid' | 'cash-on-delivery-created'

type OrderNotificationDoc = {
  orderId?: string | null
  provider?: string | null
  paymentStatus?: string | null
  currency?: string | null
  subtotal?: number | null
  shippingTotal?: number | null
  total?: number | null
  customerEmail?: string | null
  customerPhone?: string | null
  customerFirstName?: string | null
  customerLastName?: string | null
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
    pickupPointName?: string | null
    pickupPointAddress?: string | null
  } | null
  items?:
    | Array<{
        name?: string | null
        quantity?: number | null
        unitPrice?: number | null
        lineTotal?: number | null
        sku?: string | null
        variant?: string | null
      }>
    | null
}

type MailConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  to: string[]
}

let transporter:
  | ReturnType<typeof nodemailer.createTransport>
  | null = null

const readEnv = (name: string) => process.env[name]?.trim() || ''

const sanitizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const toPositiveNumber = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0
}

const toBoolean = (value: string) => /^(1|true|yes|on)$/i.test(value.trim())

const parseRecipients = (value: string) =>
  value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)

const getMailConfig = (): MailConfig | null => {
  const host = readEnv('SMTP_HOST')
  const secure = toBoolean(readEnv('SMTP_SECURE'))
  const rawPort = readEnv('SMTP_PORT')
  const port = Number(rawPort || (secure ? '465' : '587'))
  const user = readEnv('SMTP_USER')
  const pass = readEnv('SMTP_PASS')
  const from = readEnv('SMTP_FROM') || user
  const to = parseRecipients(readEnv('ORDER_NOTIFICATION_EMAIL'))

  if (!host || !Number.isFinite(port) || port <= 0 || !from || to.length === 0) {
    return null
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    to,
  }
}

const getTransporter = (config: MailConfig) => {
  if (transporter) {
    return transporter
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user || config.pass ? { user: config.user, pass: config.pass } : undefined,
  })

  return transporter
}

const formatMoney = (value: unknown, currency: string) =>
  new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(toPositiveNumber(value))

const getProviderLabel = (provider: unknown) => {
  if (provider === 'cash-on-delivery') {
    return 'Dobirka'
  }

  if (provider === 'global-payments') {
    return 'Global Payments'
  }

  if (provider === 'stripe') {
    return 'Stripe'
  }

  return sanitizeText(provider) || 'Neznamy zpusob'
}

const getStatusLabel = (status: unknown) => {
  if (status === 'paid') {
    return 'Zaplaceno'
  }

  if (status === 'failed') {
    return 'Platba selhala'
  }

  if (status === 'canceled') {
    return 'Zruseno'
  }

  return 'Ceka na potvrzeni'
}

const buildCustomerName = (order: OrderNotificationDoc) =>
  [sanitizeText(order.customerFirstName), sanitizeText(order.customerLastName)].filter(Boolean).join(' ') || 'Zakaznik'

const buildAddressLines = (
  address:
    | {
        address?: string | null
        city?: string | null
        zip?: string | null
        country?: string | null
        notes?: string | null
      }
    | null
    | undefined,
) => {
  if (!address) {
    return []
  }

  const cityLine = [sanitizeText(address.zip), sanitizeText(address.city)].filter(Boolean).join(' ').trim()
  const mainLine = [sanitizeText(address.address), cityLine, sanitizeText(address.country)]
    .filter(Boolean)
    .join(', ')
    .trim()

  const notes = sanitizeText(address.notes)
  return [mainLine, notes ? `Poznamka: ${notes}` : ''].filter(Boolean)
}

const buildBillingLines = (order: OrderNotificationDoc) => {
  if (order.billing?.sameAsShipping) {
    return ['Stejna jako dorucovaci adresa']
  }

  const companyBits = [
    sanitizeText(order.billing?.companyName),
    sanitizeText(order.billing?.companyId) ? `IC ${sanitizeText(order.billing?.companyId)}` : '',
    sanitizeText(order.billing?.vatId) ? `DIC ${sanitizeText(order.billing?.vatId)}` : '',
  ].filter(Boolean)

  const person = [sanitizeText(order.billing?.firstName), sanitizeText(order.billing?.lastName)].filter(Boolean).join(' ')
  const cityLine = [sanitizeText(order.billing?.zip), sanitizeText(order.billing?.city)].filter(Boolean).join(' ').trim()
  const addressLine = [sanitizeText(order.billing?.address), cityLine, sanitizeText(order.billing?.country)]
    .filter(Boolean)
    .join(', ')
    .trim()

  return [person, companyBits.join(' · '), addressLine].filter(Boolean)
}

const buildShippingSummary = (order: OrderNotificationDoc) => {
  const shippingBits = [
    sanitizeText(order.shipping?.label),
    order.shipping?.cashOnDelivery ? 'na dobirku' : '',
    sanitizeText(order.shipping?.pickupPointName) ? `vydejni misto: ${sanitizeText(order.shipping?.pickupPointName)}` : '',
  ].filter(Boolean)

  if (sanitizeText(order.shipping?.pickupPointAddress)) {
    shippingBits.push(sanitizeText(order.shipping?.pickupPointAddress))
  }

  return shippingBits
}

const buildItemsText = (order: OrderNotificationDoc, currency: string) => {
  const items = Array.isArray(order.items) ? order.items : []
  if (items.length === 0) {
    return 'Bez polozek'
  }

  return items
    .map((item) => {
      const quantity = Math.max(1, Math.floor(toPositiveNumber(item.quantity) || 1))
      const variant = sanitizeText(item.variant)
      const sku = sanitizeText(item.sku)
      const lineTotal = toPositiveNumber(item.lineTotal)
      const extras = [variant, sku ? `SKU ${sku}` : ''].filter(Boolean).join(' · ')

      return `- ${sanitizeText(item.name) || 'Produkt'} x${quantity}${extras ? ` (${extras})` : ''}: ${formatMoney(lineTotal, currency)}`
    })
    .join('\n')
}

const buildItemsHtml = (order: OrderNotificationDoc, currency: string) => {
  const items = Array.isArray(order.items) ? order.items : []
  if (items.length === 0) {
    return '<li>Bez polozek</li>'
  }

  return items
    .map((item) => {
      const quantity = Math.max(1, Math.floor(toPositiveNumber(item.quantity) || 1))
      const variant = sanitizeText(item.variant)
      const sku = sanitizeText(item.sku)
      const lineTotal = toPositiveNumber(item.lineTotal)
      const extras = [variant, sku ? `SKU ${sku}` : ''].filter(Boolean).join(' · ')

      return `<li><strong>${escapeHtml(sanitizeText(item.name) || 'Produkt')}</strong> x${quantity}${extras ? ` (${escapeHtml(extras)})` : ''}: ${escapeHtml(formatMoney(lineTotal, currency))}</li>`
    })
    .join('')
}

const buildSubject = (order: OrderNotificationDoc, reason: OrderNotificationReason) => {
  const orderId = sanitizeText(order.orderId) || 'bez-cisla'

  if (reason === 'paid') {
    return `Lumera: platba prijata ${orderId}`
  }

  return `Lumera: nova objednavka na dobirku ${orderId}`
}

const buildTextBody = (order: OrderNotificationDoc, reason: OrderNotificationReason) => {
  const currency = sanitizeText(order.currency) || 'CZK'
  const customerName = buildCustomerName(order)
  const shippingAddress = buildAddressLines(order.shippingAddress).join('\n')
  const billingAddress = buildBillingLines(order).join('\n')
  const shippingSummary = buildShippingSummary(order).join('\n')

  return [
    reason === 'paid'
      ? 'Byla prijata uspesna platba za objednavku.'
      : 'Byla vytvorena objednavka na dobirku.',
    '',
    `Objednavka: ${sanitizeText(order.orderId) || '-'}`,
    `Poskytovatel: ${getProviderLabel(order.provider)}`,
    `Stav platby: ${getStatusLabel(order.paymentStatus)}`,
    `Zakaznik: ${customerName}`,
    `E-mail: ${sanitizeText(order.customerEmail) || '-'}`,
    `Telefon: ${sanitizeText(order.customerPhone) || '-'}`,
    '',
    `Mezisoucet: ${formatMoney(order.subtotal, currency)}`,
    `Doprava: ${formatMoney(order.shippingTotal, currency)}`,
    `Celkem: ${formatMoney(order.total, currency)}`,
    '',
    'Doprava:',
    shippingSummary || '-',
    '',
    'Dorucovaci adresa:',
    shippingAddress || '-',
    '',
    'Fakturacni udaje:',
    billingAddress || '-',
    '',
    'Polozky:',
    buildItemsText(order, currency),
  ].join('\n')
}

const buildHtmlBody = (order: OrderNotificationDoc, reason: OrderNotificationReason) => {
  const currency = sanitizeText(order.currency) || 'CZK'
  const customerName = buildCustomerName(order)
  const shippingSummary = buildShippingSummary(order)
  const shippingAddress = buildAddressLines(order.shippingAddress)
  const billingAddress = buildBillingLines(order)

  const renderLines = (lines: string[]) =>
    lines.length ? `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : '<p>-</p>'

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2 style="margin:0 0 12px">${reason === 'paid' ? 'Platba prijata' : 'Objednavka na dobirku'}</h2>
      <p style="margin:0 0 16px">
        ${reason === 'paid' ? 'Byla prijata uspesna platba za objednavku.' : 'Byla vytvorena objednavka na dobirku.'}
      </p>
      <p><strong>Objednavka:</strong> ${escapeHtml(sanitizeText(order.orderId) || '-')}</p>
      <p><strong>Poskytovatel:</strong> ${escapeHtml(getProviderLabel(order.provider))}</p>
      <p><strong>Stav platby:</strong> ${escapeHtml(getStatusLabel(order.paymentStatus))}</p>
      <p><strong>Zakaznik:</strong> ${escapeHtml(customerName)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(sanitizeText(order.customerEmail) || '-')}</p>
      <p><strong>Telefon:</strong> ${escapeHtml(sanitizeText(order.customerPhone) || '-')}</p>
      <p><strong>Mezisoucet:</strong> ${escapeHtml(formatMoney(order.subtotal, currency))}</p>
      <p><strong>Doprava:</strong> ${escapeHtml(formatMoney(order.shippingTotal, currency))}</p>
      <p><strong>Celkem:</strong> ${escapeHtml(formatMoney(order.total, currency))}</p>
      <h3>Doprava</h3>
      ${renderLines(shippingSummary)}
      <h3>Dorucovaci adresa</h3>
      ${renderLines(shippingAddress)}
      <h3>Fakturacni udaje</h3>
      ${renderLines(billingAddress)}
      <h3>Polozky</h3>
      <ul>${buildItemsHtml(order, currency)}</ul>
    </div>
  `
}

export const notifyAdminAboutOrder = async (
  order: OrderNotificationDoc,
  reason: OrderNotificationReason,
) => {
  const config = getMailConfig()
  if (!config) {
    return false
  }

  const transport = getTransporter(config)
  await transport.sendMail({
    from: config.from,
    to: config.to.join(', '),
    replyTo: sanitizeText(order.customerEmail) || undefined,
    subject: buildSubject(order, reason),
    text: buildTextBody(order, reason),
    html: buildHtmlBody(order, reason),
  })

  return true
}
