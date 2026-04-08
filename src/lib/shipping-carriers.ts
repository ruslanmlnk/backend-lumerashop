const asCleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const normalizeComparableText = (value: unknown) =>
  asCleanString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const readShipping = (value: unknown) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

export type ShipmentCarrier = 'ppl' | 'zasilkovna'

export const inferShipmentCarrier = (shipping: unknown): ShipmentCarrier | '' => {
  const source = readShipping(shipping)
  const methodId = asCleanString(source.methodId).toLowerCase()

  if (methodId.startsWith('ppl-')) {
    return 'ppl'
  }

  if (methodId.startsWith('zasilkovna-')) {
    return 'zasilkovna'
  }

  const pickupCarrier = normalizeComparableText(source.pickupCarrier)
  if (pickupCarrier === 'ppl' || pickupCarrier === 'zasilkovna') {
    return pickupCarrier
  }

  const label = normalizeComparableText(source.label)
  if (/\bppl\b/.test(label)) {
    return 'ppl'
  }

  if (label.includes('zasilkovna') || label.includes('packeta')) {
    return 'zasilkovna'
  }

  return ''
}

export const isPplShippingSelection = (shipping: unknown) => inferShipmentCarrier(shipping) === 'ppl'

export const isZasilkovnaShippingSelection = (shipping: unknown) => inferShipmentCarrier(shipping) === 'zasilkovna'

export const isShipmentPickupSelection = (shipping: unknown, carrier?: ShipmentCarrier) => {
  const source = readShipping(shipping)
  const methodId = asCleanString(source.methodId).toLowerCase()

  if (methodId.includes('pickup')) {
    return true
  }

  if (carrier && inferShipmentCarrier(source) !== carrier) {
    return false
  }

  return Boolean(asCleanString(source.pickupPointCode) || asCleanString(source.pickupPointId) || asCleanString(source.pickupPointName))
}
