import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Payload } from 'payload'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import sharp from 'sharp'

const PAGE_WIDTH = 842
const PAGE_HEIGHT = 595
const PAGE_MARGIN = 42
const TABLE_HEADER_HEIGHT = 34
const MIN_TABLE_ROW_HEIGHT = 28
const BODY_FONT_SIZE = 10
const SMALL_FONT_SIZE = 9
const TABLE_FONT_SIZE = 9
const TITLE_FONT_SIZE = 30
const VAT_RATE = 0.21

const TABLE_COLUMNS = [
  { key: 'index', label: '#', width: 28, align: 'center' as const },
  { key: 'name', label: 'Jméno', width: 220, align: 'left' as const },
  { key: 'quantity', label: 'Množství', width: 60, align: 'right' as const },
  { key: 'unit', label: 'Jednotka', width: 70, align: 'left' as const },
  { key: 'netUnitPrice', label: 'Netto cena', width: 70, align: 'right' as const },
  { key: 'netLineTotal', label: 'Netto částka', width: 70, align: 'right' as const },
  { key: 'taxRateLabel', label: 'Daňová sazba', width: 70, align: 'right' as const },
  { key: 'taxAmount', label: 'Daňová částka', width: 80, align: 'right' as const },
  { key: 'grossLineTotal', label: 'Brutto částka', width: 90, align: 'right' as const },
] as const

const SELLER_BLOCK = {
  title: 'Prodávající:',
  lines: [
    'MAX & VLD s.r.o.',
    'Děčínská 552/1, Střížkov (Praha 8), 180 00 Praha',
    'VAT Number: IČO: 23254246 DIČ: CZ23254246',
  ],
}

type OrderPaymentProvider = 'stripe' | 'global-payments' | 'cash-on-delivery'
type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'canceled'

type PayloadOrderDoc = {
  id: number | string
  orderId?: string | null
  provider?: OrderPaymentProvider | null
  paymentStatus?: OrderPaymentStatus | null
  createdAt?: string | null
  updatedAt?: string | null
  customerEmail?: string | null
  customerFirstName?: string | null
  customerLastName?: string | null
  currency?: string | null
  total?: number | null
  shippingTotal?: number | null
  shippingAddress?: {
    country?: string | null
    address?: string | null
    city?: string | null
    zip?: string | null
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
  } | null
  items?:
    | Array<{
        name?: string | null
        quantity?: number | null
        unitPrice?: number | null
        lineTotal?: number | null
      }>
    | null
}

type InvoiceLine = {
  index: string
  name: string
  quantity: string
  unit: string
  netUnitPrice: string
  netLineTotal: string
  taxRateLabel: string
  taxAmount: string
  grossLineTotal: string
  grossAmountRaw: number
  netAmountRaw: number
  taxAmountRaw: number
  taxCategory: 'included' | 'zero'
}

type InvoiceDownloadResult = {
  contentType: string
  data: Uint8Array
  fileName: string
}

type LoadedInvoiceAssets = {
  logoPngBytes?: Uint8Array
  regularFontBytes?: Uint8Array
  templatePdfBytes?: Uint8Array
}

let loadedAssetsPromise: Promise<LoadedInvoiceAssets> | null = null

const sanitizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const toPositiveNumber = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: currency || 'CZK',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(roundMoney(value))

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat('cs-CZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)

const getSafeDate = (value: string | null | undefined, fallback: Date) => {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

const getDueDate = (saleDate: Date, isCashOnDelivery: boolean) => {
  if (!isCashOnDelivery) {
    return saleDate
  }

  const next = new Date(saleDate)
  next.setDate(next.getDate() + 8)
  return next
}

const getPaymentMethodLabel = (order: PayloadOrderDoc) => {
  if (order.shipping?.cashOnDelivery === true || order.provider === 'cash-on-delivery') {
    return 'Dobírka'
  }

  if (order.provider === 'stripe') {
    return 'Online kartou'
  }

  if (order.provider === 'global-payments') {
    return 'Platební kartou'
  }

  return 'Neuvedeno'
}

const calculateVatBreakdown = (grossAmount: number) => {
  const normalizedGross = roundMoney(grossAmount)
  const netAmount = roundMoney(normalizedGross / (1 + VAT_RATE))
  const taxAmount = roundMoney(normalizedGross - netAmount)

  return {
    grossAmount: normalizedGross,
    netAmount,
    taxAmount,
  }
}

const getInvoiceGrossAmount = (order: PayloadOrderDoc) => {
  const itemGross = (Array.isArray(order.items) ? order.items : []).reduce((sum, item) => {
    const quantity = Math.max(1, Math.floor(toPositiveNumber(item?.quantity) || 1))
    const unitPrice = roundMoney(toPositiveNumber(item?.unitPrice))
    const lineTotal = roundMoney(toPositiveNumber(item?.lineTotal) || unitPrice * quantity)
    return sum + lineTotal
  }, 0)

  const shippingGross = roundMoney(toPositiveNumber(order.shipping?.price) || toPositiveNumber(order.shippingTotal))
  return roundMoney(toPositiveNumber(order.total) || itemGross + shippingGross)
}

const resolveBuyerLines = (order: PayloadOrderDoc) => {
  const billing = order.billing ?? {}
  const shippingAddress = order.shippingAddress ?? {}
  const useBillingAddress =
    billing.sameAsShipping === false ||
    Boolean(
      sanitizeString(billing.address) ||
        sanitizeString(billing.city) ||
        sanitizeString(billing.zip) ||
        sanitizeString(billing.country),
    )

  const firstName = sanitizeString(billing.firstName) || sanitizeString(order.customerFirstName)
  const lastName = sanitizeString(billing.lastName) || sanitizeString(order.customerLastName)
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

  const companyName = sanitizeString(billing.companyName)
  const companyLine = [sanitizeString(billing.companyId) ? `IČO: ${sanitizeString(billing.companyId)}` : '', sanitizeString(billing.vatId) ? `DIČ: ${sanitizeString(billing.vatId)}` : '']
    .filter(Boolean)
    .join(' ')

  const address = useBillingAddress
    ? {
        address: sanitizeString(billing.address),
        city: sanitizeString(billing.city),
        zip: sanitizeString(billing.zip),
        country: sanitizeString(billing.country),
      }
    : {
        address: sanitizeString(shippingAddress.address),
        city: sanitizeString(shippingAddress.city),
        zip: sanitizeString(shippingAddress.zip),
        country: sanitizeString(shippingAddress.country),
      }

  const cityLine = [address.zip, address.city].filter(Boolean).join(' ').trim()
  const lines = [
    companyName || fullName || sanitizeString(order.customerEmail) || 'Zákazník',
    companyName && fullName ? fullName : '',
    companyLine,
    address.address,
    cityLine,
    address.country || 'Česká republika',
  ].filter(Boolean)

  return {
    title: 'Kupující:',
    lines,
  }
}

const buildInvoiceLines = (order: PayloadOrderDoc, currency: string) => {
  const lines: InvoiceLine[] = []
  const items = Array.isArray(order.items) ? order.items : []

  items.forEach((item, index) => {
    const quantity = Math.max(1, Math.floor(toPositiveNumber(item?.quantity) || 1))
    const grossUnitPrice = roundMoney(toPositiveNumber(item?.unitPrice))
    const grossLineTotal = roundMoney(toPositiveNumber(item?.lineTotal) || grossUnitPrice * quantity)
    const resolvedGrossUnitPrice = grossUnitPrice > 0 ? grossUnitPrice : roundMoney(grossLineTotal / quantity)
    const tax = calculateVatBreakdown(grossLineTotal)

    lines.push({
      index: String(index + 1),
      name: sanitizeString(item?.name) || 'Položka',
      quantity: String(quantity),
      unit: 'položka',
      netUnitPrice: formatMoney(roundMoney(resolvedGrossUnitPrice / (1 + VAT_RATE)), currency),
      netLineTotal: formatMoney(tax.netAmount, currency),
      taxRateLabel: 'Včetně DPH',
      taxAmount: formatMoney(tax.taxAmount, currency),
      grossLineTotal: formatMoney(grossLineTotal, currency),
      grossAmountRaw: grossLineTotal,
      netAmountRaw: tax.netAmount,
      taxAmountRaw: tax.taxAmount,
      taxCategory: 'included',
    })
  })

  const shippingLabel = sanitizeString(order.shipping?.label)
  const shippingGross = roundMoney(toPositiveNumber(order.shipping?.price) || toPositiveNumber(order.shippingTotal))

  if (shippingLabel || shippingGross > 0) {
    const tax = calculateVatBreakdown(shippingGross)

    lines.push({
      index: String(lines.length + 1),
      name: shippingLabel || 'Doprava',
      quantity: '1',
      unit: 'položka',
      netUnitPrice: formatMoney(tax.netAmount, currency),
      netLineTotal: formatMoney(tax.netAmount, currency),
      taxRateLabel: shippingGross > 0 ? 'Včetně DPH' : '0%',
      taxAmount: formatMoney(shippingGross > 0 ? tax.taxAmount : 0, currency),
      grossLineTotal: formatMoney(shippingGross, currency),
      grossAmountRaw: shippingGross,
      netAmountRaw: shippingGross > 0 ? tax.netAmount : 0,
      taxAmountRaw: shippingGross > 0 ? tax.taxAmount : 0,
      taxCategory: shippingGross > 0 ? 'included' : 'zero',
    })
  }

  return lines
}

const getRowTextValue = (row: InvoiceLine, key: (typeof TABLE_COLUMNS)[number]['key']) => row[key]

const wrapLineByWidth = (font: PDFFont, text: string, size: number, maxWidth: number) => {
  const source = text.replace(/\r/g, '').trim()

  if (!source) {
    return ['']
  }

  const splitLongWord = (word: string) => {
    const pieces: string[] = []
    let current = ''

    for (const char of word) {
      const next = current + char

      if (font.widthOfTextAtSize(next, size) <= maxWidth || current.length === 0) {
        current = next
        continue
      }

      pieces.push(current)
      current = char
    }

    if (current) {
      pieces.push(current)
    }

    return pieces
  }

  const paragraphs = source.split('\n')
  const lines: string[] = []

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean)

    if (words.length === 0) {
      lines.push('')
      continue
    }

    let current = ''

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word

      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
        continue
      }

      if (current) {
        lines.push(current)
        current = ''
      }

      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word
        continue
      }

      const splitWord = splitLongWord(word)
      const lastPiece = splitWord.pop()
      lines.push(...splitWord)
      current = lastPiece || ''
    }

    if (current) {
      lines.push(current)
    }
  }

  return lines.length > 0 ? lines : ['']
}

const drawStrongText = ({
  page,
  font,
  text,
  x,
  y,
  size,
  color = rgb(0, 0, 0),
}: {
  color?: ReturnType<typeof rgb>
  font: PDFFont
  page: PDFPage
  size: number
  text: string
  x: number
  y: number
}) => {
  page.drawText(text, { x, y, size, font, color })
  page.drawText(text, { x: x + 0.35, y, size, font, color })
}

