import { PDFDocument, rgb, type PDFFont } from 'pdf-lib'

type InvoiceRow = { code: string; name: string; quantity: string; net: string; rate: string; tax: string; gross: string }

// Borderless party/payment blocks and a compact merchandise table on portrait A4.
export async function renderInvoiceLayout(pdf: PDFDocument, font: PDFFont, data: {
  number: string; orderId: string; orderDate: string; issued: string
  payment: string; buyer: string[]; rows: InvoiceRow[]; net: string; tax: string; gross: string
  paid: string; remaining: string; currency: string; amountDue: number; logoPngBytes?: Uint8Array
  breakdown: { rate: string; net: string; tax: string; gross: string }[]
}, wrap: (font: PDFFont, text: string, size: number, width: number) => string[]) {
  const width = 595.28, height = 841.89, left = 29, right = width - 27
  let page = pdf.addPage([width, height])
  const ink = rgb(0.1, 0.1, 0.1), muted = rgb(0.4, 0.4, 0.4)
  const logo = data.logoPngBytes ? await pdf.embedPng(data.logoPngBytes) : undefined
  const text = (value: string, x: number, top: number, size = 9, bold = false, alignRight = false, color = ink) => {
    const actualX = alignRight ? x - font.widthOfTextAtSize(value, size) : x
    page.drawText(value, { x: actualX, y: height - top - size, font, size, color })
    if (bold) page.drawText(value, { x: actualX + 0.23, y: height - top - size, font, size, color })
  }
  const title = (continued = false) => {
    text(`FAKTURA - DAŇOVÝ DOKLAD č. ${data.number}`, right, 29, 12, true, true)
    if (continued) text('Pokračování', right, 49, 8, false, true, muted)
  }
  title()
  text('Dodavatel:', 43, 51, 8)
  ;['MAX & VLD s.r.o.', 'Děčínská 552/1', '180 00 Praha'].forEach((line, i) => text(line, 43, 65 + i * 12, 10, true))
  text('IČ:    23254246', 46, 114, 9)
  text('DIČ: CZ23254246', 46, 126, 9)
  if (logo) {
    const scale = Math.min(65 / logo.width, 58 / logo.height)
    page.drawImage(logo, { x: 240, y: height - 64 - logo.height * scale, width: logo.width * scale, height: logo.height * scale })
  }
  text('Odběratel:', 333, 56, 8)
  const buyerIdentity = data.buyer.find(line => /^IČO?:/.test(line)) || ''
  const companyId = buyerIdentity.match(/IČO?:\s*(\S+)/)?.[1]
  const vatId = buyerIdentity.match(/DIČ:\s*(\S+)/)?.[1]
  if (companyId) { text('IČ:', 410, 56, 9); text(companyId, right - 9, 56, 9, false, true) }
  if (vatId) { text('DIČ:', 410, 68, 9); text(vatId, right - 9, 68, 9, false, true) }
  let buyerBottom = 89
  data.buyer.filter(line => line !== buyerIdentity).forEach(line => {
    for (const part of wrap(font, line, 10, 215)) {
      text(part, 444 - font.widthOfTextAtSize(part, 10) / 2, buyerBottom, 10, true)
      buyerBottom += 13
    }
  })
  text('Banka:', 43, 153, 8); text('Raiffeisenbank a.s.', 100, 153, 9)
  text('IBAN:', 43, 165, 8); text('CZ4055000000003094713004', 100, 165, 9)
  text('Číslo účtu:', 43, 177, 8); text('3094713004', 100, 177, 9)
  text('Kód banky:', 221, 177, 8); text('5500', 277, 177, 9)
  text('Variabilní symbol:', 43, 189, 8); text(data.number, 221, 189, 9)
  ;['Datum vystavení:', 'Datum splatnosti:', 'Datum UZP:'].forEach((label, index) => {
    text(label, 43, 239 + index * 12, 10)
    text(data.issued, 197, 239 + index * 12, 10)
  })
  text('Forma úhrady:', 43, 292, 10)
  let paymentBottom = 292
  for (const line of wrap(font, data.payment, 9, 112)) { text(line, 204, paymentBottom, 9); paymentBottom += 12 }
  let orderBottom = Math.max(309, paymentBottom + 5)
  for (const line of wrap(font, `Objednávka č. ${data.orderId} ze dne: ${data.orderDate}`, 9, 270)) {
    text(line, 43, orderBottom, 9); orderBottom += 12
  }
  let top = Math.max(333, orderBottom + 9, buyerBottom + 15)
  const columns = [80, 151, 61, 80, 29, 64, right - left - 465]
  const cellRow = (values: string[], cellTop: number, rowHeight: number, header = false) => {
    let x = left
    values.forEach((value, i) => {
      page.drawRectangle({ x, y: height - cellTop - rowHeight, width: columns[i], height: rowHeight,
        borderColor: rgb(0.78, 0.78, 0.78), borderWidth: 0.4,
        ...(header ? { color: rgb(0.96, 0.955, 0.94) } : {}) })
      wrap(font, value, header ? 8 : 8.5, columns[i] - 10).forEach((line, n) => {
        text(line, i >= 2 ? x + columns[i] - 5 : x + 5, cellTop + 8 + n * 12, header ? 8 : 8.5, header, i >= 2)
      })
      x += columns[i]
    })
  }
  const header = () => { cellRow(['Číslo\nproduktu', 'Zboží', 'Množství', 'Cena bez DPH', '% DPH', 'DPH', 'Celkem s DPH'], top, 38, true); top += 38 }
  const nextPage = () => { page = pdf.addPage([width, height]); title(true); top = 113 }
  header()
  for (const row of data.rows) {
    const values = [row.code, row.name, row.quantity, row.net, row.rate, row.tax, row.gross]
    const lines = values.map((value, i) => wrap(font, value, 8.5, columns[i] - 10))
    let offset = 0
    const count = Math.max(...lines.map(value => value.length)), fullRowHeight = Math.max(30, count * 12 + 16)
    if (top + fullRowHeight > height - 48 && fullRowHeight <= height - 48 - 151) { nextPage(); header() }
    while (offset < count) {
      if (top + 30 > height - 48) { nextPage(); header() }
      const capacity = Math.max(1, Math.floor((height - 48 - top - 16) / 12)), take = Math.min(count - offset, capacity)
      const rowHeight = Math.max(30, take * 12 + 16)
      cellRow(lines.map(value => value.slice(offset, offset + take).join('\n')), top, rowHeight)
      top += rowHeight
      offset += take
    }
  }
  // The reference keeps a spacious product area, totals directly beneath it,
  // and VAT recapitulation near the bottom of the page.
  if (pdf.getPageCount() === 1) top = Math.max(top, 435)
  const summaryHeight = 88
  if (top + summaryHeight > height - 145) nextPage()
  top += 10
  text('Součet', 43, top, 8)
  text(data.net, 399, top, 8, false, true)
  text(data.tax, 491, top, 8, false, true)
  text(data.gross, right - 14, top, 8, false, true)
  top += 18
  text('CELKEM K ÚHRADĚ', 43, top, 10, true)
  text(data.remaining, right - 14, top, 10, true, true)
  if (data.paid !== data.remaining || data.amountDue === 0) {
    top += 20
    text('Zaplaceno', 43, top, 8, false, false, muted)
    text(data.paid, right - 14, top, 8, false, true, muted)
    top += 14
    text('Zbývá uhradit', 43, top, 8, false, false, muted)
    text(data.remaining, right - 14, top, 8, false, true, muted)
  }
  top = Math.max(top + 30, 716)
  if (top + 20 + data.breakdown.length * 14 > height - 42) { nextPage(); top = 716 }
  text(`Rekapitulace DPH v ${data.currency === 'CZK' ? 'Kč' : data.currency}:`, 151, top, 8)
  text('Základ', 376, top, 8, false, true)
  text('Sazba', 405, top, 8, false, true)
  text('DPH', 469, top, 8, false, true)
  text('Celkem s DPH', right - 14, top, 8, false, true)
  for (const row of data.breakdown) {
    top += 14
    text(row.net, 376, top, 8, false, true)
    text(row.rate, 405, top, 8, false, true)
    text(row.tax, 469, top, 8, false, true)
    text(row.gross, right - 14, top, 8, false, true)
  }
  pdf.getPages().forEach((invoicePage, index) => {
    page = invoicePage
    text('LUMERASHOP.CZ', left, height - 28, 8, false, false, muted)
    text(`${index + 1} / ${pdf.getPageCount()}`, right, height - 28, 8, false, true, muted)
  })
}
