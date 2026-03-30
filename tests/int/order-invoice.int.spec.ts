import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { downloadOrderInvoice } from '@/lib/order-invoice-pdf'

const createPayload = (result: unknown) =>
  ({
    findByID: vi.fn().mockResolvedValue(result),
  }) as unknown as Payload

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
  })

  it('returns null when the order does not exist', async () => {
    const payload =
      ({
        findByID: vi.fn().mockRejectedValue(new Error('Not found')),
      }) as unknown as Payload

    await expect(downloadOrderInvoice(payload, 404)).resolves.toBeNull()
  })
})