const drawAlignedText = ({
  align = 'left',
  color = rgb(0, 0, 0),
  font,
  page,
  size,
  text,
  width,
  x,
  y,
}: {
  align?: 'center' | 'left' | 'right'
  color?: ReturnType<typeof rgb>
  font: PDFFont
  page: PDFPage
  size: number
  text: string
  width: number
  x: number
  y: number
}) => {
  const textWidth = font.widthOfTextAtSize(text, size)

  if (align === 'right') {
    page.drawText(text, {
      x: x + width - textWidth,
      y,
      size,
      font,
      color,
    })
    return
  }

  if (align === 'center') {
    page.drawText(text, {
      x: x + (width - textWidth) / 2,
      y,
      size,
      font,
      color,
    })
    return
  }

  page.drawText(text, { x, y, size, font, color })
}

const drawWrappedText = ({
  align = 'left',
  color = rgb(0, 0, 0),
  font,
  lineHeight,
  maxWidth,
  page,
  size,
  text,
  x,
  y,
}: {
  align?: 'center' | 'left' | 'right'
  color?: ReturnType<typeof rgb>
  font: PDFFont
  lineHeight: number
  maxWidth: number
  page: PDFPage
  size: number
  text: string
  x: number
  y: number
}) => {
  const lines = wrapLineByWidth(font, text, size, maxWidth)

  lines.forEach((line, index) => {
    drawAlignedText({
      align,
      color,
      font,
      page,
      size,
      text: line,
      width: maxWidth,
      x,
      y: y - index * lineHeight,
    })
  })

  return lines.length
}

const getRowHeight = (font: PDFFont, row: InvoiceLine) => {
  const lineCounts = TABLE_COLUMNS.map((column) =>
    wrapLineByWidth(font, getRowTextValue(row, column.key), TABLE_FONT_SIZE, column.width - 10).length,
  )
  const contentHeight = Math.max(...lineCounts, 1) * 12 + 12
  return Math.max(MIN_TABLE_ROW_HEIGHT, contentHeight)
}

const drawPartyBlock = ({
  font,
  page,
  title,
  lines,
  x,
  y,
}: {
  font: PDFFont
  lines: string[]
  page: PDFPage
  title: string
  x: number
  y: number
}) => {
  drawStrongText({
    page,
    font,
    text: title,
    x,
    y,
    size: 13,
  })

  let currentY = y - 22

  lines.forEach((line) => {
    const count = drawWrappedText({
      page,
      font,
      text: line,
      x,
      y: currentY,
      size: BODY_FONT_SIZE,
      maxWidth: 260,
      lineHeight: 13,
    })

    currentY -= Math.max(13, count * 13)
  })
}

const drawTableHeader = (page: PDFPage, font: PDFFont, topY: number) => {
  let cursorX = PAGE_MARGIN

  TABLE_COLUMNS.forEach((column) => {
    page.drawRectangle({
      x: cursorX,
      y: topY - TABLE_HEADER_HEIGHT,
      width: column.width,
      height: TABLE_HEADER_HEIGHT,
      borderColor: rgb(0.15, 0.15, 0.15),
      borderWidth: 1,
      color: rgb(0.95, 0.95, 0.95),
    })

    drawWrappedText({
      align: column.align === 'center' ? 'center' : 'left',
      font,
      lineHeight: 10,
      maxWidth: column.width - 10,
      page,
      size: SMALL_FONT_SIZE,
      text: column.label,
      x: cursorX + 5,
      y: topY - 13,
    })

    cursorX += column.width
  })
}

const drawTableRow = (page: PDFPage, font: PDFFont, row: InvoiceLine, topY: number) => {
  const rowHeight = getRowHeight(font, row)
  let cursorX = PAGE_MARGIN

  TABLE_COLUMNS.forEach((column) => {
    page.drawRectangle({
      x: cursorX,
      y: topY - rowHeight,
      width: column.width,
      height: rowHeight,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 1,
    })

    drawWrappedText({
      align: column.align,
      font,
      lineHeight: 11,
      maxWidth: column.width - 10,
      page,
      size: TABLE_FONT_SIZE,
      text: getRowTextValue(row, column.key),
      x: cursorX + 5,
      y: topY - 16,
    })

    cursorX += column.width
  })

  return rowHeight
}

const drawSummaryBox = ({
  font,
  currency,
  grossAmount,
  netAmount,
  page,
  taxAmount,
  topY,
}: {
  currency: string
  font: PDFFont
  grossAmount: number
  netAmount: number
  page: PDFPage
  taxAmount: number
  topY: number
}) => {
  const boxWidth = 290
  const boxX = PAGE_WIDTH - PAGE_MARGIN - boxWidth
  const labelX = boxX - 74
  const rowHeight = 26
  const colWidth = 96.66

  drawStrongText({
    page,
    font,
    text: 'CELKEM',
    x: labelX,
    y: topY - 18,
    size: BODY_FONT_SIZE,
  })

  ;['Netto', 'DPH', 'Brutto'].forEach((header, index) => {
    const x = boxX + index * colWidth

    page.drawRectangle({
      x,
      y: topY - rowHeight,
      width: colWidth,
      height: rowHeight,
      borderColor: rgb(0.15, 0.15, 0.15),
      borderWidth: 1,
      color: rgb(0.95, 0.95, 0.95),
    })

    drawAlignedText({
      align: 'center',
      font,
      page,
      size: SMALL_FONT_SIZE,
      text: header,
      width: colWidth,
      x,
      y: topY - 16,
    })
  })

  const values = [formatMoney(netAmount, currency), formatMoney(taxAmount, currency), formatMoney(grossAmount, currency)]

  values.forEach((value, index) => {
    const x = boxX + index * colWidth

    page.drawRectangle({
      x,
      y: topY - rowHeight * 2,
      width: colWidth,
      height: rowHeight,
      borderColor: rgb(0.15, 0.15, 0.15),
      borderWidth: 1,
    })

    drawAlignedText({
      align: 'right',
      font,
      page,
      size: BODY_FONT_SIZE,
      text: value,
      width: colWidth - 12,
      x: x + 6,
      y: topY - 42,
    })
  })

  return topY - rowHeight * 2
}

