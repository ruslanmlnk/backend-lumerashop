import 'dotenv/config'

import { getPayload } from 'payload'

import { isCashOnDeliveryShippingMethod, SHIPPING_METHOD_PRESETS } from '../data/shipping-methods'
import config from '../payload.config'

type ShippingMethodDoc = {
  id: number | string
  methodId?: string | null
}

async function seedShippingMethods() {
  const payload = await getPayload({ config })

  const existingDocs = await payload.find({
    collection: 'shipping-methods',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
  })

  const existingByMethodId = new Map<string, ShippingMethodDoc>()

  for (const doc of existingDocs.docs as ShippingMethodDoc[]) {
    const methodId = typeof doc.methodId === 'string' ? doc.methodId.trim() : ''
    if (methodId) {
      existingByMethodId.set(methodId, doc)
    }
  }

  for (const method of SHIPPING_METHOD_PRESETS) {
    const data = {
      isActive: true,
      methodId: method.id,
      price: isCashOnDeliveryShippingMethod(method) ? 89 : method.price,
      sortOrder: method.sortOrder,
    }

    const existing = existingByMethodId.get(method.id)

    if (existing) {
      await payload.update({
        collection: 'shipping-methods',
        id: existing.id,
        data,
        depth: 0,
        overrideAccess: true,
      } as never)
      continue
    }

    await payload.create({
      collection: 'shipping-methods',
      data,
      depth: 0,
      overrideAccess: true,
    } as never)
  }

  console.log(`Seeded ${SHIPPING_METHOD_PRESETS.length} shipping methods.`)
}

seedShippingMethods()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
