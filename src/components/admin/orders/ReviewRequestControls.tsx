'use client'

import { useEffect, useRef, useState } from 'react'
import { toast, useDocumentInfo } from '@payloadcms/ui'

export default function ReviewRequestControls() {
  const { data } = useDocumentInfo()
  const [sentAt, setSentAt] = useState<string | null>(data?.reviewRequestSentAt || null)
  const [busy, setBusy] = useState(false)
  const sending = useRef(false)
  useEffect(() => { setSentAt(data?.reviewRequestSentAt || null) }, [data?.id, data?.reviewRequestSentAt])
  if (!data?.id) return null
  const disabled = busy || Boolean(sentAt) || !data.isConfirmed || data.isCanceled || ['failed', 'canceled'].includes(data.paymentStatus)
  const send = async () => {
    if (disabled || sending.current) return
    sending.current = true
    setBusy(true)
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(data.id)}/request-review`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Nepodařilo se odeslat žádost o hodnocení.')
      setSentAt(result.sentAt)
      toast.success(result.alreadySent ? 'Žádost již byla odeslána.' : 'Žádost o hodnocení byla odeslána zákazníkovi.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nepodařilo se odeslat žádost.')
    } finally {
      sending.current = false
      setBusy(false)
    }
  }
  return (
    <div style={{ padding: 16, border: '1px solid var(--theme-elevation-150)', borderRadius: 12, display: 'grid', gap: 12 }}>
      <strong style={{ fontSize: 14 }}>Hodnocení nákupu</strong>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--theme-elevation-600)' }}>
        Po doručení můžete zákazníkovi poslat krátké poděkování s odkazem na hodnocení zakoupeného produktu. Žádost odešleme jen jednou.
      </p>
      <span style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{data.customerEmail}</span>
      <button type="button" onClick={send} disabled={disabled} style={{ padding: '12px 16px', border: '1px solid #d8cdc0', borderRadius: 4, background: disabled ? 'var(--theme-elevation-100)' : '#fffdf9', color: disabled ? 'var(--theme-elevation-500)' : '#111', cursor: disabled ? 'default' : 'pointer' }}>
        {busy ? 'Odesílám…' : sentAt ? 'Žádost odeslána' : 'Požádat o hodnocení'}
      </button>
      {sentAt && <span role="status" style={{ fontSize: 12 }}>Odesláno {new Date(sentAt).toLocaleString('cs-CZ')}</span>}
    </div>
  )
}
