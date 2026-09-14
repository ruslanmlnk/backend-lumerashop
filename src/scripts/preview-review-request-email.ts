import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { buildReviewRequestEmail, sendReviewRequestEmail } from '../lib/review-request-email'

// Preview by default. Send one sample only when an explicit --send-to=address is supplied.
const recipient = process.argv.find((arg) => arg.startsWith('--send-to='))?.slice('--send-to='.length)
const order = {
  customerEmail: recipient || 'preview@example.test',
  orderId: 'TEST – ukázka e-mailu',
  products: [{ name: 'Damská shopper kabelka z pravé kůže Stella taupe', slug: 'damska-shopper-kabelka-z-prave-kuze-stella-taupe' }],
}
const body = buildReviewRequestEmail(order)
const output = new URL('../../../output/review-request/', import.meta.url)
await mkdir(output, { recursive: true })
await writeFile(new URL('preview.html', output), body.html, 'utf8')
await writeFile(new URL('preview.txt', output), body.text, 'utf8')
console.log('Review request preview generated.')
if (recipient) {
  const result = await sendReviewRequestEmail(order)
  console.log(JSON.stringify({ accepted: result.accepted, rejected: result.rejected, messageId: result.messageId }))
}
