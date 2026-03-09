import 'dotenv/config'

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import {
  buildGoogleMerchantXml,
  getPayloadApiUrl,
  getSiteUrl,
  mapPayloadFeedProducts,
  type PayloadFeedProductDoc,
} from '../lib/google-merchant-feed'
import config from '../payload.config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.resolve(dirname, '../../../public/feeds')
const outputFile = path.join(outputDir, 'Google-Feed.xml')

async function main() {
  const payload = await getPayload({ config })
  const payloadBaseUrl = getPayloadApiUrl()
  const siteUrl = getSiteUrl()

  const result = await payload.find({
    collection: 'products',
    where: {
      status: {
        equals: 'published',
      },
    },
    depth: 2,
    limit: 500,
    sort: '-updatedAt',
  })

  const docs = Array.isArray(result.docs) ? (result.docs as PayloadFeedProductDoc[]) : []
  const products = mapPayloadFeedProducts(docs, payloadBaseUrl)
  const xml = buildGoogleMerchantXml(products, siteUrl)

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputFile, xml, 'utf8')

  console.log(`Google Merchant XML generated: ${outputFile}`)
  console.log(`Published products exported: ${products.length}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Google Merchant feed generation failed:', error)
    process.exit(1)
  })
