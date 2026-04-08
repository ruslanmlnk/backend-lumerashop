export type ProductDiscountType = 'percent' | 'price'

type ProductPricingSource = {
  discountPercent?: unknown
  discountPrice?: unknown
  discountType?: unknown
  discountValidUntil?: unknown
  oldPrice?: unknown
  price?: unknown
}

export type ResolvedProductPricing = {
  compareAtPrice: number | null
  currentPrice: number
  discountPercent: number | null
  discountType: ProductDiscountType | null
  discountValidUntil: string | null
  isDiscountActive: boolean
  isDiscountExpired: boolean
  regularPrice: number
}

const PRICE_FORMATTER = new Intl.NumberFormat('cs-CZ', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
})

const toMoney = (value: unknown, fallback = 0) => {
  const numeric = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback
  }

  return Math.round((numeric + Number.EPSILON) * 100) / 100
}

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export const normalizeProductDiscountType = (value: unknown): ProductDiscountType | null => {
  if (value === 'price' || value === 'percent') {
    return value
  }

  return null
}

export const clampProductDiscountPercent = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numeric)) {
    return 0
  }

  return Math.max(0, Math.min(100, roundMoney(numeric)))
}

export const normalizeProductDiscountValidUntil = (value: unknown) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

const isDateExpired = (value: string | null, now: Date) => {
  if (!value) {
    return false
  }

  return new Date(value).getTime() <= now.getTime()
}

const hasLegacyDiscount = (source: ProductPricingSource) => {
  const currentPrice = toMoney(source.price)
  const compareAtPrice = toMoney(source.oldPrice)

  return compareAtPrice > currentPrice && currentPrice > 0
}

const getLegacyRegularPrice = (source: ProductPricingSource) => {
  const currentPrice = toMoney(source.price)
  const compareAtPrice = toMoney(source.oldPrice)

  if (compareAtPrice > currentPrice) {
    return compareAtPrice
  }

  return currentPrice
}

const getLegacySalePrice = (source: ProductPricingSource) => {
  if (!hasLegacyDiscount(source)) {
    return null
  }

  return toMoney(source.price)
}

const calculateDiscountPercent = (regularPrice: number, discountedPrice: number) => {
  if (regularPrice <= 0 || discountedPrice >= regularPrice) {
    return null
  }

  return roundMoney(((regularPrice - discountedPrice) / regularPrice) * 100)
}

export const resolveStoredProductRegularPrice = (source: ProductPricingSource) => {
  const hasModernDiscountConfig =
    normalizeProductDiscountType(source.discountType) !== null ||
    toMoney(source.discountPrice) > 0 ||
    clampProductDiscountPercent(source.discountPercent) > 0

  if (hasModernDiscountConfig) {
    return toMoney(source.price)
  }

  return getLegacyRegularPrice(source)
}

export const resolveProductPricing = (
  source: ProductPricingSource,
  now = new Date(),
): ResolvedProductPricing => {
  const regularPrice = resolveStoredProductRegularPrice(source)
  const discountType = normalizeProductDiscountType(source.discountType)
  const discountValidUntil = normalizeProductDiscountValidUntil(source.discountValidUntil)
  const isDiscountExpired = isDateExpired(discountValidUntil, now)

  if (discountType === 'price') {
    const discountPrice = toMoney(source.discountPrice)

    if (discountPrice > 0 && discountPrice < regularPrice && !isDiscountExpired) {
      return {
        compareAtPrice: regularPrice,
        currentPrice: discountPrice,
        discountPercent: calculateDiscountPercent(regularPrice, discountPrice),
        discountType,
        discountValidUntil,
        isDiscountActive: true,
        isDiscountExpired: false,
        regularPrice,
      }
    }
  }

  if (discountType === 'percent') {
    const discountPercent = clampProductDiscountPercent(source.discountPercent)

    if (discountPercent > 0 && regularPrice > 0 && !isDiscountExpired) {
      return {
        compareAtPrice: regularPrice,
        currentPrice: roundMoney((regularPrice * (100 - discountPercent)) / 100),
        discountPercent,
        discountType,
        discountValidUntil,
        isDiscountActive: true,
        isDiscountExpired: false,
        regularPrice,
      }
    }
  }

  const legacySalePrice = getLegacySalePrice(source)

  if (legacySalePrice !== null && !isDiscountExpired) {
    return {
      compareAtPrice: regularPrice,
      currentPrice: legacySalePrice,
      discountPercent: calculateDiscountPercent(regularPrice, legacySalePrice),
      discountType: 'price',
      discountValidUntil,
      isDiscountActive: true,
      isDiscountExpired: false,
      regularPrice,
    }
  }

  return {
    compareAtPrice: null,
    currentPrice: regularPrice,
    discountPercent: null,
    discountType,
    discountValidUntil,
    isDiscountActive: false,
    isDiscountExpired:
      isDiscountExpired &&
      (discountType !== null || legacySalePrice !== null || clampProductDiscountPercent(source.discountPercent) > 0),
    regularPrice,
  }
}

export const normalizeProductPricingData = (
  incomingData: Record<string, unknown>,
  originalDoc?: Record<string, unknown>,
) => {
  const mergedData = {
    ...(originalDoc || {}),
    ...incomingData,
  }

  const legacyRegularPrice = getLegacyRegularPrice(mergedData)
  const legacySalePrice = getLegacySalePrice(mergedData)
  const hasExplicitModernDiscountInput =
    incomingData.discountType !== undefined ||
    incomingData.discountPrice !== undefined ||
    incomingData.discountPercent !== undefined ||
    incomingData.discountValidUntil !== undefined
  const isLegacyConversion = legacySalePrice !== null && !hasExplicitModernDiscountInput
  const nextRegularPrice = isLegacyConversion
    ? legacyRegularPrice
    : incomingData.price !== undefined
      ? toMoney(incomingData.price, legacyRegularPrice)
      : toMoney(mergedData.price, legacyRegularPrice)

  let discountType =
    normalizeProductDiscountType(incomingData.discountType ?? mergedData.discountType) ||
    (legacySalePrice !== null ? 'price' : null)
  let discountPrice = toMoney(incomingData.discountPrice ?? mergedData.discountPrice)
  let discountPercent = clampProductDiscountPercent(incomingData.discountPercent ?? mergedData.discountPercent)

  if (discountType === 'price' && discountPrice <= 0 && legacySalePrice !== null) {
    discountPrice = legacySalePrice
  }

  if (discountType === 'price' && !(discountPrice > 0 && discountPrice < nextRegularPrice)) {
    discountType = null
  }

  if (discountType === 'percent' && !(discountPercent > 0 && nextRegularPrice > 0)) {
    discountType = null
  }

  if (discountType !== 'price') {
    discountPrice = 0
  }

  if (discountType !== 'percent') {
    discountPercent = 0
  }

  return {
    ...incomingData,
    discountPercent: discountType === 'percent' ? discountPercent : null,
    discountPrice: discountType === 'price' ? discountPrice : null,
    discountType,
    discountValidUntil:
      discountType !== null ? normalizeProductDiscountValidUntil(mergedData.discountValidUntil) : null,
    oldPrice: null,
    price: nextRegularPrice,
  }
}

export const formatProductPrice = (value: number) => `${PRICE_FORMATTER.format(Math.max(0, value))} Kč`

export const formatProductDiscountDeadline = (value: string | null) => {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toLocaleString('cs-CZ', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Prague',
    year: 'numeric',
  })
}
