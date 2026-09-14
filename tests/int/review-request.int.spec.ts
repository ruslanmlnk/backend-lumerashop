import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn().mockResolvedValue({ accepted: ['customer@example.test'] }) }))
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }))

import { buildReviewRequestEmail } from '@/lib/review-request-email'
import { sendOrderReviewRequest } from '@/lib/order-review-request'

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

function fixture(overrides = {}) {
  vi.stubEnv('SMTP_HOST', 'smtp.example.test')
  vi.stubEnv('SMTP_FROM', 'shop@example.test')
  const order = { id: 7, orderId: 'LMR-7', customerEmail: 'customer@example.test', isConfirmed: true,
    paymentStatus: 'paid', items: [{ name: 'Stella', slug: 'old-slug', product: { slug: 'stella-taupe' } }], ...overrides }
  const payload = {
    findByID: vi.fn().mockResolvedValue(order),
    update: vi.fn().mockResolvedValue(order),
    db: { drizzle: { execute: vi.fn().mockResolvedValue({ rows: [{ id: 7 }] }) } },
  }
  const req = { user: { id: 1, role: 'admin' }, payload } as unknown as PayloadRequest
  return { req, payload }
}

describe('review requests', () => {
  it('links each distinct purchased product to reviews and escapes HTML', () => {
    const body = buildReviewRequestEmail({ customerEmail: 'customer@example.test', orderId: '<7>',
      products: [{ name: '<Stella>', slug: 'stella' }, { name: '<Stella>', slug: 'stella' }, { name: 'Tina', slug: 'tina' }] })
    expect(body.html).toContain('&lt;Stella&gt;')
    expect(body.html).toContain('&lt;7&gt;')
    expect(body.html.match(/>Napsat hodnocení</g)).toHaveLength(2)
    expect(body.text).toContain('https://lumerashop.cz/product/tina#reviews')
    expect(body.html).toContain('Hodnocení je zcela dobrovolné')
  })

  it('sends to the saved customer address, uses the current product slug, and records success', async () => {
    const { req, payload } = fixture()
    const result = await sendOrderReviewRequest(req, 7)
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'customer@example.test', html: expect.stringContaining('/product/stella-taupe#reviews') }))
    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({ data: { reviewRequestSentAt: result.sentAt }, req, overrideAccess: true }))
  })

  it('rejects non-admin callers before reading the order or sending', async () => {
    const { req, payload } = fixture()
    req.user = null
    await expect(sendOrderReviewRequest(req, 7)).rejects.toThrow('Přístup')
    expect(payload.findByID).not.toHaveBeenCalled()
    expect(sendMail).not.toHaveBeenCalled()
  })

  it.each([{ isCanceled: true }, { isConfirmed: false }, { paymentStatus: 'failed' }, { items: [] }])('does not send for ineligible orders: %j', async (overrides) => {
    const { req, payload } = fixture(overrides)
    await expect(sendOrderReviewRequest(req, 7)).rejects.toThrow()
    expect(sendMail).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('does not resend a previously sent request', async () => {
    const { req } = fixture({ reviewRequestSentAt: '2026-09-14T12:00:00.000Z' })
    expect(await sendOrderReviewRequest(req, 7)).toEqual({ sentAt: '2026-09-14T12:00:00.000Z', alreadySent: true })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('does not send when another server already claimed the order', async () => {
    const { req, payload } = fixture()
    payload.db.drizzle.execute.mockResolvedValueOnce({ rows: [] })
    await expect(sendOrderReviewRequest(req, 7)).rejects.toThrow('zpracovává')
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('releases the claim on SMTP failure without recording success', async () => {
    const { req, payload } = fixture()
    sendMail.mockRejectedValueOnce(new Error('SMTP unavailable'))
    await expect(sendOrderReviewRequest(req, 7)).rejects.toThrow('SMTP unavailable')
    expect(payload.db.drizzle.execute).toHaveBeenCalledTimes(2)
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('retains the claim if persistence fails after sending, preventing a duplicate email', async () => {
    const { req, payload } = fixture()
    payload.update.mockRejectedValueOnce(new Error('Database unavailable'))
    await expect(sendOrderReviewRequest(req, 7)).rejects.toThrow('Database unavailable')
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(payload.db.drizzle.execute).toHaveBeenCalledTimes(1)
  })
})
