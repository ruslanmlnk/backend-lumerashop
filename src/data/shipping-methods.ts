export type ShippingMethodId =
  | 'ppl-courier-cod'
  | 'ppl-pickup-cod'
  | 'ppl-courier'
  | 'ppl-pickup'
  | 'zasilkovna-courier'
  | 'zasilkovna-pickup'
  | 'personal-pickup'

export type PickupCarrier = 'ppl' | 'zasilkovna'

export type ShippingMethodPreset = {
  id: ShippingMethodId
  label: string
  description: string
  price: number
  sortOrder: number
  pickupCarrier?: PickupCarrier
  cashOnDelivery?: boolean
}

export function isCashOnDeliveryShippingMethod(
  method: Pick<ShippingMethodPreset, 'id' | 'label' | 'cashOnDelivery'>,
): boolean {
  const label = method.label.toLowerCase()
  return method.cashOnDelivery === true || method.id.endsWith('-cod') || label.includes('na dobírku') || label.includes('na dobirku')
}

export const SHIPPING_METHOD_PRESETS: readonly ShippingMethodPreset[] = [
  {
    id: 'ppl-courier-cod',
    label: 'PPL - kurýr na dobírku',
    description: 'Doručení bez dalšího kroku výběru pobočky.',
    price: 89,
    sortOrder: 10,
    cashOnDelivery: true,
  },
  {
    id: 'ppl-pickup-cod',
    label: 'PPL - výdejní místa na dobírku',
    description: 'Vyberete si konkrétní místo nebo box.',
    price: 89,
    pickupCarrier: 'ppl',
    sortOrder: 20,
    cashOnDelivery: true,
  },
  {
    id: 'ppl-courier',
    label: 'PPL - kurýr',
    description: 'Doručení bez dalšího kroku výběru pobočky.',
    price: 0,
    sortOrder: 30,
  },
  {
    id: 'ppl-pickup',
    label: 'PPL - výdejní místa',
    description: 'Vyberete si konkrétní místo nebo box.',
    price: 0,
    pickupCarrier: 'ppl',
    sortOrder: 40,
  },
  {
    id: 'zasilkovna-courier',
    label: 'Zásilkovna - kurýr',
    description: 'Doručení bez dalšího kroku výběru pobočky.',
    price: 0,
    sortOrder: 50,
  },
  {
    id: 'zasilkovna-pickup',
    label: 'Zásilkovna - výdejní místa',
    description: 'Vyberete si konkrétní místo nebo box.',
    price: 0,
    pickupCarrier: 'zasilkovna',
    sortOrder: 60,
  },
  {
    id: 'personal-pickup',
    label: 'Osobní odběr - Lisabonská 2394, Praha (výdejní místo)',
    description: 'Připraveno k převzetí na výdejním místě v Praze.',
    price: 0,
    sortOrder: 70,
  },
]
