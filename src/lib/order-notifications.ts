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
    return 'Dobírka'
  }

  if (provider === 'global-payments') {
    return 'Global Payments'
  }

  if (provider === 'stripe') {
    return 'Stripe'
  }

  return sanitizeText(provider) || 'Neznámý způsob'
}

const getStatusLabel = (status: unknown) => {
  if (status === 'paid') {
    return 'Zaplaceno'
  }

  if (status === 'failed') {
    return 'Platba selhala'
  }

  if (status === 'canceled') {
    return 'Zrušeno'
  }

  return 'Čeká na potvrzení'
}

const buildCustomerName = (order: OrderNotificationDoc) =>
  [sanitizeText(order.customerFirstName), sanitizeText(order.customerLastName)].filter(Boolean).join(' ') || 'Zákazník'

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
  return [mainLine, notes ? `Poznámka: ${notes}` : ''].filter(Boolean)
}

const buildBillingLines = (order: OrderNotificationDoc) => {
  if (order.billing?.sameAsShipping) {
    return ['Stejná jako doručovací adresa']
  }

  const companyBits = [
    sanitizeText(order.billing?.companyName),
    sanitizeText(order.billing?.companyId) ? `IČ ${sanitizeText(order.billing?.companyId)}` : '',
    sanitizeText(order.billing?.vatId) ? `DIČ ${sanitizeText(order.billing?.vatId)}` : '',
  ].filter(Boolean)

  const person = [sanitizeText(order.billing?.firstName), sanitizeText(order.billing?.lastName)].filter(Boolean).join(' ')
  const cityLine = [sanitizeText(order.billing?.zip), sanitizeText(order.billing?.city)].filter(Boolean).join(' ').trim()
  const addressLine = [sanitizeText(order.billing?.address), cityLine, sanitizeText(order.billing?.country)]
    .filter(Boolean)
    .join(', ')
    .trim()

  return [person, companyBits.join(' | '), addressLine].filter(Boolean)
}

const buildShippingSummary = (order: OrderNotificationDoc) => {
  const shippingBits = [
    sanitizeText(order.shipping?.label),
    order.shipping?.cashOnDelivery ? 'na dobírku' : '',
    sanitizeText(order.shipping?.pickupPointName) ? `výdejní místo: ${sanitizeText(order.shipping?.pickupPointName)}` : '',
  ].filter(Boolean)

  if (sanitizeText(order.shipping?.pickupPointAddress)) {
    shippingBits.push(sanitizeText(order.shipping?.pickupPointAddress))
  }

  return shippingBits
}

const buildItemsText = (order: OrderNotificationDoc, currency: string) => {
  const items = Array.isArray(order.items) ? order.items : []
  if (items.length === 0) {
    return 'Bez položek'
  }

  return items
    .map((item) => {
      const quantity = Math.max(1, Math.floor(toPositiveNumber(item.quantity) || 1))
      const variant = sanitizeText(item.variant)
      const sku = sanitizeText(item.sku)
      const lineTotal = toPositiveNumber(item.lineTotal)
      const extras = [variant, sku ? `SKU ${sku}` : ''].filter(Boolean).join(' | ')

      return `- ${sanitizeText(item.name) || 'Produkt'} x${quantity}${extras ? ` (${extras})` : ''}: ${formatMoney(lineTotal, currency)}`
    })
    .join('\n')
}