const drawFooterTotals = ({
  amountDue,
  currency,
  font,
  grossAmount,
  paidAmount,
  page,
}: {
  amountDue: number
  currency: string
  font: PDFFont
  grossAmount: number
  page: PDFPage
  paidAmount: number
}) => {
  const footerY = PAGE_MARGIN - 4

  drawStrongText({
    page,
    font,
    text: `Celkem: ${formatMoney(grossAmount, currency)}`,
    x: PAGE_MARGIN,
    y: footerY,
    size: BODY_FONT_SIZE + 1,
  })

  drawStrongText({
    page,
    font,
    text: `Zaplaceno: ${formatMoney(paidAmount, currency)}`,
    x: PAGE_WIDTH / 2 - 70,
    y: footerY,
    size: BODY_FONT_SIZE + 1,
  })

  const dueText = `K úhradě: ${formatMoney(amountDue, currency)}`
  const dueWidth = font.widthOfTextAtSize(dueText, BODY_FONT_SIZE + 1)

  drawStrongText({
    page,
    font,
    text: dueText,
    x: PAGE_WIDTH - PAGE_MARGIN - dueWidth,
    y: footerY,
    size: BODY_FONT_SIZE + 1,
  })
}

const addContinuationHeader = (page: PDFPage, font: PDFFont, orderId: string) => {
  const text = `Faktura ${orderId} - pokračování`
  drawStrongText({
    page,
    font,
    text,
    x: PAGE_MARGIN,
    y: PAGE_HEIGHT - PAGE_MARGIN + 4,
    size: 14,
  })
}

const getSafeFileName = (orderId: string) => {
  const sanitized = orderId.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '')
  return sanitized || 'order'
}

const dirname = path.dirname(fileURLToPath(import.meta.url))

const TEMPLATE_PAGE_WIDTH = 595.28
const TEMPLATE_PAGE_HEIGHT = 841.89
const TEMPLATE_HEADER_LINES = [
  { label: 'Datum prodeje:', labelX: 462.182, valueX: 520.886, y: 805.976 },
  { label: 'Datum vystavení:', labelX: 454.798, valueX: 520.886, y: 794.376 },
  { label: 'Datum splatnosti:', labelX: 454.454, valueX: 520.886, y: 782.776 },
  { label: 'Způsob platby:', labelX: 478.806, valueX: 535.206, y: 771.176 },
] as const
const TEMPLATE_BUYER_HEADING = { x: 297.64, y: 713.792 }
const TEMPLATE_BUYER_LINES_Y = [701.176, 689.576, 677.976, 666.376] as const
const TEMPLATE_TITLE_Y = 620.616
const TEMPLATE_TABLE_BORDERS_X = [28.346, 44.132, 206.409, 257.251, 301.251, 350.889, 403.501, 455.306, 509.185, 566.934]
const TEMPLATE_TABLE_HEADER_TOP_Y = 596.43
const TEMPLATE_TABLE_HEADER_HEIGHT = 31.6
const TEMPLATE_TABLE_ROW_HEIGHT = 28.2
const TEMPLATE_SUMMARY_BREAKDOWN_ROW_HEIGHT = 18.6
const TEMPLATE_TABLE_BODY_START_Y = TEMPLATE_TABLE_HEADER_TOP_Y - TEMPLATE_TABLE_HEADER_HEIGHT
const TEMPLATE_TABLE_TEXT = {
  indexX: 34.451,
  nameX: 49.132,
  quantityRightX: 251.251,
  unitX: 266.56,
  netPriceRightX: 350.889,
  netTotalRightX: 403.501,
  taxRateRightX: 455.306,
  taxAmountRightX: 509.185,
  grossRightX: 561.934,
}
const TEMPLATE_TOTAL_LABEL_X = 318.441
const TEMPLATE_FOOTER_Y = 417.376

const drawWhiteRect = (page: PDFPage, x: number, y: number, width: number, height: number) => {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: rgb(1, 1, 1),
  })
}

const drawMoneyRight = ({
  font,
  page,
  size,
  text,
  x,
  y,
}: {
  font: PDFFont
  page: PDFPage
  size: number
  text: string
  x: number
  y: number
}) => {
  page.drawText(text, {
    x: x - font.widthOfTextAtSize(text, size),
    y,
    size,
    font,
    color: rgb(0, 0, 0),
  })
}

