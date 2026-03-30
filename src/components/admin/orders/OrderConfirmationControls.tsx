'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast, useDocumentInfo } from '@payloadcms/ui'

type OrderDecisionState = {
  orderId?: string
  isConfirmed?: boolean
  confirmedAt?: string
  confirmationEmailSentAt?: string
  isCanceled?: boolean
  canceledAt?: string
  cancellationEmailSentAt?: string
  currentStatus?: 'pending' | 'confirmed' | 'canceled'
  alreadyConfirmed?: boolean
  alreadyCanceled?: boolean
}

type EndpointResponse = OrderDecisionState & {
  error?: string
}

const getDownloadFileName = (contentDisposition: string | null) => {
  if (!contentDisposition) {
    return 'invoice.pdf'
  }

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)

  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1])
    } catch {
      return utfMatch[1]
    }
  }

  const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i)

  if (quotedMatch?.[1]) {
    return quotedMatch[1]
  }

  const plainMatch = contentDisposition.match(/filename=([^;]+)/i)
  return plainMatch?.[1]?.trim() || 'invoice.pdf'
}

const readOrderDecisionState = (value: unknown): OrderDecisionState => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const isConfirmed = source.isConfirmed === true
  const isCanceled = source.isCanceled === true

  return {
    orderId: typeof source.orderId === 'string' ? source.orderId : '',
    isConfirmed,
    confirmedAt: typeof source.confirmedAt === 'string' ? source.confirmedAt : '',
    confirmationEmailSentAt:
      typeof source.confirmationEmailSentAt === 'string' ? source.confirmationEmailSentAt : '',
    isCanceled,
    canceledAt: typeof source.canceledAt === 'string' ? source.canceledAt : '',
    cancellationEmailSentAt:
      typeof source.cancellationEmailSentAt === 'string' ? source.cancellationEmailSentAt : '',
    currentStatus:
      source.currentStatus === 'confirmed' || source.currentStatus === 'canceled'
        ? source.currentStatus
        : isCanceled
          ? 'canceled'
          : isConfirmed
            ? 'confirmed'
            : 'pending',
    alreadyConfirmed: source.alreadyConfirmed === true,
    alreadyCanceled: source.alreadyCanceled === true,
  }
}

