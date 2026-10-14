import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { downloadOrderInvoice, updateInvoiceNumber } from '@/lib/order-invoice-pdf'

const createPayload = (
  result: unknown,
  options?: { lockedInvoiceNumber?: string | null; maxNumber?: number },
) => {
  const invoiceQuery = vi.fn(async (query: string, values?: number[]) => {
    if (query.includes('AS "next_number"')) {
      return { rows: [{ next_number: Math.max(options?.maxNumber ?? 0, values?.[0] ?? 0) + 1 }] }
    }
    if (query.startsWith('SELECT')) {
      return { rows: [{ invoice_number: options?.lockedInvoiceNumber ?? null }] }
    }

    return { rows: [] }
  })
  const payload = {
    db: {
      pool: {
        connect: vi.fn(async () => ({
          query: invoiceQuery,
          release: vi.fn(),
        })),
      },
    },
    findByID: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockResolvedValue(result),
    invoiceQuery,
  }

  return payload as unknown as Payload & {
    findByID: ReturnType<typeof vi.fn>
    invoiceQuery: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

describe('downloadOrderInvoice', () => {
  it('does not allocate a number or generate a PDF without an explicit generation request', async () => {
    const payload = createPayload({ id: 7, orderId: 'LMR-7' })
    expect(await downloadOrderInvoice(payload, 7)).toBeNull()
    expect(await downloadOrderInvoice(payload, 7, { persistIfMissing: false })).toBeNull()
    expect(payload.invoiceQuery).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('returns a generated PDF for an existing order', async () => {
    const payload = createPayload({
      id: 7,
      orderId: 'LMR-7',
      provider: 'cash-on-delivery',
      paymentStatus: 'pending',
      createdAt: '2026-03-30T09:00:00.000Z',
      currency: 'CZK',
      total: 2287,
      shippingTotal: 0,
      customerEmail: 'customer@example.com',
      customerFirstName: 'Lumera',
      customerLastName: 'Shop',
      shippingAddress: {
        address: 'Lisabonska 2394',
        city: 'Praha',
        zip: '190 00',
        country: 'Ceska republika',
      },
      shipping: {
        label: 'Osobni odber - Lisabonska 2394, Praha (vydejni misto)',
        price: 0,
        cashOnDelivery: true,
      },
      items: [
        {
          name: 'Kozena italska kabelka Sovana tmave hneda',
          quantity: 1,
          unitPrice: 2287,
          lineTotal: 2287,
        },
      ],
    })

    const result = await downloadOrderInvoice(payload, 7, { persistIfMissing: true })

    expect(result).not.toBeNull()
    expect(result?.contentType).toBe('application/pdf')
    expect(result?.fileName).toBe('LMR-7-faktura.pdf')
    expect(Buffer.from(result?.data || []).subarray(0, 4).toString()).toBe('%PDF')
    expect(payload.update).toHaveBeenCalledTimes(1)
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ invoiceNumber: `${new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Europe/Prague' }).format(new Date())}0001` }),
      }),
    )
  })

  it('starts the current Prague year with an eight-digit number', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T23:30:00.000Z'))

    try {
      const payload = createPayload({
        id: 9,
        orderId: 'LMR-9',
        provider: 'cash-on-delivery',
        paymentStatus: 'pending',
        createdAt: '2027-01-02T09:00:00.000Z',
        currency: 'CZK',
        total: 100,
        shippingTotal: 0,
        items: [{ name: 'Test', quantity: 1, unitPrice: 100, lineTotal: 100 }],
      }, { maxNumber: 4 })

      await downloadOrderInvoice(payload, 9, { persistIfMissing: true })

      expect(payload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ invoiceNumber: '20270001' }),
        }),
      )
      expect(payload.invoiceQuery).toHaveBeenCalledWith(
        expect.stringContaining('AS "next_number"'),
        [20270000, 20279999],
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('returns null when the order does not exist', async () => {
    const payload =
      ({
        findByID: vi.fn().mockRejectedValue(new Error('Not found')),
      }) as unknown as Payload

    await expect(downloadOrderInvoice(payload, 404)).resolves.toBeNull()
  })

  it('continues the eight-digit sequence without truncation', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-12T10:00:00Z'))
    try {
      const payload = createPayload({ id: 10, orderId: 'LMR-10', items: [] }, { maxNumber: 20260003 })
      await downloadOrderInvoice(payload, 10, { persistIfMissing: true })
      expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ invoiceNumber: '20260004' }),
      }))
    } finally { vi.useRealTimers() }
  })

  it('rolls back when all four sequence digits are used', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-12T10:00:00Z'))
    try {
      const payload = createPayload({ id: 10 }, { maxNumber: 20269999 })
      await expect(downloadOrderInvoice(payload, 10, { persistIfMissing: true })).rejects.toThrow('allocate')
      expect(payload.invoiceQuery).toHaveBeenCalledWith('ROLLBACK')
      expect(payload.update).not.toHaveBeenCalled()
    } finally { vi.useRealTimers() }
  })

  it('reuses a number allocated by another request', async () => {
    const payload = createPayload({ id: 10, items: [] }, { lockedInvoiceNumber: '20260008' })
    await downloadOrderInvoice(payload, 10, { persistIfMissing: true })
    expect(payload.invoiceQuery.mock.calls.some(([sql]) => sql.includes('next_number'))).toBe(false)
    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ invoiceNumber: '20260008' }),
    }))
  })

  it('regenerates only invoice fields while preserving its number', async () => {
    const order = {
      id: 8, orderId: 'LMR-8', invoiceNumber: '20260003',
      invoiceData: Buffer.from('%PDF-old').toString('base64'),
      invoiceFileName: 'LMR-8-faktura.pdf', invoiceGeneratedAt: '2026-03-30T09:00:00Z',
      paymentStatus: 'paid', status: 'confirmed', items: [],
    }
    const payload = createPayload(order)
    const result = await downloadOrderInvoice(payload, 8, { persistIfMissing: true, regenerate: true })
    expect(Buffer.from(result!.data).subarray(0, 4).toString()).toBe('%PDF')
    expect(Buffer.from(result!.data).toString()).not.toBe('%PDF-old')
    expect(payload.invoiceQuery).not.toHaveBeenCalled()
    const data = payload.update.mock.calls[0][0].data
    expect(data.invoiceNumber).toBe('20260003')
    expect(data.invoiceGeneratedAt).not.toBe(order.invoiceGeneratedAt)
    expect(Object.keys(data).sort()).toEqual([
      'invoiceContentType', 'invoiceData', 'invoiceFileName', 'invoiceGeneratedAt', 'invoiceNumber',
    ])
    expect(order.invoiceData).toBe(Buffer.from('%PDF-old').toString('base64'))
  })

  it('returns a stored invoice without regenerating it', async () => {
    const storedPdf = Buffer.from('%PDF-stored').toString('base64')
    const payload = createPayload({
      id: 8,
      orderId: 'LMR-8',
      invoiceGeneratedAt: '2026-03-30T09:00:00.000Z',
      invoiceFileName: 'LMR-8-faktura.pdf',
      invoiceContentType: 'application/pdf',
      invoiceData: storedPdf,
    })

    const result = await downloadOrderInvoice(payload, 8, {
      persistIfMissing: false,
    })

    expect(result).not.toBeNull()
    expect(result?.fileName).toBe('LMR-8-faktura.pdf')
    expect(Buffer.from(result?.data || []).toString()).toBe('%PDF-stored')
    expect(payload.update).not.toHaveBeenCalled()
    const repeated = await downloadOrderInvoice(payload, 8, { persistIfMissing: true })
    expect(Buffer.from(repeated?.data || []).toString()).toBe('%PDF-stored')
    expect(payload.invoiceQuery).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })
})

