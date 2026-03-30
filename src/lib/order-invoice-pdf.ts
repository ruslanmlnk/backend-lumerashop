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
}

type InvoiceDownloadResult = {
  contentType: string
  data: Uint8Array
  fileName: string
}

type LoadedInvoiceAssets = {
  logoPngBytes?: Uint8Array
  regularFontBytes?: Uint8Array
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
      taxRateLabel: '21 %',
      taxAmount: formatMoney(tax.taxAmount, currency),
      grossLineTotal: formatMoney(grossLineTotal, currency),
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
      taxRateLabel: shippingGross > 0 ? '21 %' : '0 %',
      taxAmount: formatMoney(shippingGross > 0 ? tax.taxAmount : 0, currency),
      grossLineTotal: formatMoney(shippingGross, currency),
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

const loadInvoiceAssets = async (): Promise<LoadedInvoiceAssets> => {
  if (!loadedAssetsPromise) {
    loadedAssetsPromise = (async () => {
      const logoPath = path.resolve(dirname, '..', '..', 'public', 'assets', 'invoice-logo.webp')
      const fontPath = path.resolve(dirname, '..', '..', 'public', 'assets', 'invoice-font.ttf')

      const [logoExists, fontExists] = await Promise.all([
        fs
          .access(logoPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(fontPath)
          .then(() => true)
          .catch(() => false),
      ])

      const [logoPngBytes, regularFontBytes] = await Promise.all([
        logoExists
          ? sharp(await fs.readFile(logoPath))
              .png()
              .toBuffer()
              .then((buffer) => new Uint8Array(buffer))
          : Promise.resolve(undefined),
        fontExists ? fs.readFile(fontPath).then((buffer) => new Uint8Array(buffer)) : Promise.resolve(undefined),
      ])

      return {
        logoPngBytes,
        regularFontBytes,
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
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const assets = await loadInvoiceAssets()
  const regularFont = assets.regularFontBytes
    ? await pdfDoc.embedFont(assets.regularFontBytes, { subset: true })
    : await pdfDoc.embedFont(StandardFonts.Helvetica)
  const logoImage = assets.logoPngBytes ? await pdfDoc.embedPng(assets.logoPngBytes) : null

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const currency = sanitizeString(order.currency) || 'CZK'
  const orderId = sanitizeString(order.orderId) || String(order.id)
  const issuedAt = new Date()
  const saleDate = getSafeDate(order.createdAt, issuedAt)
  const paymentMethod = getPaymentMethodLabel(order)
  const dueDate = getDueDate(saleDate, paymentMethod === 'Dobírka')
  const buyer = resolveBuyerLines(order)
  const invoiceLines = buildInvoiceLines(order, currency)
  const grossAmount = getInvoiceGrossAmount(order)
  const totals = calculateVatBreakdown(grossAmount)
  const paidAmount = order.paymentStatus === 'paid' ? grossAmount : 0
  const amountDue = roundMoney(Math.max(0, grossAmount - paidAmount))

  if (logoImage) {
    const dimensions = logoImage.scaleToFit(155, 74)

    page.drawImage(logoImage, {
      x: PAGE_MARGIN,
      y: PAGE_HEIGHT - PAGE_MARGIN - dimensions.height + 6,
      width: dimensions.width,
      height: dimensions.height,
    })
  }

  const headerLines = [
    `Datum prodeje: ${formatDate(saleDate)}`,
    `Datum vystavení: ${formatDate(issuedAt)}`,
    `Datum splatnosti: ${formatDate(dueDate)}`,
    `Způsob platby: ${paymentMethod}`,
  ]

  headerLines.forEach((line, index) => {
    const textWidth = regularFont.widthOfTextAtSize(line, BODY_FONT_SIZE + 1)
    drawStrongText({
      page,
      font: regularFont,
      text: line,
      x: PAGE_WIDTH - PAGE_MARGIN - textWidth,
      y: PAGE_HEIGHT - PAGE_MARGIN - index * 17,
      size: BODY_FONT_SIZE + 1,
    })
  })

  drawPartyBlock({
    page,
    font: regularFont,
    title: SELLER_BLOCK.title,
    lines: SELLER_BLOCK.lines,
    x: PAGE_MARGIN,
    y: PAGE_HEIGHT - 170,
  })

  drawPartyBlock({
    page,
    font: regularFont,
    title: buyer.title,
    lines: buyer.lines,
    x: PAGE_WIDTH / 2 + 10,
    y: PAGE_HEIGHT - 170,
  })

  const titleText = `Faktura ${orderId}`
  const titleWidth = regularFont.widthOfTextAtSize(titleText, TITLE_FONT_SIZE)
  drawStrongText({
    page,
    font: regularFont,
    text: titleText,
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: PAGE_HEIGHT - 268,
    size: TITLE_FONT_SIZE,
  })

  let currentPage = page
  let currentTableTopY = PAGE_HEIGHT - 305

  drawTableHeader(currentPage, regularFont, currentTableTopY)
  currentTableTopY -= TABLE_HEADER_HEIGHT

  for (const row of invoiceLines) {
    const rowHeight = getRowHeight(regularFont, row)

    if (currentTableTopY - rowHeight < 120) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      addContinuationHeader(currentPage, regularFont, orderId)
      currentTableTopY = PAGE_HEIGHT - 82
      drawTableHeader(currentPage, regularFont, currentTableTopY)
      currentTableTopY -= TABLE_HEADER_HEIGHT
    }

    const renderedRowHeight = drawTableRow(currentPage, regularFont, row, currentTableTopY)
    currentTableTopY -= renderedRowHeight
  }

  if (currentTableTopY < 140) {
    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    addContinuationHeader(currentPage, regularFont, orderId)
    currentTableTopY = PAGE_HEIGHT - 82
  }

  const summaryBottomY = drawSummaryBox({
    page: currentPage,
    font: regularFont,
    currency,
    grossAmount: totals.grossAmount,
    netAmount: totals.netAmount,
    taxAmount: totals.taxAmount,
    topY: currentTableTopY - 18,
  })

  drawFooterTotals({
    page: currentPage,
    font: regularFont,
    currency,
    grossAmount: totals.grossAmount,
    paidAmount,
    amountDue,
  })

  currentPage.drawLine({
    start: { x: PAGE_MARGIN, y: summaryBottomY - 18 },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y: summaryBottomY - 18 },
    thickness: 1,
    color: rgb(0.82, 0.82, 0.82),
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
