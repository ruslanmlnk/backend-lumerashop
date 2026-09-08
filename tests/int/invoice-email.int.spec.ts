import { afterEach, describe, expect, it, vi } from 'vitest'

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn().mockResolvedValue({}) }))
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }))

import { sendInvoiceEmailToCustomer } from '@/lib/customer-order-confirmation-email'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('invoice email', () => {
  const invoice = { data: Buffer.from('%PDF-stored'), fileName: 'LMR-7-faktura.pdf', contentType: 'application/pdf' }

  it('sends the exact stored PDF to the customer with Czech copy', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.test')
    vi.stubEnv('SMTP_FROM', 'shop@example.test')
    await sendInvoiceEmailToCustomer({ customerEmail: 'customer@example.test', orderId: 'LMR-7', invoiceNumber: '20260001' }, invoice)
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'customer@example.test',
      subject: 'Lumera – faktura č. 20260001',
      attachments: [{ filename: invoice.fileName, content: invoice.data, contentType: invoice.contentType }],
    }))
  })

  it('does not send without a customer email', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.test')
    vi.stubEnv('SMTP_FROM', 'shop@example.test')
    await expect(sendInvoiceEmailToCustomer({}, invoice)).rejects.toThrow('chybí e-mail')
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('propagates SMTP failures instead of reporting success', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.test')
    vi.stubEnv('SMTP_FROM', 'shop@example.test')
    sendMail.mockRejectedValueOnce(new Error('SMTP failure'))
    await expect(sendInvoiceEmailToCustomer({ customerEmail: 'customer@example.test' }, invoice)).rejects.toThrow('SMTP failure')
  })
})
