const cyrillicCharacterMap: Record<string, string> = {
  '\u0430': 'a',
  '\u0431': 'b',
  '\u0432': 'v',
  '\u0433': 'h',
  '\u0491': 'g',
  '\u0434': 'd',
  '\u0435': 'e',
  '\u0454': 'ye',
  '\u0436': 'zh',
  '\u0437': 'z',
  '\u0438': 'y',
  '\u0456': 'i',
  '\u0457': 'yi',
  '\u0439': 'y',
  '\u043a': 'k',
  '\u043b': 'l',
  '\u043c': 'm',
  '\u043d': 'n',
  '\u043e': 'o',
  '\u043f': 'p',
  '\u0440': 'r',
  '\u0441': 's',
  '\u0442': 't',
  '\u0443': 'u',
  '\u0444': 'f',
  '\u0445': 'kh',
  '\u0446': 'ts',
  '\u0447': 'ch',
  '\u0448': 'sh',
  '\u0449': 'shch',
  '\u044e': 'yu',
  '\u044f': 'ya',
  '\u044c': '',
  '\u044d': 'e',
  '\u0451': 'yo',
  '\u044b': 'y',
  '\u044a': '',
}

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ')

const transliterateCyrillic = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\u0430-\u044f\u0451\u0456\u0457\u0454\u0491]/g, (character) => cyrillicCharacterMap[character] ?? character)

export const slugifySegment = (value: string) =>
  transliterateCyrillic(normalizeWhitespace(value))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' a ')
    .replace(/['\u2019`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const slugifyValue = (value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return ''
  }

  return slugifySegment(String(value))
}
