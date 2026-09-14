import nodemailer from 'nodemailer'

export type ReviewRequestProduct = { name: string; slug: string }
export type ReviewRequestEmail = {
  customerEmail: string
  orderId: string
  products: ReviewRequestProduct[]
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!)

export function buildReviewRequestEmail(order: ReviewRequestEmail) {
  const products = [...new Map(order.products.filter((item) => item.slug.trim()).map((item) => [item.slug, item])).values()]
  if (!products.length) throw new Error('Objednávka nemá žádný dostupný produkt k hodnocení.')
  const productUrl = (slug: string) => `https://lumerashop.cz/product/${encodeURIComponent(slug)}#reviews`
  const subject = 'Jak se vám líbí váš nákup z Lumera?'
  const text = [
    'Dobrý den,', '',
    `děkujeme za váš nákup v Lumera (objednávka ${order.orderId}). Doufáme, že vám dělá radost.`, '',
    'Pokud máte chvilku a chuť, budeme rádi za pár slov o vaší zkušenosti. Vaše upřímné hodnocení pomůže i dalším zákazníkům při výběru.', '',
    ...products.map((item) => `${item.name}\nNapsat hodnocení: ${productUrl(item.slug)}`), '',
    'Hodnocení je zcela dobrovolné. Pokud jste ho už napsali, děkujeme — nic dalšího není potřeba.', '',
    'Děkujeme za váš čas,\ntým Lumera',
  ].join('\n')
  const html = `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;background:#f5f1eb;color:#111111;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">Pár slov od vás pro nás hodně znamená. Jen pokud máte chuť.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1eb"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#fffdf9;border:1px solid #e5ddd2">
<tr><td align="center" style="padding:34px 24px 28px;border-bottom:1px solid #e5ddd2"><a href="https://lumerashop.cz" style="font-family:Georgia,'Times New Roman',serif;font-size:34px;letter-spacing:7px;color:#111111;text-decoration:none">LUMERA</a><div style="padding-top:10px;font-size:10px;letter-spacing:2px;color:#756b60">KOUSEK ITÁLIE, KAŽDÝ DEN</div></td></tr>
<tr><td style="padding:34px 28px 12px"><h1 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.2;font-weight:normal">Dělá vám váš nákup radost?</h1>
<p style="font-size:15px;line-height:1.8;margin:0 0 16px">Dobrý den,<br>děkujeme, že jste si vybrali Lumera. Doufáme, že vám váš nový kousek dělá radost.</p>
<p style="font-size:15px;line-height:1.8;margin:0 0 24px;color:#5f584e">Pokud máte chvilku a chuť, budeme rádi za pár slov o vaší zkušenosti. Vaše upřímné hodnocení pomůže i dalším zákazníkům při výběru.</p>
${products.map((item) => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e5ddd2"><tr><td style="padding:24px 0"><p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.4">${escapeHtml(item.name)}</p><table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#111111" style="border-radius:3px;text-align:center"><a href="${escapeHtml(productUrl(item.slug))}" style="display:inline-block;padding:15px 24px;border:1px solid #111111;border-radius:3px;font-size:14px;color:#ffffff;text-decoration:none;mso-padding-alt:0;text-underline-color:#111111">Napsat hodnocení</a></td></tr></table></td></tr></table>`).join('')}
<p style="font-size:13px;line-height:1.7;color:#756b60;margin:6px 0 24px">Hodnocení je zcela dobrovolné. Pokud jste ho už napsali, děkujeme — nic dalšího není potřeba.</p>
<p style="font-size:15px;line-height:1.8;margin:0 0 24px">Děkujeme za váš čas,<br><span style="font-family:Georgia,'Times New Roman',serif;font-size:21px">tým Lumera</span></p></td></tr>
<tr><td style="padding:20px 28px;background:#f8f5ef;border-top:1px solid #e5ddd2;font-size:12px;line-height:1.8;color:#756b60">K vašemu nákupu č. ${escapeHtml(order.orderId)}<br><a href="https://lumerashop.cz" style="color:#756b60;text-decoration:underline">lumerashop.cz</a></td></tr>
</table></td></tr></table></body></html>`
  return { subject, text, html }
}

export async function sendReviewRequestEmail(order: ReviewRequestEmail) {
  const body = buildReviewRequestEmail(order)
  const host = process.env.SMTP_HOST?.trim()
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim()
  const secure = /^(1|true|yes|on)$/i.test(process.env.SMTP_SECURE?.trim() || '')
  const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587))
  if (!host || !from || !Number.isInteger(port) || port <= 0) throw new Error('SMTP není nakonfigurováno.')
  const recipient = order.customerEmail.trim()
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(recipient)) throw new Error('U objednávky chybí platný e-mail zákazníka.')
  const transport = nodemailer.createTransport({
    host, port, secure,
    auth: process.env.SMTP_USER || process.env.SMTP_PASS ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 15000, socketTimeout: 30000,
  })
  const result = await transport.sendMail({ from, to: recipient, ...body })
  if (result.rejected?.length) throw new Error('Poštovní server odmítl příjemce.')
  return result
}
