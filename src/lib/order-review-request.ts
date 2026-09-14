import type { PayloadRequest } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { buildReviewRequestEmail, sendReviewRequestEmail, type ReviewRequestProduct } from './review-request-email'

const sending = new Set<string>()

export async function sendOrderReviewRequest(req: PayloadRequest, id: string | number) {
  if (!req.user || req.user.role !== 'admin') throw new Error('Přístup odepřen.')
  const key = String(id)
  if (sending.has(key)) throw new Error('Žádost se právě odesílá.')
  sending.add(key)
  try {
    const order = await req.payload.findByID({ collection: 'orders', id, depth: 1, req, overrideAccess: false })
    if (order.reviewRequestSentAt) return { sentAt: order.reviewRequestSentAt, alreadySent: true }
    if (order.isCanceled || order.paymentStatus === 'canceled' || order.paymentStatus === 'failed') {
      throw new Error('U zrušené nebo neúspěšné objednávky nelze požádat o hodnocení.')
    }
    if (!order.isConfirmed) throw new Error('Nejprve potvrďte objednávku. O hodnocení požádejte až po doručení.')
    const products: ReviewRequestProduct[] = []
    for (const item of order.items || []) {
      const product = typeof item.product === 'object' && item.product ? item.product : null
      const slug = product?.slug || item.slug
      if (slug) products.push({ name: item.name, slug })
    }
    const email = { customerEmail: order.customerEmail, orderId: order.orderId, products }
    buildReviewRequestEmail(email)
    // Claim in one SQL statement so concurrent requests on separate servers cannot send twice.
    // This administrative write follows the explicit role and collection access checks above.
    const claim = await req.payload.db.drizzle.execute(sql`
      UPDATE "orders" SET "review_request_started_at" = NOW()
      WHERE "id" = ${order.id} AND "review_request_started_at" IS NULL AND "review_request_sent_at" IS NULL
      RETURNING "id"
    `)
    if (!claim.rows.length) throw new Error('Žádost již byla odeslána nebo se právě zpracovává. Obnovte stránku.')
    try {
      await sendReviewRequestEmail(email)
    } catch (error) {
      await req.payload.db.drizzle.execute(sql`
        UPDATE "orders" SET "review_request_started_at" = NULL
        WHERE "id" = ${order.id} AND "review_request_sent_at" IS NULL
      `)
      throw error
    }
    // Keep the claim if saving fails after SMTP acceptance: retrying must not send another email.
    const sentAt = new Date().toISOString()
    // Only this checked admin action may set the protected delivery marker.
    await req.payload.update({ collection: 'orders', id, data: { reviewRequestSentAt: sentAt }, req, overrideAccess: true })
    return { sentAt, alreadySent: false }
  } finally {
    sending.delete(key)
  }
}
