import type { DefaultServerCellComponentProps } from 'payload'

import { getImageSource, resolveProductMedia } from './productMedia'

export default async function ProductMainImageCell(props: DefaultServerCellComponentProps) {
  const media = await resolveProductMedia(props.cellData ?? props.rowData?.mainImage, props.payload)
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
