import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const GLAMI_CATEGORY_XML_URL = 'https://www.glami.cz/category-xml/'
const outputPath = fileURLToPath(new URL('../data/glami-category-fullnames.json', import.meta.url))

const decodeXmlEntities = (value: string) =>
  value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|amp|apos|gt|lt|quot);/gi,
    (entity, decimal, hexadecimal) => {
      if (decimal) {
        return String.fromCodePoint(Number.parseInt(decimal, 10))
      }

      if (hexadecimal) {
        return String.fromCodePoint(Number.parseInt(hexadecimal, 16))
      }

      return {
        '&amp;': '&',
        '&apos;': "'",
        '&gt;': '>',
        '&lt;': '<',
        '&quot;': '"',
      }[entity.toLowerCase()] as string
    },
  )

const response = await fetch(GLAMI_CATEGORY_XML_URL)

if (!response.ok) {
  throw new Error(`Failed to fetch GLAMI categories: ${response.status} ${response.statusText}`)
}

const xml = await response.text()
const categoryFullnames = Array.from(
  xml.matchAll(/<CATEGORY_FULLNAME>([\s\S]*?)<\/CATEGORY_FULLNAME>/g),
  (match) => decodeXmlEntities(match[1] ?? '').trim(),
).filter((fullname, index, values) => fullname.length > 0 && values.indexOf(fullname) === index)

if (categoryFullnames.length === 0) {
  throw new Error('GLAMI category XML did not contain any CATEGORY_FULLNAME values.')
}

await writeFile(outputPath, `${JSON.stringify(categoryFullnames, null, 2)}\n`, 'utf8')

console.log(`Saved ${categoryFullnames.length} GLAMI CATEGORY_FULLNAME values to ${outputPath}`)
