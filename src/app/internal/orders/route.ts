import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { createOrder } from '@/lib/orders'
import { getInternalUnauthorizedResponse, isInternalRequestAuthorized } from '@/lib/internal-api'

export const runtime = 'nodejs'

export const POST = async (request: Request) => {
  if (!isInternalRequestAuthorized(request)) {
    return getInternalUnauthorizedResponse()
  }

  try {
    const payload = await getPayload({
      config: configPromise,
    })

    const input = await request.json()
    const order = await createOrder(payload, input)

    return Response.json(order, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create order.'
    return Response.json({ error: message }, { status: 400 })
  }
}
