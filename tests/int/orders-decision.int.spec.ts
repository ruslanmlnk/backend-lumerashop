import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { getOrderDecision } from '@/lib/orders'

const createPayload = (result: unknown) =>
  ({
    findByID: vi.fn().mockResolvedValue(result),
  }) as unknown as Payload

describe('getOrderDecision', () => {
  it('returns the persisted confirmed status', async () => {
    const payload = createPayload({
      id: 42,
      orderId: 'LMR-42',
      isConfirmed: true,
      confirmedAt: '2026-03-26T09:00:00.000Z',
      confirmationEmailSentAt: '2026-03-26T09:00:01.000Z',
    })

    await expect(getOrderDecision(payload, 42)).resolves.toMatchObject({
      orderId: 'LMR-42',
      isConfirmed: true,
      confirmedAt: '2026-03-26T09:00:00.000Z',
      currentStatus: 'confirmed',
    })
  })

  it('gives canceled status precedence over confirmed', async () => {
    const payload = createPayload({
      id: 99,
      orderId: 'LMR-99',
      isConfirmed: true,
      confirmedAt: '2026-03-26T09:00:00.000Z',
      isCanceled: true,
      canceledAt: '2026-03-26T10:00:00.000Z',
      cancellationEmailSentAt: '2026-03-26T10:00:01.000Z',
    })

    await expect(getOrderDecision(payload, 99)).resolves.toMatchObject({
      orderId: 'LMR-99',
      isCanceled: true,
      canceledAt: '2026-03-26T10:00:00.000Z',
      currentStatus: 'canceled',
    })
  })

  it('returns null when the order does not exist', async () => {
    const payload =
      ({
        findByID: vi.fn().mockRejectedValue(new Error('Not found')),
      }) as unknown as Payload

    await expect(getOrderDecision(payload, 1234)).resolves.toBeNull()
  })
})