const drawMoneyWithOptionalWrappedCurrency = ({
  font,
  page,
  size,
  text,
  x,
  y,
  wrapCurrencyThreshold,
}: {
  font: PDFFont
  page: PDFPage
  size: number
  text: string
  x: number
  y: number
  wrapCurrencyThreshold: number
}) => {
  const trimmed = text.trim()

  if (!trimmed.endsWith(' Kč')) {
    drawMoneyRight({ font, page, size, text: trimmed, x, y })
    return
  }

  const numberPart = trimmed.slice(0, -3)
  const fullWidth = font.widthOfTextAtSize(trimmed, size)

  if (fullWidth <= wrapCurrencyThreshold) {
    drawMoneyRight({ font, page, size, text: trimmed, x, y })
    return
  }

  drawMoneyRight({ font, page, size, text: numberPart, x, y })
  drawMoneyRight({ font, page, size, text: 'Kč', x, y: y - 9.6 })
}

const buildBuyerLinesForTemplate = (order: PayloadOrderDoc) => {
  const billing = order.billing ?? {}
  const shippingAddress = order.shippingAddress ?? {}
  const useBillingAddress =
    billing.sameAsShipping === false ||
    Boolean(
      sanitizeString(billing.address) ||
        sanitizeString(billing.city) ||
        sanitizeString(billing.zip) ||
        sanitizeString(billing.country),
    )

  const firstName = sanitizeString(billing.firstName) || sanitizeString(order.customerFirstName)
  const lastName = sanitizeString(billing.lastName) || sanitizeString(order.customerLastName)
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
  const address = useBillingAddress
    ? {
        address: sanitizeString(billing.address),
        city: sanitizeString(billing.city),
        zip: sanitizeString(billing.zip),
        country: sanitizeString(billing.country),
      }
    : {
        address: sanitizeString(shippingAddress.address),
        city: sanitizeString(shippingAddress.city),
        zip: sanitizeString(shippingAddress.zip),
        country: sanitizeString(shippingAddress.country),
      }

  return [
    sanitizeString(billing.companyName) || fullName || sanitizeString(order.customerEmail) || 'Zákazník',
    address.address,
    [address.zip, address.city].filter(Boolean).join(' ').trim(),
    address.country || 'Česká republika',
  ].filter(Boolean)
}

const getSummaryBreakdownRows = (invoiceLines: InvoiceLine[], currency: string) => {
  const totals = {
    included: { net: 0, tax: 0, gross: 0, taxLabel: 'Včetně DPH' },
    zero: { net: 0, tax: 0, gross: 0, taxLabel: '0%' },
  }

  for (const line of invoiceLines) {
    const bucket = line.taxCategory === 'zero' ? totals.zero : totals.included
    bucket.net += line.netAmountRaw
    bucket.tax += line.taxAmountRaw
    bucket.gross += line.grossAmountRaw
  }

  return [
    {
      prefix: 'Včetně',
      net: formatMoney(totals.included.net, currency),
      taxLabel: totals.included.taxLabel,
      tax: formatMoney(totals.included.tax, currency),
      gross: formatMoney(totals.included.gross, currency),
    },
    {
      prefix: 'Včetně',
      net: formatMoney(totals.zero.net, currency),
      taxLabel: totals.zero.taxLabel,
      tax: formatMoney(totals.zero.tax, currency),
      gross: formatMoney(totals.zero.gross, currency),
    },
  ]
}

const drawTemplateHeader = ({
  currency,
  dueDate,
  issuedAt,
  order,
  page,
  regularFont,
  saleDate,
}: {
  currency: string
  dueDate: Date
  issuedAt: Date
  order: PayloadOrderDoc
  page: PDFPage
  regularFont: PDFFont
  saleDate: Date
}) => {
  const values = [
    formatDate(saleDate),
    formatDate(issuedAt),
    formatDate(dueDate),
    getPaymentMethodLabel(order),
  ]

  drawWhiteRect(page, 445, 765, 125, 50)
  drawWhiteRect(page, 440, 764, 132, 46)

  TEMPLATE_HEADER_LINES.forEach((line, index) => {
    page.drawText(line.label, {
      x: line.labelX,
      y: line.y,
      size: 7.6,
      font: regularFont,
      color: rgb(0, 0, 0),
    })

    drawStrongText({
      page,
      font: regularFont,
      text: values[index] || '',
      x: line.valueX,
      y: line.y,
      size: 7.6,
    })
  })
}

const drawTemplateBuyer = ({
  buyerLines,
  page,
  regularFont,
}: {
  buyerLines: string[]
  page: PDFPage
  regularFont: PDFFont
}) => {
  drawWhiteRect(page, 292, 660, 150, 60)

  drawStrongText({
    page,
    font: regularFont,
    text: 'Kupující:',
    x: TEMPLATE_BUYER_HEADING.x,
    y: TEMPLATE_BUYER_HEADING.y,
    size: 12,
  })

  TEMPLATE_BUYER_LINES_Y.forEach((y, index) => {
    const text = buyerLines[index] || ''

    if (!text) {
      return
    }

    page.drawText(text, {
      x: TEMPLATE_BUYER_HEADING.x,
      y,
      size: 8,
      font: regularFont,
      color: rgb(0, 0, 0),
    })
  })
}

const drawTemplateTitle = ({
  orderId,
  page,
  regularFont,
}: {
  orderId: string
  page: PDFPage
  regularFont: PDFFont
}) => {
  const titleText = `Faktura${orderId}`
  drawWhiteRect(page, 205, 614, 180, 24)

  drawStrongText({
    page,
    font: regularFont,
    text: titleText,
    x: (TEMPLATE_PAGE_WIDTH - regularFont.widthOfTextAtSize(titleText, 18)) / 2,
    y: TEMPLATE_TITLE_Y,
    size: 18,
  })
}

