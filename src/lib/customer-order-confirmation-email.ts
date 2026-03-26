import nodemailer from 'nodemailer'

export type OrderCustomerEmailStatus = 'confirmed' | 'canceled'

type OrderStatusEmailDoc = {
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
    label?: string | null
    price?: number | null
    cashOnDelivery?: boolean | null
    pickupPointName?: string | null
    pickupPointAddress?: string | null
  } | null
  items?:
    | Array<{
        name?: string | null
        quantity?: number | null
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

const getMailConfig = (): MailConfig | null => {
  const host = readEnv('SMTP_HOST')
  const secure = toBoolean(readEnv('SMTP_SECURE'))
  const rawPort = readEnv('SMTP_PORT')
  const port = Number(rawPort || (secure ? '465' : '587'))
  const user = readEnv('SMTP_USER')
  const pass = readEnv('SMTP_PASS')
  const from = readEnv('SMTP_FROM') || user

  if (!host || !Number.isFinite(port) || port <= 0 || !from) {
    return null
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
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

const buildCustomerName = (order: OrderStatusEmailDoc) =>
  [sanitizeText(order.customerFirstName), sanitizeText(order.customerLastName)].filter(Boolean).join(' ') || 'Zakazniku'

const buildShippingLines = (order: OrderStatusEmailDoc) => {
  const lines = [
    sanitizeText(order.shipping?.label),
    order.shipping?.cashOnDelivery ? 'Platba probiha pri prevzeti zasilky.' : '',
    sanitizeText(order.shipping?.pickupPointName) ? `Vydejni misto: ${sanitizeText(order.shipping?.pickupPointName)}` : '',
    sanitizeText(order.shipping?.pickupPointAddress),
  ].filter(Boolean)

  if (order.shippingAddress) {
    const cityLine = [sanitizeText(order.shippingAddress.zip), sanitizeText(order.shippingAddress.city)]
      .filter(Boolean)
      .join(' ')
      .trim()
    const addressLine = [
      sanitizeText(order.shippingAddress.address),
      cityLine,
      sanitizeText(order.shippingAddress.country),
    ]
      .filter(Boolean)
      .join(', ')
      .trim()

    if (addressLine) {
      lines.push(`Doruceni: ${addressLine}`)
    }
  }

  const notes = sanitizeText(order.shippingAddress?.notes)
  if (notes) {
    lines.push(`Poznamka: ${notes}`)
  }

  return lines
}

const buildBillingLines = (order: OrderStatusEmailDoc) => {
  if (order.billing?.sameAsShipping) {
    return ['Fakturacni adresa je stejna jako dorucovaci.']
  }

  const person = [sanitizeText(order.billing?.firstName), sanitizeText(order.billing?.lastName)]
    .filter(Boolean)
    .join(' ')
  const company = [
    sanitizeText(order.billing?.companyName),
    sanitizeText(order.billing?.companyId) ? `IC ${sanitizeText(order.billing?.companyId)}` : '',
    sanitizeText(order.billing?.vatId) ? `DIC ${sanitizeText(order.billing?.vatId)}` : '',
  ]
    .filter(Boolean)
    .join(' | ')
  const cityLine = [sanitizeText(order.billing?.zip), sanitizeText(order.billing?.city)].filter(Boolean).join(' ').trim()
  const addressLine = [
    sanitizeText(order.billing?.address),
    cityLine,
    sanitizeText(order.billing?.country),
  ]
    .filter(Boolean)
    .join(', ')
    .trim()

  return [person, company, addressLine].filter(Boolean)
}

const buildItemsText = (order: OrderStatusEmailDoc, currency: string) => {
  const items = Array.isArray(order.items) ? order.items : []

  if (items.length === 0) {
    return 'Bez polozek'
  }

  return items
    .map((item) => {
      const quantity = Math.max(1, Math.floor(toPositiveNumber(item.quantity) || 1))
      const extras = [sanitizeText(item.variant), sanitizeText(item.sku) ? `SKU ${sanitizeText(item.sku)}` : '']
        .filter(Boolean)
        .join(' | ')

      return `- ${sanitizeText(item.name) || 'Produkt'} x${quantity}${extras ? ` (${extras})` : ''}: ${formatMoney(
        item.lineTotal,
        currency,
      )}`
    })
    .join('\n')
}

const buildItemsHtml = (order: OrderStatusEmailDoc, currency: string) => {
  const items = Array.isArray(order.items) ? order.items : []

  if (items.length === 0) {
    return '<li>Bez polozek</li>'
  }

  return items
    .map((item) => {
      const quantity = Math.max(1, Math.floor(toPositiveNumber(item.quantity) || 1))
      const extras = [sanitizeText(item.variant), sanitizeText(item.sku) ? `SKU ${sanitizeText(item.sku)}` : '']
        .filter(Boolean)
        .join(' | ')

      return `<li style="margin:0 0 10px"><strong>${escapeHtml(sanitizeText(item.name) || 'Produkt')}</strong> x${quantity}${
        extras ? ` <span style="color:#6b6258">(${escapeHtml(extras)})</span>` : ''
      }<span style="float:right;font-weight:700">${escapeHtml(formatMoney(item.lineTotal, currency))}</span></li>`
    })
    .join('')
}

const getStatusCopy = (status: OrderCustomerEmailStatus, order: OrderStatusEmailDoc) => {
  if (status === 'canceled') {
    return {
      title: 'Objednavka zrusena',
      hero: 'Vasi objednavku jsme zrusili.',
      intro: 'vasi objednavku jsme zrusili.',
      detail:
        order.paymentStatus === 'paid'
          ? 'Pokud uz byla platba provedena, ozveme se vam s dalsim postupem ohledne vraceni platby.'
          : 'Pokud budete chtit vytvorit novou objednavku, staci se vratit zpet na web a objednat znovu.',
      subject: `Lumera: objednavka ${sanitizeText(order.orderId) || ''} byla zrusena`,
    }
  }

  if (order.provider === 'cash-on-delivery' || order.shipping?.cashOnDelivery) {
    return {
      title: 'Objednavka prijata',
      hero: 'Vasi objednavku jsme prijali a nyni ji pripravujeme k odeslani.',
      intro: 'vasi objednavku jsme uspesne prijali.',
      detail: 'Zvolili jste dobirku. Uhradu provedete pri prevzeti zasilky.',
      subject: `Lumera: objednavka ${sanitizeText(order.orderId) || ''} byla prijata`,
    }
  }

  if (order.paymentStatus === 'paid') {
    return {
      title: 'Objednavka prijata',
      hero: 'Vasi objednavku jsme prijali a nyni ji pripravujeme k odeslani.',
      intro: 'vasi objednavku jsme uspesne prijali.',
      detail: 'Platba byla prijata a objednavka je pripravena k dalsimu zpracovani.',
      subject: `Lumera: objednavka ${sanitizeText(order.orderId) || ''} byla prijata`,
    }
  }

  return {
    title: 'Objednavka prijata',
    hero: 'Vasi objednavku jsme prijali a nyni ji pripravujeme k odeslani.',
    intro: 'vasi objednavku jsme uspesne prijali.',
    detail: 'Objednavku jsme prijali a budeme ji dale zpracovavat podle zvolene platby a dopravy.',
    subject: `Lumera: objednavka ${sanitizeText(order.orderId) || ''} byla prijata`,
  }
}

const buildTextBody = (order: OrderStatusEmailDoc, status: OrderCustomerEmailStatus) => {
  const currency = sanitizeText(order.currency) || 'CZK'
  const shippingLines = buildShippingLines(order).join('\n')
  const billingLines = buildBillingLines(order).join('\n')
  const copy = getStatusCopy(status, order)

  return [
    `Dobry den, ${buildCustomerName(order)},`,
    '',
    copy.intro,
    copy.detail,
    '',
    `Cislo objednavky: ${sanitizeText(order.orderId) || '-'}`,
    `E-mail: ${sanitizeText(order.customerEmail) || '-'}`,
    `Telefon: ${sanitizeText(order.customerPhone) || '-'}`,
    '',
    `Mezisoucet: ${formatMoney(order.subtotal, currency)}`,
    `Doprava: ${formatMoney(order.shippingTotal, currency)}`,
    `Celkem: ${formatMoney(order.total, currency)}`,
    '',
    'Doprava:',
    shippingLines || '-',
    '',
    'Fakturacni udaje:',
    billingLines || '-',
    '',
    'Objednane produkty:',
    buildItemsText(order, currency),
    '',
    'Dekujeme,',
    'Lumera',
  ].join('\n')
}

const buildHtmlLines = (lines: string[]) =>
  lines.length
    ? `<ul style="margin:0;padding-left:18px;color:#3f372f">${lines
        .map((line) => `<li style="margin:0 0 8px">${escapeHtml(line)}</li>`)
        .join('')}</ul>`
    : '<p style="margin:0;color:#6b6258">-</p>'

const buildSummaryCard = (label: string, value: string) => `
  <div style="padding:14px 16px;border:1px solid #ede5da;border-radius:18px;background:#fffdf9">
    <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a7a68;margin-bottom:6px">${escapeHtml(label)}</div>
    <div style="font-size:18px;font-weight:700;color:#111111">${escapeHtml(value)}</div>
  </div>
`

const buildHtmlBody = (order: OrderStatusEmailDoc, status: OrderCustomerEmailStatus) => {
  const currency = sanitizeText(order.currency) || 'CZK'
  const shippingLines = buildShippingLines(order)
  const billingLines = buildBillingLines(order)
  const copy = getStatusCopy(status, order)
  const heroBackground =
    status === 'canceled'
      ? 'linear-gradient(135deg,#3a1515 0%,#6e2626 100%)'
      : 'linear-gradient(135deg,#111111 0%,#2d241b 100%)'
  const accentColor = status === 'canceled' ? '#efb4aa' : '#d7c29f'
  const heroText = status === 'canceled' ? '#fde9e4' : '#f5ede1'

  return `
    <div style="margin:0;padding:32px 12px;background:linear-gradient(180deg,#f7f4ef 0%,#efe4d2 100%);font-family:Arial,sans-serif;color:#111111">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 18px 60px rgba(17,17,17,0.08)">
        <div style="padding:36px 36px 28px;background:${heroBackground};color:#ffffff">
          <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:${accentColor};margin-bottom:14px">Lumera</div>
          <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.05;font-weight:700">
            ${escapeHtml(copy.title)}
          </h1>
          <p style="margin:0;font-size:16px;line-height:1.7;color:${heroText}">
            ${escapeHtml(copy.hero)}
          </p>
        </div>

        <div style="padding:32px 36px">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#2f2a24">
            Dobry den, <strong>${escapeHtml(buildCustomerName(order))}</strong>,
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#4a433b">
            ${escapeHtml(copy.detail)}
          </p>

          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 24px">
            ${buildSummaryCard('Objednavka', sanitizeText(order.orderId) || '-')}
            ${buildSummaryCard('Celkem', formatMoney(order.total, currency))}
            ${buildSummaryCard('Doprava', sanitizeText(order.shipping?.label) || 'Upresnime e-mailem')}
          </div>

          <div style="border:1px solid #ede5da;border-radius:24px;padding:24px;background:#fffdf9;margin-bottom:20px">
            <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.1;color:#111111">
              Objednane produkty
            </h2>
            <ul style="margin:0;padding-left:20px;color:#2f2a24;line-height:1.8">
              ${buildItemsHtml(order, currency)}
            </ul>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:20px">
            <div style="border:1px solid #ede5da;border-radius:24px;padding:22px;background:#ffffff">
              <h3 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.15;color:#111111">
                Doprava
              </h3>
              ${buildHtmlLines(shippingLines)}
            </div>
            <div style="border:1px solid #ede5da;border-radius:24px;padding:22px;background:#ffffff">
              <h3 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.15;color:#111111">
                Fakturacni udaje
              </h3>
              ${buildHtmlLines(billingLines)}
            </div>
          </div>

          <div style="border-radius:24px;padding:22px;background:#111111;color:#f5ede1">
            <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#d7c29f;margin-bottom:10px">
              Rekapitulace
            </div>
            <div style="display:grid;gap:8px;font-size:15px;line-height:1.7">
              <div><strong>E-mail:</strong> ${escapeHtml(sanitizeText(order.customerEmail) || '-')}</div>
              <div><strong>Telefon:</strong> ${escapeHtml(sanitizeText(order.customerPhone) || '-')}</div>
              <div><strong>Mezisoucet:</strong> ${escapeHtml(formatMoney(order.subtotal, currency))}</div>
              <div><strong>Doprava:</strong> ${escapeHtml(formatMoney(order.shippingTotal, currency))}</div>
              <div><strong>Celkem:</strong> ${escapeHtml(formatMoney(order.total, currency))}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

export const sendOrderStatusEmailToCustomer = async (
  order: OrderStatusEmailDoc,
  status: OrderCustomerEmailStatus,
) => {
  const config = getMailConfig()
  if (!config) {
    throw new Error('SMTP is not configured for customer emails.')
  }

  const recipient = sanitizeText(order.customerEmail)
  if (!recipient) {
    throw new Error('Order is missing customer email.')
  }

  const transport = getTransporter(config)
  const copy = getStatusCopy(status, order)

  await transport.sendMail({
    from: config.from,
    to: recipient,
    subject: copy.subject,
    text: buildTextBody(order, status),
    html: buildHtmlBody(order, status),
  })
}

export const sendOrderConfirmedEmailToCustomer = (order: OrderStatusEmailDoc) =>
  sendOrderStatusEmailToCustomer(order, 'confirmed')

export const sendOrderCanceledEmailToCustomer = (order: OrderStatusEmailDoc) =>
  sendOrderStatusEmailToCustomer(order, 'canceled')
