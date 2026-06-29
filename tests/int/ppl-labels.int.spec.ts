import type { Payload } from 'payload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type MockPayload = Payload & {
  findByID: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

const OLD_ENV = { ...process.env }

const createOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 9,
  orderId: 'LMR-9',
  provider: 'cash-on-delivery',
  currency: 'CZK',
  total: 1290,
  customerEmail: 'customer@example.com',
  customerPhone: '+420 777 123 456',
  customerFirstName: 'Jan',
  customerLastName: 'Novak',
  shippingAddress: {
    address: 'Lisabonska 2394',
    city: 'Praha',
    zip: '190 00',
    country: 'CZ',
  },
  shipping: {
    methodId: 'ppl-courier-cod',
    label: 'PPL - kuryr na dobirku',
    cashOnDelivery: true,
  },
  ...overrides,
})

const createPayload = (order: unknown) =>
  ({
    findByID: vi.fn().mockResolvedValue(order),
    update: vi.fn().mockResolvedValue(order),
  }) as unknown as MockPayload

const setRequiredPplEnv = () => {
  process.env.PPL_CLIENT_ID = 'client-id'
  process.env.PPL_CLIENT_SECRET = 'client-secret'
  process.env.PPL_SENDER_NAME = 'Lumera Shop'
  process.env.PPL_SENDER_STREET = 'Lisabonska 2394'
  process.env.PPL_SENDER_CITY = 'Praha'
  process.env.PPL_SENDER_ZIP = '19000'
  process.env.PPL_SENDER_COUNTRY = 'CZ'
  process.env.PPL_SENDER_EMAIL = 'info@example.com'
  process.env.PPL_SENDER_PHONE = '+420777000111'
  process.env.PPL_POLL_ATTEMPTS = '1'
  process.env.PPL_POLL_INTERVAL_MS = '1'
}

describe('syncPplOrderLabel', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...OLD_ENV }
    setRequiredPplEnv()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...OLD_ENV }
  })

  it('uses complete label URLs returned on the batch status root', async () => {
    const order = createOrder()
    const payload = createPayload(order)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'token', expires_in: 1800 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('', {
          status: 201,
          headers: { Location: 'https://api.dhl.com/ecs/ppl/myapi2/shipment/batch/batch-123' },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          importState: 'Complete',
          completeLabel: {
            labelUrls: [' https://api.dhl.com/ecs/ppl/myapi2/shipment/batch/batch-123/label '],
          },
          items: [
            {
              importState: 'Complete',
              referenceId: 'LMR-9',
              shipmentNumber: '40512345678',
            },
          ],
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    const { syncPplOrderLabel } = await import('@/lib/ppl-labels')
    const result = await syncPplOrderLabel(payload, 9)

    expect(result.labelReady).toBe(true)
    expect(result.shipment.completeLabelUrl).toBe('https://api.dhl.com/ecs/ppl/myapi2/shipment/batch/batch-123/label')
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          pplShipment: expect.objectContaining({
            batchId: 'batch-123',
            completeLabelUrl: 'https://api.dhl.com/ecs/ppl/myapi2/shipment/batch/batch-123/label',
            shipmentNumber: '40512345678',
          }),
        },
      }),
    )
  })

  it('keeps the PPL authentication error details', async () => {
    const order = createOrder()
    const payload = createPayload(order)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        Response.json(
          {
            error_description: 'Invalid client credentials',
          },
          { status: 401 },
        ),
      ),
    )

    const { syncPplOrderLabel } = await import('@/lib/ppl-labels')

    await expect(syncPplOrderLabel(payload, 9)).rejects.toThrow(
      'Failed to authenticate with PPL (status: 401) - Invalid client credentials',
    )
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          pplShipment: expect.objectContaining({
            lastError: expect.stringContaining('Invalid client credentials'),
          }),
        },
      }),
    )
  })

  it('accepts a batch ID returned as JSON from shipment creation', async () => {
    const order = createOrder()
    const payload = createPayload(order)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ access_token: 'token', expires_in: 1800 }))
      .mockResolvedValueOnce(Response.json({ batchId: 'batch-json-456' }, { status: 201 }))
      .mockResolvedValueOnce(
        Response.json({
          importState: 'Complete',
          items: [
            {
              importState: 'Complete',
              referenceId: 'LMR-9',
              labelUrl: 'https://api.dhl.com/ecs/ppl/myapi2/shipment/batch/batch-json-456/label',
            },
          ],
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    const { syncPplOrderLabel } = await import('@/lib/ppl-labels')
    const result = await syncPplOrderLabel(payload, 9)

    expect(result.shipment.batchId).toBe('batch-json-456')
    expect(result.labelReady).toBe(true)
  })
})
