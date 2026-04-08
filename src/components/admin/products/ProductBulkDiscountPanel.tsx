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
  height: 38,
  minWidth: 0,
  padding: '8px 12px',
  width: '100%',
}

const labelStyle: CSSProperties = {
  display: 'grid',
  fontSize: 12,
  fontWeight: 600,
  gap: 6,
  minWidth: 0,
}

const pillButton = (active: boolean): CSSProperties => ({
  background: active ? '#1f2937' : 'var(--theme-elevation-0)',
  border: active ? '1px solid #1f2937' : '1px solid var(--theme-elevation-200)',
  borderRadius: 999,
  color: active ? '#ffffff' : 'inherit',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700,
  height: 36,
  padding: '0 14px',
  whiteSpace: 'nowrap',
})

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
      return `Vybráno ${concreteSelectionCount} produktů`
    }

    if (count > 0) {
      return 'Vyberte konkrétní produkty v tabulce'
    }

    return 'Označte produkty a použijte slevu'
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
        body: JSON.stringify({
          discountPercent: action === 'apply' && mode === 'percent' ? Number(discountPercent) : null,
          discountPrice: action === 'apply' && mode === 'price' ? Number(discountPrice) : null,
          discountType: action === 'apply' ? mode : null,
          discountValidUntil: action === 'apply' && discountValidUntil ? new Date(discountValidUntil).toISOString() : null,
          ids: selectedIDs,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
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
        alignItems: 'end',
        background: 'var(--theme-elevation-0)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 14,
        display: 'grid',
        gap: 10,
        marginBottom: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          alignItems: 'baseline',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'grid', gap: 2 }}>
          <strong style={{ fontSize: 13 }}>Hromadná sleva</strong>
          <span
            style={{
              color: 'var(--theme-elevation-600)',
              fontSize: 12,
              lineHeight: 1.4,
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
          <button type="button" onClick={() => setMode('price')} style={pillButton(mode === 'price')}>
            Akční cena
          </button>
          <button type="button" onClick={() => setMode('percent')} style={pillButton(mode === 'percent')}>
            Sleva v %
          </button>
        </div>
      </div>

      <div
        style={{
          alignItems: 'end',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <label style={{ ...labelStyle, width: 170 }}>
          {mode === 'price' ? 'Akční cena (Kč)' : 'Sleva (%)'}
          {mode === 'price' ? (
            <input
              inputMode="decimal"
              onChange={(event) => setDiscountPrice(event.target.value)}
              placeholder="např. 1490"
              style={inputStyle}
              type="number"
              value={discountPrice}
            />
          ) : (
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
          )}
        </label>

        <label style={{ ...labelStyle, width: 220 }}>
          Sleva platí do
          <input
            onChange={(event) => setDiscountValidUntil(event.target.value)}
            style={inputStyle}
            type="datetime-local"
            value={discountValidUntil}
          />
        </label>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginLeft: 'auto',
          }}
        >
          <button
            type="button"
            disabled={!hasConcreteSelection || isSubmitting}
            onClick={() => void handleApply('apply')}
            style={{
              background: '#0f6b9a',
              border: '1px solid #0f6b9a',
              borderRadius: 999,
              color: '#ffffff',
              cursor: !hasConcreteSelection || isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 700,
              height: 38,
              opacity: !hasConcreteSelection || isSubmitting ? 0.6 : 1,
              padding: '0 14px',
              whiteSpace: 'nowrap',
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
              height: 38,
              opacity: !hasConcreteSelection || isSubmitting ? 0.6 : 1,
              padding: '0 14px',
              whiteSpace: 'nowrap',
            }}
          >
            Odebrat slevu
          </button>
        </div>
      </div>
    </div>
  )
}