const drawTemplateTable = ({
  currency,
  grossAmount,
  invoiceLines,
  netAmount,
  page,
  regularFont,
  taxAmount,
}: {
  currency: string
  grossAmount: number
  invoiceLines: InvoiceLine[]
  netAmount: number
  page: PDFPage
  regularFont: PDFFont
  taxAmount: number
}) => {
  const tableLeft = TEMPLATE_TABLE_BORDERS_X[0]
  const tableWidth = TEMPLATE_TABLE_BORDERS_X[TEMPLATE_TABLE_BORDERS_X.length - 1] - tableLeft
  const dynamicSectionHeight =
    TEMPLATE_TABLE_HEADER_HEIGHT +
    invoiceLines.length * TEMPLATE_TABLE_ROW_HEIGHT +
    TEMPLATE_TABLE_ROW_HEIGHT +
    2 * TEMPLATE_SUMMARY_BREAKDOWN_ROW_HEIGHT +
    36

  drawWhiteRect(
    page,
    tableLeft - 1,
    TEMPLATE_TABLE_BODY_START_Y - invoiceLines.length * TEMPLATE_TABLE_ROW_HEIGHT - 58,
    tableWidth + 2,
    dynamicSectionHeight,
  )

  page.drawRectangle({
    x: tableLeft,
    y: TEMPLATE_TABLE_BODY_START_Y,
    width: tableWidth,
    height: TEMPLATE_TABLE_HEADER_HEIGHT,
    borderColor: rgb(0.15, 0.15, 0.15),
    borderWidth: 1,
    color: rgb(0.95, 0.95, 0.95),
  })

  const headerLabels = [
    { text: '#', x: 33.346, y: 584.83, size: 9 },
    { text: 'Jméno', x: 49.132, y: 584.83, size: 9 },
    { text: 'Množství', x: 210.409, y: 584.83, size: 9 },
    { text: 'Jednotka', x: 260.251, y: 584.83, size: 9 },
    { text: 'Netto', x: 317.454, y: 584.83, size: 9 },
    { text: 'cena', x: 319.479, y: 574.03, size: 9 },
    { text: 'Netto', x: 368.91, y: 584.83, size: 9 },
    { text: 'částka', x: 366.795, y: 574.03, size: 9 },
    { text: 'Daňová', x: 416.776, y: 584.83, size: 9 },
    { text: 'sazba', x: 420.777, y: 574.03, size: 9 },
    { text: 'Daňová', x: 469.619, y: 584.83, size: 9 },
    { text: 'částka', x: 471.846, y: 574.03, size: 9 },
    { text: 'Brutto', x: 525.439, y: 584.83, size: 9 },
    { text: 'částka', x: 525.16, y: 574.03, size: 9 },
  ]

  headerLabels.forEach((label) => {
    drawStrongText({
      page,
      font: regularFont,
      text: label.text,
      x: label.x,
      y: label.y,
      size: label.size,
    })
  })

  for (let i = 1; i < TEMPLATE_TABLE_BORDERS_X.length - 1; i += 1) {
    page.drawLine({
      start: { x: TEMPLATE_TABLE_BORDERS_X[i], y: TEMPLATE_TABLE_BODY_START_Y },
      end: { x: TEMPLATE_TABLE_BORDERS_X[i], y: TEMPLATE_TABLE_BODY_START_Y + TEMPLATE_TABLE_HEADER_HEIGHT },
      thickness: 1,
      color: rgb(0.15, 0.15, 0.15),
    })
  }

  invoiceLines.forEach((line, index) => {
    const rowTop = TEMPLATE_TABLE_BODY_START_Y - index * TEMPLATE_TABLE_ROW_HEIGHT
    const rowBottom = rowTop - TEMPLATE_TABLE_ROW_HEIGHT

    page.drawRectangle({
      x: tableLeft,
      y: rowBottom,
      width: tableWidth,
      height: TEMPLATE_TABLE_ROW_HEIGHT,
      borderColor: rgb(0.15, 0.15, 0.15),
      borderWidth: 1,
    })

    for (let i = 1; i < TEMPLATE_TABLE_BORDERS_X.length - 1; i += 1) {
      page.drawLine({
        start: { x: TEMPLATE_TABLE_BORDERS_X[i], y: rowBottom },
        end: { x: TEMPLATE_TABLE_BORDERS_X[i], y: rowTop },
        thickness: 1,
        color: rgb(0.15, 0.15, 0.15),
      })
    }

    const nameLines = wrapLineByWidth(regularFont, line.name, 8, 145).slice(0, 2)
    const firstLineY = rowTop - 9.6

    page.drawText(line.index, {
      x: TEMPLATE_TABLE_TEXT.indexX,
      y: firstLineY,
      size: 8,
      font: regularFont,
      color: rgb(0, 0, 0),
    })

    nameLines.forEach((nameLine, lineIndex) => {
      page.drawText(nameLine, {
        x: TEMPLATE_TABLE_TEXT.nameX,
        y: firstLineY - lineIndex * 9.6,
        size: 8,
        font: regularFont,
        color: rgb(0, 0, 0),
      })
    })

    drawMoneyRight({
      font: regularFont,
      page,
      size: 8,
      text: line.quantity,
      x: TEMPLATE_TABLE_TEXT.quantityRightX,
      y: firstLineY,
    })

    page.drawText(line.unit, {
      x: TEMPLATE_TABLE_TEXT.unitX,
      y: firstLineY,
      size: 8,
      font: regularFont,
      color: rgb(0, 0, 0),
    })

    drawMoneyRight({
      font: regularFont,
      page,
      size: 8,
      text: line.netUnitPrice,
      x: TEMPLATE_TABLE_TEXT.netPriceRightX,
      y: firstLineY,
    })

    drawMoneyRight({
      font: regularFont,
      page,
      size: 8,
      text: line.netLineTotal,
      x: TEMPLATE_TABLE_TEXT.netTotalRightX,
      y: firstLineY,
    })

    drawMoneyRight({
      font: regularFont,
      page,
      size: 8,
      text: line.taxRateLabel,
      x: TEMPLATE_TABLE_TEXT.taxRateRightX,
      y: firstLineY,
    })

    drawMoneyRight({
      font: regularFont,
      page,
      size: 8,
      text: line.taxAmount,
      x: TEMPLATE_TABLE_TEXT.taxAmountRightX,
      y: firstLineY,
    })

    drawMoneyRight({
      font: regularFont,
      page,
      size: 8,
      text: line.grossLineTotal,
      x: TEMPLATE_TABLE_TEXT.grossRightX,
      y: firstLineY,
    })
  })

  const summaryTop = TEMPLATE_TABLE_BODY_START_Y - invoiceLines.length * TEMPLATE_TABLE_ROW_HEIGHT
  const summaryRightStart = TEMPLATE_TABLE_BORDERS_X[4]
  const summaryTopBottom = summaryTop - TEMPLATE_TABLE_ROW_HEIGHT

  page.drawRectangle({
    x: summaryRightStart,
    y: summaryTopBottom,
    width: TEMPLATE_TABLE_BORDERS_X[TEMPLATE_TABLE_BORDERS_X.length - 1] - summaryRightStart,
    height: TEMPLATE_TABLE_ROW_HEIGHT,
    borderColor: rgb(0.15, 0.15, 0.15),
    borderWidth: 1,
  })

  ;[5, 6, 7, 8].forEach((borderIndex) => {
    page.drawLine({
      start: { x: TEMPLATE_TABLE_BORDERS_X[borderIndex], y: summaryTopBottom },
      end: { x: TEMPLATE_TABLE_BORDERS_X[borderIndex], y: summaryTop },
      thickness: 1,
      color: rgb(0.15, 0.15, 0.15),
    })
  })

  drawStrongText({
    page,
    font: regularFont,
    text: 'CELKEM',
    x: TEMPLATE_TOTAL_LABEL_X,
    y: summaryTop - 9.4,
    size: 8,
  })

  drawMoneyWithOptionalWrappedCurrency({
    font: regularFont,
    page,
    size: 8,
    text: formatMoney(netAmount, currency),
    x: TEMPLATE_TABLE_TEXT.netTotalRightX,
    y: summaryTop - 9.4,
    wrapCurrencyThreshold: 34,
  })

  drawStrongText({
    page,
    font: regularFont,
    text: 'X',
    x: 449.754,
    y: summaryTop - 9.4,
    size: 8,
  })

  drawMoneyRight({
    font: regularFont,
    page,
    size: 8,
    text: formatMoney(taxAmount, currency),
    x: TEMPLATE_TABLE_TEXT.taxAmountRightX,
    y: summaryTop - 9.4,
  })

  drawMoneyWithOptionalWrappedCurrency({
    font: regularFont,
    page,
    size: 8,
    text: formatMoney(grossAmount, currency),
    x: TEMPLATE_TABLE_TEXT.grossRightX,
    y: summaryTop - 9.4,
    wrapCurrencyThreshold: 34,
  })

  const breakdownRows = getSummaryBreakdownRows(invoiceLines, currency)

  breakdownRows.forEach((row, index) => {
    const rowTop = summaryTopBottom - index * TEMPLATE_SUMMARY_BREAKDOWN_ROW_HEIGHT
    const rowBottom = rowTop - TEMPLATE_SUMMARY_BREAKDOWN_ROW_HEIGHT

    page.drawRectangle({
      x: TEMPLATE_TABLE_BORDERS_X[5],
      y: rowBottom,
      width: TEMPLATE_TABLE_BORDERS_X[TEMPLATE_TABLE_BORDERS_X.length - 1] - TEMPLATE_TABLE_BORDERS_X[5],
      height: TEMPLATE_SUMMARY_BREAKDOWN_ROW_HEIGHT,
      borderColor: rgb(0.15, 0.15, 0.15),
      borderWidth: 1,
    })

    ;[6, 7, 8].forEach((borderIndex) => {
      page.drawLine({
        start: { x: TEMPLATE_TABLE_BORDERS_X[borderIndex], y: rowBottom },
        end: { x: TEMPLATE_TABLE_BORDERS_X[borderIndex], y: rowTop },
        thickness: 1,
        color: rgb(0.15, 0.15, 0.15),
      })
    })

    page.drawText(row.prefix, {
      x: 325.761,
      y: rowTop - 9.8,
      size: 8,
      font: regularFont,
      color: rgb(0, 0, 0),
    })

    drawMoneyRight({
      font: regularFont,
      page,
      size: 8,
      text: row.net,
      x: TEMPLATE_TABLE_TEXT.netTotalRightX,
      y: rowTop - 10.3,
    })

    drawMoneyRight({
      font: regularFont,
      page,
      size: 8,
      text: row.taxLabel,
      x: TEMPLATE_TABLE_TEXT.taxRateRightX,
      y: rowTop - 10.3,
    })

    drawMoneyRight({
      font: regularFont,
      page,
      size: 8,
      text: row.tax,
      x: TEMPLATE_TABLE_TEXT.taxAmountRightX,
      y: rowTop - 10.3,
    })

    drawMoneyRight({
      font: regularFont,
      page,
      size: 8,
      text: row.gross,
      x: TEMPLATE_TABLE_TEXT.grossRightX,
      y: rowTop - 10.3,
    })
  })
}