describe('editing invoice numbers', () => {
  const originalDoc = {
    id: 7, orderId: 'LMR-7', invoiceNumber: '20260005', invoiceData: 'old-pdf',
    invoiceFileName: 'LMR-7-faktura.pdf', currency: 'CZK', total: 100,
    items: [{ name: 'Test', quantity: 1, unitPrice: 100, lineTotal: 100 }],
  }
  const edit = (invoiceNumber: string, original = originalDoc) => updateInvoiceNumber({
    data: { invoiceNumber }, originalDoc: original,
  } as unknown as Parameters<typeof updateInvoiceNumber>[0])

  it('rebuilds the stored PDF when the number is edited', async () => {
    const updated = await edit('20260004')
    expect(updated.invoiceNumber).toBe('20260004')
    expect(Buffer.from(updated.invoiceData, 'base64').subarray(0, 4).toString()).toBe('%PDF')
    expect(originalDoc.invoiceNumber).toBe('20260005')
  })

  it.each(['', '0', '-1', '1.5', 'abc', '04', '2026000003', '9007199254740992'])('rejects invalid number %s', async (value) => {
    await expect(edit(value)).rejects.toThrow()
  })

  it('requires generation before manually assigning a number', async () => {
    await expect(edit('4', { ...originalDoc, invoiceNumber: '', invoiceData: '' })).rejects.toThrow()
  })
})