const buildItemsHtml = (order: OrderNotificationDoc, currency: string) => {
  const items = Array.isArray(order.items) ? order.items : []
  if (items.length === 0) {
    return `
      <tr>
        <td style="padding:0;font-size:15px;line-height:1.7;color:#6b6258">Bez položek</td>
      </tr>
    `
  }

  return items
    .map((item, index) => {
      const quantity = Math.max(1, Math.floor(toPositiveNumber(item.quantity) || 1))
      const variant = sanitizeText(item.variant)
      const sku = sanitizeText(item.sku)
      const lineTotal = toPositiveNumber(item.lineTotal)
      const extras = [variant, sku ? `SKU ${sku}` : ''].filter(Boolean).join(' | ')

      return `
        <tr>
          <td style="padding:${index === items.length - 1 ? '0' : '0 0 14px'};border-bottom:${index === items.length - 1 ? '0' : '1px solid #efe6da'}">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
              <tr>
                <td class="item-info-cell" style="padding:0 14px 0 0;vertical-align:top;font-size:15px;line-height:1.6;color:#2f2a24">
                  <div style="font-weight:700;color:#111111">${escapeHtml(sanitizeText(item.name) || 'Produkt')}</div>
                  <div style="margin-top:6px;font-size:13px;color:#6b6258">Množství: ${quantity}</div>
                  ${extras ? `<div style="margin-top:4px;font-size:13px;color:#6b6258">${escapeHtml(extras)}</div>` : ''}
                </td>
                <td class="item-price-cell" align="right" valign="top" style="white-space:nowrap;font-size:15px;line-height:1.6;font-weight:700;color:#111111">
                  ${escapeHtml(formatMoney(lineTotal, currency))}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
    })
    .join('')
}

const buildEmailStyles = () => `
  <style>
    @media only screen and (max-width: 620px) {
      .email-shell {
        padding: 16px 10px !important;
      }

      .email-card {
        border-radius: 20px !important;
      }

      .hero-section,
      .email-section {
        padding: 24px 20px !important;
      }

      .hero-title {
        font-size: 28px !important;
        line-height: 1.15 !important;
      }

      .summary-cell,
      .detail-cell,
      .item-info-cell,
      .item-price-cell {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      .summary-cell {
        padding-right: 0 !important;
        padding-bottom: 12px !important;
      }

      .detail-cell {
        padding-right: 0 !important;
        padding-bottom: 16px !important;
      }

      .item-info-cell {
        padding-right: 0 !important;
        padding-bottom: 8px !important;
      }

      .item-price-cell {
        text-align: left !important;
        padding-top: 0 !important;
      }
    }
  </style>
`

const buildSubject = (order: OrderNotificationDoc, reason: OrderNotificationReason) => {
  const orderId = sanitizeText(order.orderId) || 'bez-čísla'

  if (reason === 'paid') {
    return `Lumera: platba přijata ${orderId}`
  }

  return `Lumera: nová objednávka na dobírku ${orderId}`
}

const buildTextBody = (order: OrderNotificationDoc, reason: OrderNotificationReason) => {
  const currency = sanitizeText(order.currency) || 'CZK'
  const customerName = buildCustomerName(order)
  const shippingAddress = buildAddressLines(order.shippingAddress).join('\n')
  const billingAddress = buildBillingLines(order).join('\n')
  const shippingSummary = buildShippingSummary(order).join('\n')

  return [
    reason === 'paid'
      ? 'Byla přijata úspěšná platba za objednávku.'
      : 'Byla vytvořena objednávka na dobírku.',
    '',
    `Objednávka: ${sanitizeText(order.orderId) || '-'}`,
    `Poskytovatel: ${getProviderLabel(order.provider)}`,
    `Stav platby: ${getStatusLabel(order.paymentStatus)}`,
    `Zákazník: ${customerName}`,
    `E-mail: ${sanitizeText(order.customerEmail) || '-'}`,
    `Telefon: ${sanitizeText(order.customerPhone) || '-'}`,
    '',
    `Mezisoučet: ${formatMoney(order.subtotal, currency)}`,
    `Doprava: ${formatMoney(order.shippingTotal, currency)}`,
    `Celkem: ${formatMoney(order.total, currency)}`,
    '',
    'Doprava:',
    shippingSummary || '-',
    '',
    'Doručovací adresa:',
    shippingAddress || '-',
    '',
    'Fakturační údaje:',
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
  const headerTitle = reason === 'paid' ? 'Platba přijata' : 'Objednávka na dobírku'
  const headerCopy =
    reason === 'paid' ? 'Byla přijata úspěšná platba za objednávku.' : 'Byla vytvořena objednávka na dobírku.'

  const renderLines = (lines: string[]) =>
    lines.length
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          ${lines
            .map(
              (line, index) => `
                <tr>
                  <td style="padding:${index === lines.length - 1 ? '0' : '0 0 8px'};font-size:14px;line-height:1.7;color:#3f372f">
                    ${escapeHtml(line)}
                  </td>
                </tr>
              `,
            )
            .join('')}
        </table>
      `
      : '<div style="font-size:14px;line-height:1.7;color:#6b6258">-</div>'

  const buildSummaryCard = (label: string, value: string) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border:1px solid #ede5da;border-radius:18px;background:#fffdf9">
      <tr>
        <td style="padding:14px 16px">
          <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a7a68;margin-bottom:6px">${escapeHtml(label)}</div>
          <div style="font-size:18px;line-height:1.3;font-weight:700;color:#111111">${escapeHtml(value)}</div>
        </td>
      </tr>
    </table>
  `

  const buildSectionCard = (title: string, body: string) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border:1px solid #ede5da;border-radius:24px;background:#ffffff">
      <tr>
        <td style="padding:22px">
          <h3 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.15;color:#111111">
            ${escapeHtml(title)}
          </h3>
          ${body}
        </td>
      </tr>
    </table>
  `

  return `
    <!doctype html>
    <html lang="cs">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${buildEmailStyles()}
      </head>
      <body style="margin:0;padding:0;background:#f4ede3;font-family:Arial,sans-serif;color:#111111">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#f4ede3">
          <tr>
            <td class="email-shell" align="center" style="padding:32px 12px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-card" style="width:100%;max-width:680px;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 18px 60px rgba(17,17,17,0.08)">
                <tr>
                  <td class="hero-section" style="padding:30px 32px;background:#111111;color:#f5ede1">
                    <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#d7c29f;margin-bottom:12px">Lumera Admin</div>
                    <h2 class="hero-title" style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.08;color:#ffffff">
                      ${escapeHtml(headerTitle)}
                    </h2>
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#f1e7d9">
                      ${escapeHtml(headerCopy)}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="email-section" style="padding:28px 32px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px">
                      <tr>
                        <td class="summary-cell" width="33.333%" style="padding:0 8px 12px 0;vertical-align:top">
                          ${buildSummaryCard('Objednavka', sanitizeText(order.orderId) || '-')}
                        </td>
                        <td class="summary-cell" width="33.333%" style="padding:0 8px 12px;vertical-align:top">
                          ${buildSummaryCard('Platba', getStatusLabel(order.paymentStatus))}
                        </td>
                        <td class="summary-cell" width="33.333%" style="padding:0 0 12px 8px;vertical-align:top">
                          ${buildSummaryCard('Celkem', formatMoney(order.total, currency))}
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border:1px solid #ede5da;border-radius:24px;background:#fffdf9;margin:0 0 20px">
                      <tr>
                        <td style="padding:22px">
                          <h3 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.15;color:#111111">
                            Zákazník
                          </h3>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:15px;line-height:1.7;color:#2f2a24">
                            <tr>
                              <td style="padding:0 0 8px"><strong>Jméno:</strong> ${escapeHtml(customerName)}</td>
                            </tr>
                            <tr>
                              <td style="padding:0 0 8px"><strong>E-mail:</strong> ${escapeHtml(sanitizeText(order.customerEmail) || '-')}</td>
                            </tr>
                            <tr>
                              <td style="padding:0 0 8px"><strong>Telefon:</strong> ${escapeHtml(sanitizeText(order.customerPhone) || '-')}</td>
                            </tr>
                            <tr>
                              <td style="padding:0 0 8px"><strong>Poskytovatel:</strong> ${escapeHtml(getProviderLabel(order.provider))}</td>
                            </tr>
                            <tr>
                              <td style="padding:0"><strong>Mezisoučet / Doprava:</strong> ${escapeHtml(formatMoney(order.subtotal, currency))} / ${escapeHtml(formatMoney(order.shippingTotal, currency))}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
                      <tr>
                        <td class="detail-cell" width="50%" style="padding:0 8px 0 0;vertical-align:top">
                          ${buildSectionCard('Doprava', renderLines(shippingSummary))}
                        </td>
                        <td class="detail-cell" width="50%" style="padding:0 0 0 8px;vertical-align:top">
                          ${buildSectionCard('Doručovací adresa', renderLines(shippingAddress))}
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px">
                      <tr>
                        <td style="vertical-align:top">
                          ${buildSectionCard('Fakturační údaje', renderLines(billingAddress))}
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;border:1px solid #ede5da;border-radius:24px;background:#fffdf9">
                      <tr>
                        <td style="padding:24px">
                          <h3 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.15;color:#111111">
                            Polozky
                          </h3>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
                            ${buildItemsHtml(order, currency)}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
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
