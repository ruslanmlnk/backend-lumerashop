'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast, useDocumentInfo } from '@payloadcms/ui'

import { isPplShippingSelection } from '@/lib/shipping-carriers'

type ShipmentState = {
  batchId?: string
  shipmentNumber?: string
  importState?: string
  labelUrl?: string
  completeLabelUrl?: string
  lastError?: string
  lastCheckedAt?: string
}

type EndpointResponse = {
  shipment?: ShipmentState
  labelReady?: boolean
  wasCreated?: boolean
  error?: string
}

const readShipmentState = (value: unknown): ShipmentState => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return {
    batchId: typeof source.batchId === 'string' ? source.batchId : '',
    shipmentNumber: typeof source.shipmentNumber === 'string' ? source.shipmentNumber : '',
    importState: typeof source.importState === 'string' ? source.importState : '',
    labelUrl: typeof source.labelUrl === 'string' ? source.labelUrl : '',
    completeLabelUrl: typeof source.completeLabelUrl === 'string' ? source.completeLabelUrl : '',
    lastError: typeof source.lastError === 'string' ? source.lastError : '',
    lastCheckedAt: typeof source.lastCheckedAt === 'string' ? source.lastCheckedAt : '',
  }
}

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0

const isPplOrder = (data: unknown) => {
  const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const shipment = source.pplShipment && typeof source.pplShipment === 'object' ? (source.pplShipment as Record<string, unknown>) : {}

  return (
    isPplShippingSelection(source.shipping) ||
    hasText(shipment.batchId) ||
    hasText(shipment.shipmentNumber) ||
    hasText(shipment.lastError)
  )
}

export default function PPLLabelControls() {
  const { data } = useDocumentInfo()
  const [isBusy, setIsBusy] = useState(false)
  const [shipment, setShipment] = useState<ShipmentState>(() => readShipmentState((data as Record<string, unknown> | undefined)?.pplShipment))

  useEffect(() => {
    setShipment(readShipmentState((data as Record<string, unknown> | undefined)?.pplShipment))
  }, [data])

  const docId = useMemo(() => {
    const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
    const value = source.id

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value)
    }

    return ''
  }, [data])

  if (!docId || !isPplOrder(data)) {
    return null
  }

  const labelReady = Boolean(shipment.completeLabelUrl || shipment.labelUrl)

  const handleSync = async () => {
    setIsBusy(true)

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(docId)}/ppl-label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const payload = (await response.json().catch(() => ({}))) as EndpointResponse

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to sync PPL label.')
      }

      if (payload.shipment) {
        setShipment(payload.shipment)
      }

      if (payload.labelReady) {
        toast.success(payload.wasCreated ? 'PPL label generated.' : 'PPL label refreshed.')
      } else {
        toast.message('PPL shipment saved. Label is still processing.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync PPL label.'
      toast.error(message)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 12,
        padding: 16,
        background: 'var(--theme-elevation-0)',
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'grid', gap: 4 }}>
        <strong style={{ fontSize: 14 }}>PPL label</strong>
        <span style={{ color: 'var(--theme-elevation-600)', fontSize: 13 }}>
          Generate or refresh the shipment label for this order.
        </span>
      </div>

      <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
        <div>
          <strong>Status:</strong> {shipment.importState || 'Not generated'}
        </div>
        {shipment.batchId ? (
          <div>
            <strong>Batch ID:</strong> {shipment.batchId}
          </div>
        ) : null}
        {shipment.shipmentNumber ? (
          <div>
            <strong>Shipment number:</strong> {shipment.shipmentNumber}
          </div>
        ) : null}
        {shipment.lastCheckedAt ? (
          <div>
            <strong>Checked:</strong> {new Date(shipment.lastCheckedAt).toLocaleString()}
          </div>
        ) : null}
        {shipment.lastError ? (
          <div style={{ color: '#b42318' }}>
            <strong>Error:</strong> {shipment.lastError}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button
          type="button"
          onClick={handleSync}
          disabled={isBusy}
          style={{
            border: '1px solid var(--theme-elevation-300)',
            borderRadius: 999,
            padding: '10px 16px',
            background: isBusy ? 'var(--theme-elevation-100)' : 'var(--theme-elevation-0)',
            color: 'var(--theme-text)',
            cursor: isBusy ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {isBusy ? 'Processing...' : shipment.batchId ? 'Refresh PPL label' : 'Generate PPL label'}
        </button>

        {labelReady ? (
          <a
            href={`/api/orders/${encodeURIComponent(docId)}/ppl-label/download`}
            target="_blank"
            rel="noreferrer"
            style={{
              border: '1px solid var(--theme-elevation-300)',
              borderRadius: 999,
              padding: '10px 16px',
              background: 'var(--theme-elevation-0)',
              color: 'var(--theme-text)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Open label
          </a>
        ) : null}
      </div>
    </div>
  )
}
