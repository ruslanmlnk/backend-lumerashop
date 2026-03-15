import QRCode from 'qrcode'

const GOLD = '#b98743'
const INK = '#111111'
const PAPER = '#faf7f2'
const SOFT = '#e7dcc7'
const MUTED = '#6f665a'

const QR_DOWNLOAD_SIZE = 720
const QR_MARGIN = 2

const clampPercent = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(numeric)))
}

export const sanitizeCouponCode = (value: unknown) =>
  (typeof value === 'string' ? value : '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

const sanitizePreviewText = (value: unknown, maxLength = 72) => {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }

  return normalized.slice(0, maxLength)
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const wrapLines = (value: string, maxCharsPerLine: number, maxLines: number) => {
  const words = value.split(' ').filter(Boolean)
  const lines: string[] = []

  if (words.length === 0) {
    return lines
  }

  let currentLine = ''

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word

    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    currentLine = word

    if (lines.length === maxLines - 1) {
      break
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine)
  }

  if (lines.length === 0) {
    return [value.slice(0, maxCharsPerLine)]
  }

  const joined = words.join(' ')
  const visible = lines.join(' ')
  if (joined.length > visible.length) {
    const lastIndex = lines.length - 1
    lines[lastIndex] = `${lines[lastIndex].slice(0, Math.max(0, maxCharsPerLine - 3)).trimEnd()}...`
  }

  return lines
}

export type CouponPreviewContent = {
  title?: string
  subtitle?: string
  note?: string
  showTitle?: boolean
  showSubtitle?: boolean
  showDiscount?: boolean
  showCode?: boolean
}

export type CouponPreviewAssets = {
  qrSvg: string
  previewSvg: string
}

const DEFAULT_SITE_URL = 'http://127.0.0.1:3000'

const getSiteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, '')

export const buildCouponTargetUrl = (code: string, websiteLink?: unknown) => {
  const normalizedCode = sanitizeCouponCode(code) || 'LUMERA-COUPON'
  const rawLink = sanitizePreviewText(websiteLink, 512)
  const fallbackUrl = new URL('/checkout', getSiteUrl())

  let target: URL

  try {
    target = new URL(rawLink || '/checkout', getSiteUrl())
  } catch {
    target = fallbackUrl
  }

  target.searchParams.set('coupon', normalizedCode)
  return target.toString()
}

export const normalizeCouponPreviewContent = (
  value: unknown,
  fallbackTitle = 'Lumera Coupon',
): Required<CouponPreviewContent> => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const title = sanitizePreviewText(source.title, 64) || sanitizePreviewText(fallbackTitle, 64) || 'Lumera Coupon'
  const subtitle = sanitizePreviewText(source.subtitle, 40)
  const note = sanitizePreviewText(source.note, 72)

  return {
    title,
    subtitle,
    note,
    showTitle: source.showTitle !== false,
    showSubtitle: source.showSubtitle === true && Boolean(subtitle),
    showDiscount: source.showDiscount !== false,
    showCode: source.showCode !== false,
  }
}

const svgToDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

export const buildCouponQrSvg = async (targetUrl: string) =>
  QRCode.toString(targetUrl, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: QR_MARGIN,
    width: QR_DOWNLOAD_SIZE,
    color: {
      dark: INK,
      light: '#FFFFFF',
    },
  })

