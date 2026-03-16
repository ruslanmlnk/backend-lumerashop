import { randomBytes } from 'node:crypto'

import type { Payload } from 'payload'

import { sanitizeCouponCode } from './coupon-preview'

export type LoyaltySettingsSnapshot = {
  bonusesEnabled: boolean
  earningSpendAmount: number
  earningBonusUnits: number
  redemptionBonusUnits: number
  redemptionAmount: number
}

type CouponDocument = {
  id: number | string
  name?: string | null
  code?: string | null
  discountPercent?: number | string | null
  isActive?: boolean | null
}

const toPositiveNumber = (value: unknown, fallback = 0) => {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export const normalizeDocumentId = (value: unknown) => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const trimmed = value.trim()
    const numeric = Number(trimmed)

    return Number.isInteger(numeric) ? numeric : trimmed
  }

  return null
}

export const generateCouponCode = () => {
  const value = randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const normalized = sanitizeCouponCode(value)

  return normalized.length >= 10 ? normalized.slice(0, 10) : `${normalized}${randomBytes(2).toString('hex').toUpperCase()}`
}

export const getDiscountPercent = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(numeric)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(numeric)))
}

export const calculateCouponDiscount = (subtotal: number, discountPercent: number) => {
  if (subtotal <= 0 || discountPercent <= 0) {
    return 0
  }

  return roundMoney((subtotal * discountPercent) / 100)
}

export const calculateBonusRedemption = (
  bonusBalance: number,
  subtotalAfterCoupon: number,
  settings: LoyaltySettingsSnapshot,
) => {
  const safeBalance = Math.max(0, Math.floor(toPositiveNumber(bonusBalance)))
  const eligibleSubtotal = roundMoney(Math.max(0, subtotalAfterCoupon))

  if (
    !settings.bonusesEnabled ||
    safeBalance <= 0 ||
    eligibleSubtotal <= 0 ||
    settings.redemptionBonusUnits <= 0 ||
    settings.redemptionAmount <= 0
  ) {
    return {
      bonusUnitsSpent: 0,
      discountAmount: 0,
      availableDiscountAmount: 0,
    }
  }

  const maxBlocksByBalance = Math.floor(safeBalance / settings.redemptionBonusUnits)
  const maxBlocksBySubtotal = Math.floor(eligibleSubtotal / settings.redemptionAmount)
  const blocks = Math.max(0, Math.min(maxBlocksByBalance, maxBlocksBySubtotal))
  const bonusUnitsSpent = blocks * settings.redemptionBonusUnits
  const discountAmount = roundMoney(blocks * settings.redemptionAmount)

  return {
    bonusUnitsSpent,
    discountAmount,
    availableDiscountAmount: roundMoney(maxBlocksByBalance * settings.redemptionAmount),
  }
}

export const calculateBonusEarned = (discountedSubtotal: number, settings: LoyaltySettingsSnapshot) => {
  const eligibleSubtotal = roundMoney(Math.max(0, discountedSubtotal))

  if (
    !settings.bonusesEnabled ||
    eligibleSubtotal <= 0 ||
    settings.earningSpendAmount <= 0 ||
    settings.earningBonusUnits <= 0
  ) {
    return 0
  }

  return Math.max(0, Math.floor(eligibleSubtotal / settings.earningSpendAmount) * settings.earningBonusUnits)
}

export const getDefaultLoyaltySettings = (): LoyaltySettingsSnapshot => ({
  bonusesEnabled: true,
  earningSpendAmount: 100,
  earningBonusUnits: 5,
  redemptionBonusUnits: 5,
  redemptionAmount: 100,
})

export const parseLoyaltySettings = (value: unknown): LoyaltySettingsSnapshot => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const earning = source.earningRule && typeof source.earningRule === 'object' ? (source.earningRule as Record<string, unknown>) : {}
  const redemption =
    source.redemptionRule && typeof source.redemptionRule === 'object'
      ? (source.redemptionRule as Record<string, unknown>)
      : {}

  return {
    bonusesEnabled: source.bonusesEnabled !== false,
    earningSpendAmount: Math.max(1, Math.floor(toPositiveNumber(earning.spendAmount, 100) || 100)),
    earningBonusUnits: Math.max(1, Math.floor(toPositiveNumber(earning.bonusUnits, 5) || 5)),
    redemptionBonusUnits: Math.max(1, Math.floor(toPositiveNumber(redemption.bonusUnits, 5) || 5)),
    redemptionAmount: Math.max(1, roundMoney(toPositiveNumber(redemption.discountAmount, 100) || 100)),
  }
}

export const getLoyaltySettings = async (payload: Payload) => {
  const global = await payload.findGlobal({
    slug: 'loyalty-settings' as never,
    depth: 0,
    overrideAccess: true,
  })

  return parseLoyaltySettings(global)
}

export const findCouponByCode = async (payload: Payload, code: string): Promise<CouponDocument | null> => {
  const normalizedCode = sanitizeCouponCode(code)
  if (!normalizedCode) {
    return null
  }

  const result = await payload.find({
    collection: 'coupons' as never,
    where: {
      code: {
        equals: normalizedCode,
      },
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return (result.docs[0] as CouponDocument | undefined) ?? null
}

export const hasUserUsedCoupon = async (payload: Payload, userId: number | string, couponId: number | string) => {
  const result = await payload.find({
    collection: 'orders' as never,
    where: {
      and: [
        {
          user: {
            equals: userId,
          },
        },
        {
          'discounts.coupon': {
            equals: couponId,
          },
        },
        {
          paymentStatus: {
            equals: 'paid',
          },
        },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return result.totalDocs > 0
}

export const previewCoupon = async (
  payload: Payload,
  {
    code,
    subtotal,
  }: {
    code: string
    subtotal: number
  },
) => {
  const coupon = await findCouponByCode(payload, code)

  if (!coupon) {
    throw new Error('Coupon code was not found.')
  }

  if (coupon.isActive === false) {
    throw new Error('This coupon is not active.')
  }

  const discountPercent = getDiscountPercent(coupon.discountPercent)
  if (discountPercent <= 0) {
    throw new Error('This coupon does not have a valid discount configured.')
  }

  const discountAmount = calculateCouponDiscount(subtotal, discountPercent)

  return {
    couponId: coupon.id,
    code: sanitizeCouponCode(coupon.code || code),
    name: coupon.name || 'Coupon',
    discountPercent,
    discountAmount,
  }
}

export const validateCouponForUser = async (
  payload: Payload,
  {
    code,
    subtotal,
    userId,
  }: {
    code: string
    subtotal: number
    userId: number | string
  },
) => {
  const preview = await previewCoupon(payload, {
    code,
    subtotal,
  })

  if (await hasUserUsedCoupon(payload, userId, preview.couponId)) {
    throw new Error('This coupon has already been used on your account.')
  }

  return preview
}
