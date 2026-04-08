import type { DefaultServerCellComponentProps } from 'payload'

import { getImageSource, resolveProductMedia } from './productMedia'

export default async function ProductNameCell(props: DefaultServerCellComponentProps) {
  const media = await resolveProductMedia(props.rowData?.mainImage, props.payload)
  const imageSource = getImageSource(media)
  const alt = media?.alt || String(props.cellData || props.rowData?.name || 'Produkt')
  const name = typeof props.cellData === 'string' ? props.cellData : String(props.rowData?.name || '')
  const href =
    props.linkURL ||
    `/admin/collections/${encodeURIComponent(props.collectionConfig.slug)}${props.viewType === 'trash' ? '/trash' : ''}/${encodeURIComponent(String(props.rowData?.id || ''))}`

  const content = (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        gap: 12,
        minWidth: 0,
      }}
    >
      {imageSource ? (
        <img
          alt={alt}
          src={imageSource}
          style={{
            background: 'var(--theme-elevation-50)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 10,
            flexShrink: 0,
            height: 44,
            objectFit: 'cover',
            width: 44,
          }}
        />
      ) : (
        <div
          aria-label="Bez obrázku"
          style={{
            background: 'var(--theme-elevation-50)',
            border: '1px dashed var(--theme-elevation-200)',
            borderRadius: 10,
            flexShrink: 0,
            height: 44,
            width: 44,
          }}
        />
      )}

      <span
        style={{
          display: 'block',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
    </div>
  )

  if (!props.link || !props.rowData?.id) {
    return content
  }

  return (
    <a
      href={href}
      style={{
        color: 'inherit',
        display: 'block',
        minWidth: 0,
        textDecoration: 'none',
      }}
    >
      {content}
    </a>
  )
}
