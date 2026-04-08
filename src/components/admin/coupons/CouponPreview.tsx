'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

import {
  buildCouponPreviewAssets,
  normalizeCouponPreviewContent,
  sanitizeCouponCode,
  type CouponPreviewAssets,
} from '@/lib/coupon-preview'

const readCouponPreviewState = (value: unknown) => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const couponName = typeof source.name === 'string' ? source.name.trim() : 'Kupón Lumera'
  const content =
    source.qrCard && typeof source.qrCard === 'object'
      ? normalizeCouponPreviewContent(source.qrCard, couponName)
      : normalizeCouponPreviewContent(undefined, couponName)

  return {
    code: sanitizeCouponCode(source.code),
    name: couponName,
    websiteLink: typeof source.websiteLink === 'string' ? source.websiteLink.trim() : '',
    discountPercent:
      typeof source.discountPercent === 'number' || typeof source.discountPercent === 'string'
        ? source.discountPercent
        : 0,
    content,
  }
}

const downloadSvg = (svg: string, fileName: string) => {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function CouponPreview() {
  const { data } = useDocumentInfo()
  const preview = useMemo(() => readCouponPreviewState(data), [data])
  const [assets, setAssets] = useState<CouponPreviewAssets | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    if (!preview.code) {
      setAssets(null)
      setError('')
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }

    const run = async () => {
      setIsLoading(true)
      setError('')

      try {
        const nextAssets = await buildCouponPreviewAssets({
          code: preview.code,
          discountPercent: preview.discountPercent,
          couponName: preview.name || 'Kupón Lumera',
          preview: preview.content,
          websiteLink: preview.websiteLink,
        })

        if (!cancelled) {
          setAssets(nextAssets)
        }
      } catch (generationError) {
        if (!cancelled) {
          setAssets(null)
          setError(generationError instanceof Error ? generationError.message : 'QR náhled se nepodařilo vygenerovat.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [preview])

  if (!preview.code) {
    return (
      <div
        style={{
          border: '1px dashed var(--theme-elevation-200)',
          borderRadius: 16,
          padding: 16,
          background: 'var(--theme-elevation-0)',
          color: 'var(--theme-elevation-600)',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        Pro vygenerování QR podkladů a souborů nejdříve kupón uložte.
      </div>
    )
  }

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 18,
        padding: 14,
        background: 'var(--theme-elevation-0)',
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'grid', gap: 4 }}>
        <strong style={{ fontSize: 14 }}>Náhled kupónu</strong>
        <span style={{ color: 'var(--theme-elevation-600)', fontSize: 13 }}>
          Rozložení se automaticky přizpůsobí, když skryjete nadpis, slevu, kód nebo poznámku.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => assets && downloadSvg(assets.qrSvg, `${preview.code.toLowerCase()}-qr.svg`)}
          disabled={!assets || isLoading}
          style={{
            borderRadius: 999,
            border: '1px solid var(--theme-elevation-200)',
            background: 'var(--theme-elevation-0)',
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: !assets || isLoading ? 'not-allowed' : 'pointer',
            opacity: !assets || isLoading ? 0.6 : 1,
          }}
        >
          Stáhnout QR
        </button>
        <button
          type="button"
          onClick={() => assets && downloadSvg(assets.previewSvg, `${preview.code.toLowerCase()}-coupon-card.svg`)}
          disabled={!assets || isLoading}
          style={{
            borderRadius: 999,
            border: '1px solid transparent',
            background: GOLD,
            color: '#fff',
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: !assets || isLoading ? 'not-allowed' : 'pointer',
            opacity: !assets || isLoading ? 0.6 : 1,
          }}
        >
          Stáhnout celou kartu
        </button>
      </div>

      {isLoading ? (
        <div
          style={{
            borderRadius: 14,
            border: '1px dashed var(--theme-elevation-200)',
            padding: 16,
            color: 'var(--theme-elevation-600)',
            fontSize: 13,
          }}
        >
          Generuji QR náhled...
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            borderRadius: 14,
            border: '1px solid rgba(180, 35, 24, 0.2)',
            background: '#fff4f2',
            padding: 16,
            color: '#b42318',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {error}
        </div>
      ) : null}

      {assets ? (
        <div
          style={{
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid var(--theme-elevation-100)',
            background: '#faf7f2',
          }}
          dangerouslySetInnerHTML={{ __html: assets.previewSvg }}
        />
      ) : null}
    </div>
  )
}

const GOLD = '#b98743'
