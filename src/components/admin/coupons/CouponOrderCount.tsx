'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

type OrdersCountResponse = {
  totalDocs?: number
}

const readCouponState = (value: unknown) => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const id = source.id

  return {
    id: typeof id === 'string' || typeof id === 'number' ? String(id) : '',
    code: typeof source.code === 'string' ? source.code.trim() : '',
  }
}

export default function CouponOrderCount() {
  const { data } = useDocumentInfo()
  const coupon = useMemo(() => readCouponState(data), [data])
  const [count, setCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!coupon.id) {
      setCount(null)
      setIsLoading(false)
      setError('')
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({
      depth: '0',
      limit: '1',
      'where[discounts.coupon][equals]': coupon.id,
    })

    const run = async () => {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/orders?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => ({}))) as OrdersCountResponse & { error?: string }

        if (!response.ok) {
          throw new Error(payload.error || 'Nepodařilo se načíst počet nákupů.')
        }

        setCount(typeof payload.totalDocs === 'number' ? payload.totalDocs : 0)
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return
        }

        setCount(null)
        setError(fetchError instanceof Error ? fetchError.message : 'Nepodařilo se načíst počet nákupů.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      controller.abort()
    }
  }, [coupon.id])

  if (!coupon.id) {
    return null
  }

  const label = coupon.code ? `Celkový počet nákupů s kódem ${coupon.code}` : 'Celkový počet nákupů s tímto kódem'
  const value = isLoading ? 'Načítám...' : error ? '-' : count?.toLocaleString('cs-CZ') ?? '0'

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 12,
        padding: 16,
        background: 'var(--theme-elevation-0)',
        display: 'grid',
        gap: 6,
        marginBottom: 12,
      }}
    >
      <strong style={{ fontSize: 14 }}>{label}</strong>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {error ? (
        <span style={{ color: '#b42318', fontSize: 13 }}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
