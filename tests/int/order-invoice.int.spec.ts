import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { downloadOrderInvoice } from '@/lib/order-invoice-pdf'

const createPayload = (
  result: unknown,
  options?: { lockedInvoiceNumber?: string | null; sequence?: number },
) => {
  const invoiceQuery = vi.fn(async (query: string) => {
    if (query.startsWith('SELECT')) {
      return { rows: [{ invoice_number: options?.lockedInvoiceNumber ?? null }] }
    }

    if (query.includes('RETURNING "last_value"')) {
      return { rows: [{ last_value: options?.sequence ?? 1 }] }
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

    const result = await downloadOrderInvoice(payload, 7)

    expect(result).not.toBeNull()
    expect(result?.contentType).toBe('application/pdf')
    expect(result?.fileName).toBe('LMR-7-faktura.pdf')
    expect(Buffer.from(result?.data || []).subarray(0, 4).toString()).toBe('%PDF')
    expect(payload.update).toHaveBeenCalledTimes(1)
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ invoiceNumber: `${new Date().getFullYear()}0001` }),
      }),
    )
  })

  it('starts a separate sequence at one for a new year', async () => {
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
      })

      await downloadOrderInvoice(payload, 9)

      expect(payload.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ invoiceNumber: '20270001' }),
        }),
      )
      expect(payload.invoiceQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "invoice_counters"'),
        [2027],
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
  })
})