export const buildCouponPreviewAssets = async ({
  code,
  discountPercent,
  couponName = 'Lumera Coupon',
  preview,
  websiteLink,
}: {
  code: string
  discountPercent: unknown
  couponName?: string
  preview?: CouponPreviewContent | null
  websiteLink?: unknown
}): Promise<CouponPreviewAssets> => {
  const normalizedCode = sanitizeCouponCode(code) || 'LUMERA-COUPON'
  const percent = clampPercent(discountPercent)
  const content = normalizeCouponPreviewContent(preview, couponName)
  const targetUrl = buildCouponTargetUrl(normalizedCode, websiteLink)
  const qrSvg = await buildCouponQrSvg(targetUrl)
  const qrDataUri = svgToDataUri(qrSvg)

  const viewBoxWidth = 420
  const titleLines = content.showTitle ? wrapLines(content.title, 22, 2) : []
  const noteLines = content.note ? wrapLines(content.note, 40, 2) : []

  let contentTop = 84
  const subtitleMarkup =
    content.showSubtitle && content.subtitle
      ? `<text x="40" y="${contentTop}" fill="${GOLD}" font-size="11" font-family="Arial, sans-serif" font-weight="700" letter-spacing="2.2">${escapeXml(content.subtitle.toUpperCase())}</text>`
      : ''

  if (subtitleMarkup) {
    contentTop += 22
  }

  const titleMarkup = titleLines
    .map(
      (line, index) =>
        `<text x="40" y="${contentTop + index * 28}" fill="${INK}" font-size="27" font-family="Arial, sans-serif" font-weight="700">${escapeXml(line)}</text>`,
    )
    .join('')

  if (titleLines.length > 0) {
    contentTop += titleLines.length * 28 + 16
  }

  let qrSize = 236
  if (!content.showTitle) {
    qrSize += 16
  }
  if (!content.showSubtitle) {
    qrSize += 8
  }
  if (!content.showCode || !content.showDiscount) {
    qrSize += 20
  }
  if (!content.showCode && !content.showDiscount) {
    qrSize += 24
  }
  qrSize = Math.min(292, qrSize)

  const qrFramePadding = 16
  const qrFrameSize = qrSize + qrFramePadding * 2
  const qrFrameX = Math.round((viewBoxWidth - qrFrameSize) / 2)
  const qrFrameY = contentTop
  const qrImageX = qrFrameX + qrFramePadding
  const qrImageY = qrFrameY + qrFramePadding

  const footerTop = qrFrameY + qrFrameSize + 28
  const codeLabelY = footerTop + 14
  const codeValueY = footerTop + 46
  const noteStartY = footerTop + (content.showCode || content.showDiscount ? 84 : 18)

  const discountMarkup =
    content.showDiscount && percent > 0
      ? [
          `<text x="380" y="${footerTop + 16}" fill="${GOLD}" text-anchor="end" font-size="12" font-family="Arial, sans-serif" font-weight="700" letter-spacing="1.8">SLEVA</text>`,
          `<text x="380" y="${footerTop + 54}" fill="${INK}" text-anchor="end" font-size="34" font-family="Arial, sans-serif" font-weight="700">${percent}%</text>`,
        ].join('')
      : ''

  const noteMarkup = noteLines
    .map(
      (line, index) =>
        `<text x="40" y="${noteStartY + index * 18}" fill="${MUTED}" font-size="12" font-family="Arial, sans-serif">${escapeXml(line)}</text>`,
    )
    .join('')

  const codeMarkup = content.showCode
    ? [
        `<text x="40" y="${codeLabelY}" fill="${MUTED}" font-size="12" font-family="Arial, sans-serif" font-weight="700" letter-spacing="2">COUPON CODE</text>`,
        `<text x="40" y="${codeValueY}" fill="${INK}" font-size="24" font-family="Arial, sans-serif" font-weight="700">${escapeXml(normalizedCode)}</text>`,
      ].join('')
    : ''

  const footerBottom = Math.max(
    content.showCode ? codeValueY : footerTop,
    content.showDiscount && percent > 0 ? footerTop + 54 : footerTop,
    noteLines.length > 0 ? noteStartY + (noteLines.length - 1) * 18 : footerTop,
  )
  const viewBoxHeight = Math.max(qrFrameY + qrFrameSize + 40, footerBottom + 48)

  const previewSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" role="img" aria-label="${escapeXml(normalizedCode)} coupon preview" style="display:block;width:100%;height:auto">`,
    `<rect width="${viewBoxWidth}" height="${viewBoxHeight}" rx="30" fill="${PAPER}" />`,
    `<rect x="20" y="20" width="${viewBoxWidth - 40}" height="${viewBoxHeight - 40}" rx="24" fill="#fffdf8" stroke="${SOFT}" />`,
    `<rect x="40" y="34" width="136" height="28" rx="14" fill="${INK}" />`,
    `<text x="108" y="52" fill="#fff" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" font-weight="700" letter-spacing="1.1">LUMERA COUPON</text>`,
    subtitleMarkup,
    titleMarkup,
    `<rect x="${qrFrameX}" y="${qrFrameY}" width="${qrFrameSize}" height="${qrFrameSize}" rx="24" fill="#fff" stroke="${SOFT}" />`,
    `<image x="${qrImageX}" y="${qrImageY}" width="${qrSize}" height="${qrSize}" href="${qrDataUri}" preserveAspectRatio="xMidYMid meet" />`,
    codeMarkup,
    discountMarkup,
    noteMarkup,
    `</svg>`,
  ].join('')

  return {
    qrSvg,
    previewSvg,
  }
}
