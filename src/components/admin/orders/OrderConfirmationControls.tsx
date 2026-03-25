'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast, useDocumentInfo } from '@payloadcms/ui'

type ConfirmationState = {
  orderId?: string
  isConfirmed?: boolean
  confirmedAt?: string
  confirmationEmailSentAt?: string
  alreadyConfirmed?: boolean
}

type EndpointResponse = ConfirmationState & {
  error?: string
}

const readConfirmationState = (value: unknown): ConfirmationState => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return {
    orderId: typeof source.orderId === 'string' ? source.orderId : '',
    isConfirmed: source.isConfirmed === true,
    confirmedAt: typeof source.confirmedAt === 'string' ? source.confirmedAt : '',
    confirmationEmailSentAt:
      typeof source.confirmationEmailSentAt === 'string' ? source.confirmationEmailSentAt : '',
    alreadyConfirmed: source.alreadyConfirmed === true,
  }
}

const formatTimestamp = (value: string | undefined) => {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

export default function OrderConfirmationControls() {
  const { data } = useDocumentInfo()
  const [isBusy, setIsBusy] = useState(false)
  const [confirmation, setConfirmation] = useState<ConfirmationState>(() => readConfirmationState(data))

  useEffect(() => {
    setConfirmation(readConfirmationState(data))
  }, [data])

  const docId = useMemo(() => {
    const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
    const value = source.id

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value)
    }

    return ''
  }, [data])

  if (!docId) {
    return null
  }

  const handleConfirm = async () => {
    setIsBusy(true)

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(docId)}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const payload = (await response.json().catch(() => ({}))) as EndpointResponse

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to confirm order.')
      }

      const nextConfirmation = readConfirmationState(payload)
      setConfirmation(nextConfirmation)
      toast.success(
        nextConfirmation.alreadyConfirmed
          ? 'Order was already confirmed.'
          : 'Order confirmed and customer email sent.',
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm order.'
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
        <strong style={{ fontSize: 14 }}>Order confirmation</strong>
        <span style={{ color: 'var(--theme-elevation-600)', fontSize: 13 }}>
          Confirm the order and send the customer a branded email with the order summary.
        </span>
      </div>

      <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
        <div>
          <strong>Status:</strong> {confirmation.isConfirmed ? 'Confirmed' : 'Waiting for confirmation'}
        </div>
        {confirmation.orderId ? (
          <div>
            <strong>Order ID:</strong> {confirmation.orderId}
          </div>
        ) : null}
        {confirmation.confirmedAt ? (
          <div>
            <strong>Confirmed:</strong> {formatTimestamp(confirmation.confirmedAt)}
          </div>
        ) : null}
        {confirmation.confirmationEmailSentAt ? (
          <div>
            <strong>Email sent:</strong> {formatTimestamp(confirmation.confirmationEmailSentAt)}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isBusy || confirmation.isConfirmed}
        style={{
          border: '1px solid transparent',
          borderRadius: 999,
          padding: '10px 16px',
          background: isBusy || confirmation.isConfirmed ? 'var(--theme-elevation-150)' : '#111111',
          color: isBusy || confirmation.isConfirmed ? 'var(--theme-elevation-700)' : '#ffffff',
          cursor: isBusy || confirmation.isConfirmed ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        {isBusy ? 'Sending...' : confirmation.isConfirmed ? 'Order confirmed' : 'Confirm order'}
      </button>
    </div>
  )
}
