import type { DefaultServerCellComponentProps } from 'payload'

import {
  formatProductDiscountDeadline,
  formatProductPrice,
  resolveProductPricing,
} from '@/lib/product-pricing'

export default function ProductPriceCell({ rowData }: DefaultServerCellComponentProps) {
  const pricing = resolveProductPricing(rowData || {})
  const deadline = pricing.isDiscountActive ? formatProductDiscountDeadline(pricing.discountValidUntil) : ''

  return (
    <div
      style={{
        display: 'grid',
        gap: 2,
        minWidth: 110,
      }}
    >
      <div
        style={{
          alignItems: 'baseline',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <strong>{formatProductPrice(pricing.currentPrice)}</strong>
        {pricing.compareAtPrice ? (
          <span
            style={{
              color: 'var(--theme-elevation-500)',
              fontSize: 12,
              textDecoration: 'line-through',
            }}
          >
            {formatProductPrice(pricing.compareAtPrice)}
          </span>
        ) : null}
      </div>

      {pricing.isDiscountActive && pricing.discountPercent ? (
        <span
          style={{
            color: 'var(--theme-success-700)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Sleva {pricing.discountPercent} %
        </span>
      ) : null}

      {deadline ? (
        <span
          style={{
            color: 'var(--theme-elevation-600)',
            fontSize: 11,
          }}
        >
          Do {deadline}
        </span>
      ) : null}
    </div>
  )
}
