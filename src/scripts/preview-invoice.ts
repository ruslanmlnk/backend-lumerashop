import { mkdir, writeFile } from 'node:fs/promises'
import type { Payload } from 'payload'
import { downloadOrderInvoice } from '../lib/order-invoice-pdf'

// Local fixtures only: no Payload initialization, database allocation, or email.
const output = new URL('../../../output/pdf/', import.meta.url)
await mkdir(output, { recursive: true })
for (const long of [false, true]) {
  const order = {
    id: 'preview', orderId: 'LMR-TEST-20260003', invoiceNumber: '20260003',
    createdAt: '2026-10-10T10:00:00.000Z', provider: 'global-payments', paymentStatus: 'paid',
    confirmedAt: '2026-10-11T10:00:00.000Z',
    currency: 'CZK', total: long ? 30250 * 32 : 30250,
    billing: { companyName: 'Ukázková společnost s.r.o.', address: 'Ukázková 15', city: 'Praha', zip: '130 00', country: 'Česká republika' },
    items: Array.from({ length: long ? 32 : 1 }, (_, i) => ({
      sku: String(13015 + i), name: long ? `Dámská kožená kabelka s nastavitelným ramenním popruhem a ozdobným kováním – tmavě hnědá, varianta ${i + 1}` : 'Kabelka',
      quantity: 2, unitPrice: 15125, lineTotal: 30250,
    })),
  }
  const payload = { findByID: async () => order, update: async () => order } as unknown as Payload
  const result = await downloadOrderInvoice(payload, 'preview', { persistIfMissing: true })
  if (!result) throw new Error('Preview generation failed')
  const name = long ? 'Faktura_20260003-multiple-pages.pdf' : 'Faktura_20260003-preview.pdf'
  await writeFile(new URL(name, output), result.data)
  console.log(name)
}
