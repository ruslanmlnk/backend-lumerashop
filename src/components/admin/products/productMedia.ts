import type { DefaultServerCellComponentProps } from 'payload'

import type { Media } from '@/payload-types'

export type CellMedia = Pick<Media, 'alt' | 'thumbnailURL' | 'url'> & {
  id: number | string
}

const isMediaDocument = (value: unknown): value is CellMedia => {
  if (!value || typeof value !== 'object') {
    return false
  }

  return 'id' in value
}

const getMediaID = (value: unknown) => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }

  if (value && typeof value === 'object' && 'id' in value) {
    const source = value as { id?: number | string }

    if (typeof source.id === 'string' || typeof source.id === 'number') {
      return source.id
    }
  }

  return null
}

export const getImageSource = (media: CellMedia | null) => media?.thumbnailURL || media?.url || ''

export const resolveProductMedia = async (
  value: unknown,
  payload: DefaultServerCellComponentProps['payload'],
): Promise<CellMedia | null> => {
  if (isMediaDocument(value)) {
    return value
  }

  const id = getMediaID(value)

  if (!id) {
    return null
  }

  try {
    const media = await payload.findByID({
      collection: 'media',
      id,
      depth: 0,
      overrideAccess: true,
    })

    return isMediaDocument(media) ? media : null
  } catch {
    return null
  }
}
