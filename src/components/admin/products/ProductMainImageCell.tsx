import type { DefaultServerCellComponentProps } from 'payload'

import type { Media } from '@/payload-types'

type CellMedia = Pick<Media, 'alt' | 'thumbnailURL' | 'url'> & {
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

const getImageSource = (media: CellMedia | null) => media?.thumbnailURL || media?.url || ''

const resolveMedia = async (
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

export default async function ProductMainImageCell(props: DefaultServerCellComponentProps) {
  const media = await resolveMedia(props.cellData ?? props.rowData?.mainImage, props.payload)
  const imageSource = getImageSource(media)
  const alt = media?.alt || String(props.rowData?.name || 'Produkt')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 44,
      }}
    >
      {imageSource ? (
        <img
          alt={alt}
          src={imageSource}
          style={{
            width: 44,
            height: 44,
            objectFit: 'cover',
            borderRadius: 10,
            border: '1px solid var(--theme-elevation-150)',
            background: 'var(--theme-elevation-50)',
          }}
        />
      ) : (
        <div
          aria-label="Bez obrázku"
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: '1px dashed var(--theme-elevation-200)',
            background: 'var(--theme-elevation-50)',
          }}
        />
      )}
    </div>
  )
}
