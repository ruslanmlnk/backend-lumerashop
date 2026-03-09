import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getInternalUnauthorizedResponse, isInternalRequestAuthorized } from '@/lib/internal-api'
import { getOrderSummary, updateOrder } from '@/lib/orders'

export const runtime = 'nodejs'

export const GET = async (
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) => {
  if (!isInternalRequestAuthorized(request)) {
    return getInternalUnauthorizedResponse()
  }

  const { orderId } = await params

  try {
    const payload = await getPayload({
      config: configPromise,
    })

    const order = await getOrderSummary(payload, orderId)
    if (!order) {
      return Response.json({ error: 'Order not found.' }, { status: 404 })
    }

    return Response.json(order)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch order.'
    return Response.json({ error: message }, { status: 400 })
  }
}

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) => {
  if (!isInternalRequestAuthorized(request)) {
    return getInternalUnauthorizedResponse()
  }

  const { orderId } = await params

  try {
    const payload = await getPayload({
      config: configPromise,
    })

    const input = await request.json()
    const order = await updateOrder(payload, orderId, input)

    if (!order) {
      return Response.json({ error: 'Order not found.' }, { status: 404 })
    }

    return Response.json(order)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order.'
    return Response.json({ error: message }, { status: 400 })
  }
}