const formatTimestamp = (value: string | undefined) => {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

const getStatusLabel = (status: OrderDecisionState['currentStatus']) => {
  if (status === 'canceled') {
    return 'Canceled'
  }

  if (status === 'confirmed') {
    return 'Accepted'
  }

  return 'Waiting for decision'
}

const mergeDecisionIntoDocument = (value: unknown, decision: OrderDecisionState) => {
  if (!value || typeof value !== 'object') {
    return value
  }

  return {
    ...(value as Record<string, unknown>),
    orderId: decision.orderId || '',
    isConfirmed: decision.isConfirmed === true,
    confirmedAt: decision.confirmedAt || undefined,
    confirmationEmailSentAt: decision.confirmationEmailSentAt || undefined,
    isCanceled: decision.isCanceled === true,
    canceledAt: decision.canceledAt || undefined,
    cancellationEmailSentAt: decision.cancellationEmailSentAt || undefined,
    currentStatus: decision.currentStatus || 'pending',
  }
}

export default function OrderConfirmationControls() {
  const { data, setData } = useDocumentInfo()
  const [busyAction, setBusyAction] = useState<'confirm' | 'cancel' | 'invoice' | null>(null)
  const [isRefreshingDecision, setIsRefreshingDecision] = useState(false)
  const [hasLoadedPersistedDecision, setHasLoadedPersistedDecision] = useState(false)
  const [decision, setDecision] = useState<OrderDecisionState>(() => readOrderDecisionState(data))
  const dataRef = useRef(data)

  useEffect(() => {
    dataRef.current = data
    setDecision(readOrderDecisionState(data))
  }, [data])

  const docId = useMemo(() => {
    const source = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
    const value = source.id

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value)
    }

    return ''
  }, [data])

  const applyDecision = (nextDecision: OrderDecisionState) => {
    setDecision(nextDecision)

    if (typeof setData === 'function') {
      const nextData = mergeDecisionIntoDocument(dataRef.current, nextDecision)

      if (nextData && typeof nextData === 'object') {
        dataRef.current = nextData
        setData(nextData)
      }
    }
  }

  const refreshDecision = async (targetDocId: string) => {
    setIsRefreshingDecision(true)

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(targetDocId)}/decision`, {
        method: 'GET',
        cache: 'no-store',
      })

      const payload = (await response.json().catch(() => ({}))) as EndpointResponse

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load saved order status.')
      }

      applyDecision(readOrderDecisionState(payload))
    } catch (error) {
      console.error('Failed to refresh order decision state.', error)
    } finally {
      setIsRefreshingDecision(false)
      setHasLoadedPersistedDecision(true)
    }
  }

  useEffect(() => {
    if (!docId) {
      return
    }

    setHasLoadedPersistedDecision(false)
    void refreshDecision(docId)
  }, [docId])

  if (!docId) {
    return null
  }

  const handleAction = async (action: 'confirm' | 'cancel') => {
    setBusyAction(action)

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(docId)}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const payload = (await response.json().catch(() => ({}))) as EndpointResponse

      if (!response.ok) {
        throw new Error(payload.error || `Failed to ${action} order.`)
      }

      const nextDecision = readOrderDecisionState(payload)
      applyDecision(nextDecision)
      setHasLoadedPersistedDecision(true)
      void refreshDecision(docId)

      if (action === 'confirm') {
        toast.success(nextDecision.alreadyConfirmed ? 'Order was already accepted.' : 'Order accepted and email sent.')
      } else {
        toast.success(nextDecision.alreadyCanceled ? 'Order was already canceled.' : 'Order canceled and email sent.')
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : action === 'confirm' ? 'Failed to accept order.' : 'Failed to cancel order.'
      toast.error(message)
    } finally {
      setBusyAction(null)
    }
  }

  const handleInvoiceDownload = async () => {
    setBusyAction('invoice')

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(docId)}/invoice`, {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || 'Failed to generate invoice PDF.')
      }

      const blob = await response.blob()
      const fileName = getDownloadFileName(response.headers.get('content-disposition'))
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = downloadUrl
      link.download = fileName
      link.target = '_blank'
      link.rel = 'noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => {
        URL.revokeObjectURL(downloadUrl)
      }, 5000)

      toast.success('Invoice PDF generated.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate invoice PDF.'
      toast.error(message)
    } finally {
      setBusyAction(null)
    }
  }

  const canConfirm = decision.isConfirmed !== true && decision.isCanceled !== true
  const canCancel = decision.isCanceled !== true
  const isBusy = busyAction !== null || isRefreshingDecision
  const shouldShowActions = hasLoadedPersistedDecision && decision.currentStatus !== 'canceled'

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
        <strong style={{ fontSize: 14 }}>Order status</strong>
        <span style={{ color: 'var(--theme-elevation-600)', fontSize: 13 }}>
          Accept or cancel the order, notify the customer, and generate the invoice PDF.
        </span>
      </div>

      <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
        <div>
          <strong>Status:</strong> {getStatusLabel(decision.currentStatus)}
        </div>
        {!hasLoadedPersistedDecision ? (
          <div style={{ color: 'var(--theme-elevation-600)' }}>Loading saved status...</div>
        ) : null}
        {decision.orderId ? (
          <div>
            <strong>Order ID:</strong> {decision.orderId}
          </div>
        ) : null}
        {decision.confirmedAt ? (
          <div>
            <strong>Accepted:</strong> {formatTimestamp(decision.confirmedAt)}
          </div>
        ) : null}
        {decision.canceledAt ? (
          <div>
            <strong>Canceled:</strong> {formatTimestamp(decision.canceledAt)}
          </div>
        ) : null}
      </div>

      {shouldShowActions ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {canConfirm ? (
            <button
              type="button"
              onClick={() => handleAction('confirm')}
              disabled={isBusy}
              style={{
                border: '1px solid transparent',
                borderRadius: 999,
                padding: '10px 16px',
                background: isBusy ? 'var(--theme-elevation-150)' : '#111111',
                color: isBusy ? 'var(--theme-elevation-700)' : '#ffffff',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {busyAction === 'confirm' ? 'Sending...' : isRefreshingDecision ? 'Refreshing...' : 'Accept'}
            </button>
          ) : null}

          {canCancel ? (
            <button
              type="button"
              onClick={() => handleAction('cancel')}
              disabled={isBusy}
              style={{
                border: '1px solid #d8b2a8',
                borderRadius: 999,
                padding: '10px 16px',
                background: isBusy ? 'var(--theme-elevation-150)' : '#fff5f3',
                color: isBusy ? 'var(--theme-elevation-700)' : '#9f2d20',
                cursor: isBusy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {busyAction === 'cancel' ? 'Sending...' : isRefreshingDecision ? 'Refreshing...' : 'Cancel'}
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleInvoiceDownload}
            disabled={isBusy}
            style={{
              border: '1px solid var(--theme-elevation-300)',
              borderRadius: 999,
              padding: '10px 16px',
              background: isBusy ? 'var(--theme-elevation-150)' : 'var(--theme-elevation-0)',
              color: 'var(--theme-text)',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {busyAction === 'invoice' ? 'Generating...' : isRefreshingDecision ? 'Refreshing...' : 'Generate Invoice PDF'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
