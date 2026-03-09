import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../payload.config'
import { SHIPPING_METHOD_PRESETS } from '../../../frontend/data/shipping-methods'

async function main() {
  const payload = await getPayload({ config })
  const existing = await payload.find({
    collection: 'shipping-methods',
    limit: 100,
    depth: 0,
  })

  const existingMap = new Map(
    existing.docs.map((doc) => [doc.methodId, doc]),
  )

  let createdCount = 0
  let updatedCount = 0

  for (const method of SHIPPING_METHOD_PRESETS) {
    const current = existingMap.get(method.id)

    if (current) {
      await payload.update({
        collection: 'shipping-methods',
        id: current.id,
        data: {
          sortOrder: method.sortOrder,
        },
      })

      updatedCount += 1
      continue
    }

    await payload.create({
      collection: 'shipping-methods',
      data: {
        methodId: method.id,
        price: method.price,
        isActive: true,
        sortOrder: method.sortOrder,
      },
    })

    createdCount += 1
  }

  console.log(`Shipping methods seeded. Created: ${createdCount}, Updated: ${updatedCount}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Shipping method seed failed:', error)
    process.exit(1)
  })
