'use client'

import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import { toast, useSelection } from '@payloadcms/ui'

type DiscountMode = 'percent' | 'price'

type BulkDiscountResponse = {
  error?: string
  skippedCount?: number
  updatedCount?: number
}

const inputStyle: CSSProperties = {
  background: 'var(--theme-elevation-0)',
  border: '1px solid var(--theme-elevation-200)',
  borderRadius: 10,
  color: 'inherit',
  fontSize: 13,
  minHeight: 40,
  padding: '8px 12px',
  width: '100%',
}

const labelStyle: CSSProperties = {
  display: 'grid',
  fontSize: 12,
  fontWeight: 600,
  gap: 6,
}

export default function ProductBulkDiscountPanel() {
  const { count, selectedIDs } = useSelection()
  const [mode, setMode] = useState<DiscountMode>('price')
  const [discountPrice, setDiscountPrice] = useState('')
  const [discountPercent, setDiscountPercent] = useState('')
  const [discountValidUntil, setDiscountValidUntil] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const concreteSelectionCount = selectedIDs.length
  const hasConcreteSelection = concreteSelectionCount > 0
  const selectionLabel = useMemo(() => {
    if (hasConcreteSelection) {
      return `Vybráno ${concreteSelectionCount} produktů.`
    }

    if (count > 0) {
      return 'Pro tuto akci označte konkrétní produkty v tabulce.'
    }

    return 'Označte produkty v seznamu a pak na ně použijte slevu.'
  }, [count, concreteSelectionCount, hasConcreteSelection])

  const handleApply = async (action: 'apply' | 'clear') => {
    if (!hasConcreteSelection) {
      toast.error('Nejprve vyberte alespoň jeden produkt.')
      return
    }

    if (action === 'apply' && mode === 'price') {
      const numeric = Number(discountPrice)

      if (!Number.isFinite(numeric) || numeric <= 0) {
        toast.error('Zadejte platnou akční cenu.')
        return
      }
    }

    if (action === 'apply' && mode === 'percent') {
      const numeric = Number(discountPercent)

      if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100) {
        toast.error('Zadejte slevu v procentech od 0 do 100.')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/products/bulk-discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discountPercent: action === 'apply' && mode === 'percent' ? Number(discountPercent) : null,
          discountPrice: action === 'apply' && mode === 'price' ? Number(discountPrice) : null,
          discountType: action === 'apply' ? mode : null,
          discountValidUntil: action === 'apply' && discountValidUntil ? new Date(discountValidUntil).toISOString() : null,
          ids: selectedIDs,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as BulkDiscountResponse

      if (!response.ok) {
        throw new Error(payload.error || 'Hromadnou slevu se nepodařilo uložit.')
      }

      if (action === 'clear') {
        toast.success(`Sleva byla odebrána u ${payload.updatedCount || 0} produktů.`)
      } else if ((payload.updatedCount || 0) > 0) {
        const skippedMessage =
          payload.skippedCount && payload.skippedCount > 0
            ? ` ${payload.skippedCount} produktů bylo přeskočeno kvůli neplatné ceně.`
            : ''

        toast.success(`Sleva byla nastavena u ${payload.updatedCount || 0} produktů.${skippedMessage}`)
      } else {
        toast.error('Nebyl aktualizován žádný produkt.')
      }

      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Hromadnou slevu se nepodařilo uložit.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        background: 'var(--theme-elevation-0)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 18,
        display: 'grid',
        gap: 12,
        marginBottom: 14,
        padding: 16,
      }}
    >
      <div style={{ display: 'grid', gap: 4 }}>
        <strong style={{ fontSize: 14 }}>Hromadná sleva pro vybrané produkty</strong>
        <span
          style={{
            color: 'var(--theme-elevation-600)',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {selectionLabel}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setMode('price')}
          style={{
            background: mode === 'price' ? 'var(--theme-text)' : 'var(--theme-elevation-0)',
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: 999,
            color: mode === 'price' ? 'var(--theme-base-0)' : 'inherit',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            padding: '8px 12px',
          }}
        >
          Akční cena
        </button>
        <button
          type="button"
          onClick={() => setMode('percent')}
          style={{
            background: mode === 'percent' ? 'var(--theme-text)' : 'var(--theme-elevation-0)',
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: 999,
            color: mode === 'percent' ? 'var(--theme-base-0)' : 'inherit',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            padding: '8px 12px',
          }}
        >
          Sleva v %
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: mode === 'price' ? 'minmax(180px, 220px) minmax(220px, 260px)' : 'minmax(180px, 220px) minmax(220px, 260px)',
        }}
      >
        {mode === 'price' ? (
          <label style={labelStyle}>
            Akční cena (Kč)
            <input
              inputMode="decimal"
              onChange={(event) => setDiscountPrice(event.target.value)}
              placeholder="např. 1490"
              style={inputStyle}
              type="number"
              value={discountPrice}
            />
          </label>
        ) : (
          <label style={labelStyle}>
            Sleva (%)
            <input
              inputMode="decimal"
              max={100}
              min={0}
              onChange={(event) => setDiscountPercent(event.target.value)}
              placeholder="např. 15"
              style={inputStyle}
              type="number"
              value={discountPercent}
            />
          </label>
        )}

        <label style={labelStyle}>
          Sleva platí do
          <input
            onChange={(event) => setDiscountValidUntil(event.target.value)}
            style={inputStyle}
            type="datetime-local"
            value={discountValidUntil}
          />
        </label>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <button
          type="button"
          disabled={!hasConcreteSelection || isSubmitting}
          onClick={() => void handleApply('apply')}
          style={{
            background: 'var(--theme-success-600)',
            border: '1px solid transparent',
            borderRadius: 999,
            color: 'white',
            cursor: !hasConcreteSelection || isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontWeight: 700,
            opacity: !hasConcreteSelection || isSubmitting ? 0.6 : 1,
            padding: '10px 14px',
          }}
        >
          {isSubmitting ? 'Ukládám...' : 'Použít slevu'}
        </button>

        <button
          type="button"
          disabled={!hasConcreteSelection || isSubmitting}
          onClick={() => void handleApply('clear')}
          style={{
            background: 'var(--theme-elevation-0)',
            border: '1px solid var(--theme-elevation-200)',
            borderRadius: 999,
            color: 'inherit',
            cursor: !hasConcreteSelection || isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontWeight: 700,
            opacity: !hasConcreteSelection || isSubmitting ? 0.6 : 1,
            padding: '10px 14px',
          }}
        >
          Odebrat slevu
        </button>
      </div>
    </div>
  )
}
