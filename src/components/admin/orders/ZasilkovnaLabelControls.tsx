'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast, useDocumentInfo } from '@payloadcms/ui'

type ShipmentState = {
  packetId?: string
  packetNumber?: string
  carrierNumber?: string
  labelMode?: string
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
    packetId: typeof source.packetId === 'string' ? source.packetId : '',
    packetNumber: typeof source.packetNumber === 'string' ? source.packetNumber : '',
    carrierNumber: typeof source.carrierNumber === 'string' ? source.carrierNumber : '',
    labelMode: typeof source.labelMode === 'string' ? source.labelMode : '',
    lastError: typeof source.lastError === 'string' ? source.lastError : '',
    lastCheckedAt: typeof source.lastCheckedAt === 'string' ? source.lastCheckedAt : '',
  }
}

const isZasilkovnaOrder = (data: unknown) => {
  const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const shipping = source.shipping && typeof source.shipping === 'object' ? (source.shipping as Record<string, unknown>) : {}
  return typeof shipping.methodId === 'string' && shipping.methodId.startsWith('zasilkovna-')
}

export default function ZasilkovnaLabelControls() {
  const { data } = useDocumentInfo()
  const [isBusy, setIsBusy] = useState(false)
  const [shipment, setShipment] = useState<ShipmentState>(() =>
    readShipmentState((data as Record<string, unknown> | undefined)?.zasilkovnaShipment),
  )

  useEffect(() => {
    setShipment(readShipmentState((data as Record<string, unknown> | undefined)?.zasilkovnaShipment))
  }, [data])

  const docId = useMemo(() => {
    const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
    const value = source.id

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value)
    }

    return ''
  }, [data])

  if (!docId || !isZasilkovnaOrder(data)) {
    return null
  }

  const handleSync = async () => {
    setIsBusy(true)

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(docId)}/zasilkovna-label`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const payload = (await response.json().catch(() => ({}))) as EndpointResponse

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to sync Zasilkovna label.')
      }

      if (payload.shipment) {
        setShipment(payload.shipment)
      }

      toast.success(payload.wasCreated ? 'Zasilkovna label generated.' : 'Zasilkovna label refreshed.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync Zasilkovna label.'
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
        <strong style={{ fontSize: 14 }}>Zasilkovna label</strong>
        <span style={{ color: 'var(--theme-elevation-600)', fontSize: 13 }}>
          Generate or refresh the shipment label for this order.
        </span>
      </div>

      <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
        <div>
          <strong>Mode:</strong> {shipment.labelMode || 'Not generated'}
        </div>
        {shipment.packetId ? (
          <div>
            <strong>Packet ID:</strong> {shipment.packetId}
          </div>
        ) : null}
        {shipment.packetNumber ? (
          <div>
            <strong>Packet number:</strong> {shipment.packetNumber}
          </div>
        ) : null}
        {shipment.carrierNumber ? (
          <div>
            <strong>Carrier number:</strong> {shipment.carrierNumber}
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
          {isBusy ? 'Processing...' : shipment.packetId ? 'Refresh Zasilkovna label' : 'Generate Zasilkovna label'}
        </button>

        <a
          href={`/api/orders/${encodeURIComponent(docId)}/zasilkovna-label/download`}
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
      </div>
    </div>
  )
}