const drawTemplateFooter = ({
  amountDue,
  currency,
  font,
  grossAmount,
  page,
  paidAmount,
}: {
  amountDue: number
  currency: string
  font: PDFFont
  grossAmount: number
  page: PDFPage
  paidAmount: number
}) => {
  drawWhiteRect(page, 24, 412, 545, 12)

  const footerGroups = [
    { label: 'Celkem:', labelX: 28.346, value: formatMoney(grossAmount, currency) },
    { label: 'Zaplaceno:', labelX: 261.394, value: formatMoney(paidAmount, currency) },
    { label: 'K úhradě:', labelX: 484.598, value: formatMoney(amountDue, currency) },
  ]

  footerGroups.forEach((group) => {
    page.drawText(group.label, {
      x: group.labelX,
      y: TEMPLATE_FOOTER_Y,
      size: 8,
      font,
      color: rgb(0, 0, 0),
    })

    const valueX = group.labelX + font.widthOfTextAtSize(group.label, 8) + 2.288
    drawStrongText({
      page,
      font,
      text: group.value,
      x: valueX,
      y: TEMPLATE_FOOTER_Y,
      size: 8,
    })
  })
}

const loadInvoiceAssets = async (): Promise<LoadedInvoiceAssets> => {
  if (!loadedAssetsPromise) {
    loadedAssetsPromise = (async () => {
      const logoPath = path.resolve(dirname, '..', '..', 'public', 'assets', 'invoice-logo.webp')
      const fontPath = path.resolve(dirname, '..', '..', 'public', 'assets', 'invoice-font.ttf')
      const templatePath = path.resolve(dirname, '..', '..', 'public', 'assets', 'invoice-template.pdf')

      const [logoExists, fontExists, templateExists] = await Promise.all([
        fs
          .access(logoPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(fontPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(templatePath)
          .then(() => true)
          .catch(() => false),
      ])

      const [logoPngBytes, regularFontBytes, templatePdfBytes] = await Promise.all([
        logoExists
          ? sharp(await fs.readFile(logoPath))
              .png()
              .toBuffer()
              .then((buffer) => new Uint8Array(buffer))
          : Promise.resolve(undefined),
        fontExists ? fs.readFile(fontPath).then((buffer) => new Uint8Array(buffer)) : Promise.resolve(undefined),
        templateExists
          ? fs.readFile(templatePath).then((buffer) => new Uint8Array(buffer))
          : Promise.resolve(undefined),
      ])

      return {
        logoPngBytes,
        regularFontBytes,
        templatePdfBytes,
      }
    })()
  }

  return loadedAssetsPromise
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

const buildOrderInvoicePdf = async (order: PayloadOrderDoc) => {
  const assets = await loadInvoiceAssets()
  const pdfDoc = assets.templatePdfBytes
    ? await PDFDocument.load(assets.templatePdfBytes)
    : await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const regularFont = assets.regularFontBytes
    ? await pdfDoc.embedFont(assets.regularFontBytes, { subset: true })
    : await pdfDoc.embedFont(StandardFonts.Helvetica)
  const page =
    pdfDoc.getPageCount() > 0 ? pdfDoc.getPage(0) : pdfDoc.addPage([TEMPLATE_PAGE_WIDTH, TEMPLATE_PAGE_HEIGHT])
  const currency = sanitizeString(order.currency) || 'CZK'
  const orderId = sanitizeString(order.orderId) || String(order.id)
  const issuedAt = new Date()
  const saleDate = getSafeDate(order.createdAt, issuedAt)
  const paymentMethod = getPaymentMethodLabel(order)
  const dueDate = getDueDate(saleDate, paymentMethod === 'Dobírka')
  const buyerLines = buildBuyerLinesForTemplate(order)
  const invoiceLines = buildInvoiceLines(order, currency)
  const grossAmount = getInvoiceGrossAmount(order)
  const totals = calculateVatBreakdown(grossAmount)
  const paidAmount = order.paymentStatus === 'paid' ? grossAmount : 0
  const amountDue = roundMoney(Math.max(0, grossAmount - paidAmount))

  drawTemplateHeader({
    currency,
    dueDate,
    issuedAt,
    order,
    page,
    regularFont,
    saleDate,
  })
  drawTemplateBuyer({ buyerLines, page, regularFont })
  drawTemplateTitle({ orderId, page, regularFont })
  drawTemplateTable({
    currency,
    grossAmount: totals.grossAmount,
    invoiceLines,
    netAmount: totals.netAmount,
    page,
    regularFont,
    taxAmount: totals.taxAmount,
  })
  drawTemplateFooter({
    amountDue,
    currency,
    font: regularFont,
    grossAmount: totals.grossAmount,
    page,
    paidAmount,
  })

  return pdfDoc.save()
}

export const downloadOrderInvoice = async (
  payload: Payload,
  documentId: number | string,
): Promise<InvoiceDownloadResult | null> => {
  const order = await findOrderByDocumentId(payload, documentId)

  if (!order) {
    return null
  }

  const orderId = sanitizeString(order.orderId) || String(order.id)
  const safeOrderId = getSafeFileName(orderId)
  const data = await buildOrderInvoicePdf(order)

  return {
    contentType: 'application/pdf',
    data,
    fileName: `${safeOrderId}-faktura.pdf`,
  }
}
