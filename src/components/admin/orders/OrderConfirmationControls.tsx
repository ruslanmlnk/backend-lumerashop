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
    return 'Zrušeno'
  }

  if (status === 'confirmed') {
    return 'Potvrzeno'
  }

  return 'Čeká na rozhodnutí'
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
        throw new Error(payload.error || 'Nepodařilo se načíst uložený stav objednávky.')
      }

      applyDecision(readOrderDecisionState(payload))
    } catch (error) {
      console.error('Nepodařilo se obnovit stav rozhodnutí objednávky.', error)
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
        throw new Error(payload.error || `Nepodařilo se ${action === 'confirm' ? 'potvrdit' : 'zrušit'} objednávku.`)
      }

      const nextDecision = readOrderDecisionState(payload)
      applyDecision(nextDecision)
      setHasLoadedPersistedDecision(true)
      void refreshDecision(docId)

      if (action === 'confirm') {
        toast.success(nextDecision.alreadyConfirmed ? 'Objednávka už byla potvrzena.' : 'Objednávka byla potvrzena a e-mail byl odeslán.')
      } else {
        toast.success(nextDecision.alreadyCanceled ? 'Objednávka už byla zrušena.' : 'Objednávka byla zrušena a e-mail byl odeslán.')
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : action === 'confirm'
            ? 'Nepodařilo se potvrdit objednávku.'
            : 'Nepodařilo se zrušit objednávku.'
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
        throw new Error(payload.error || 'Nepodařilo se připravit PDF faktury.')
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

      toast.success('Faktura PDF je připravená.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nepodařilo se připravit PDF faktury.'
      toast.error(message)
    } finally {
      setBusyAction(null)
    }
  }

  const canConfirm = decision.isConfirmed !== true && decision.isCanceled !== true
  const canCancel = decision.isCanceled !== true
  const isDecisionBusy = busyAction !== null || isRefreshingDecision
  const isInvoiceBusy = busyAction !== null
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
        <strong style={{ fontSize: 14 }}>Stav objednávky</strong>
        <span style={{ color: 'var(--theme-elevation-600)', fontSize: 13 }}>
          Potvrďte nebo zrušte objednávku, informujte zákazníka a stáhněte fakturu PDF pro další použití.
        </span>
      </div>

      <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
        <div>
          <strong>Stav:</strong> {getStatusLabel(decision.currentStatus)}
        </div>
        {!hasLoadedPersistedDecision ? (
          <div style={{ color: 'var(--theme-elevation-600)' }}>Načítám uložený stav...</div>
        ) : null}
        {decision.orderId ? (
          <div>
            <strong>Číslo objednávky:</strong> {decision.orderId}
          </div>
        ) : null}
        {decision.confirmedAt ? (
          <div>
            <strong>Potvrzeno:</strong> {formatTimestamp(decision.confirmedAt)}
          </div>
        ) : null}
        {decision.canceledAt ? (
          <div>
            <strong>Zrušeno:</strong> {formatTimestamp(decision.canceledAt)}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button
          type="button"
          onClick={handleInvoiceDownload}
          disabled={isInvoiceBusy}
          style={{
            border: '1px solid var(--theme-elevation-300)',
            borderRadius: 999,
            padding: '10px 16px',
            background: isInvoiceBusy ? 'var(--theme-elevation-150)' : 'var(--theme-elevation-0)',
            color: 'var(--theme-text)',
            cursor: isInvoiceBusy ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {busyAction === 'invoice' ? 'Připravuji...' : 'Stáhnout fakturu PDF'}
        </button>
      </div>

      {shouldShowActions ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {canConfirm ? (
            <button
              type="button"
              onClick={() => handleAction('confirm')}
              disabled={isDecisionBusy}
              style={{
                border: '1px solid transparent',
                borderRadius: 999,
                padding: '10px 16px',
                background: isDecisionBusy ? 'var(--theme-elevation-150)' : '#111111',
                color: isDecisionBusy ? 'var(--theme-elevation-700)' : '#ffffff',
                cursor: isDecisionBusy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {busyAction === 'confirm' ? 'Odesílám...' : isRefreshingDecision ? 'Obnovuji...' : 'Potvrdit'}
            </button>
          ) : null}

          {canCancel ? (
            <button
              type="button"
              onClick={() => handleAction('cancel')}
              disabled={isDecisionBusy}
              style={{
                border: '1px solid #d8b2a8',
                borderRadius: 999,
                padding: '10px 16px',
                background: isDecisionBusy ? 'var(--theme-elevation-150)' : '#fff5f3',
                color: isDecisionBusy ? 'var(--theme-elevation-700)' : '#9f2d20',
                cursor: isDecisionBusy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {busyAction === 'cancel' ? 'Odesílám...' : isRefreshingDecision ? 'Obnovuji...' : 'Zrušit'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
