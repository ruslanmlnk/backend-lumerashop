const INTERNAL_HEADER_NAME = 'x-lumera-internal-secret'

const getExpectedSecret = () =>
  process.env.INTERNAL_API_SECRET?.trim() || process.env.PAYLOAD_SECRET?.trim() || ''

export const isInternalRequestAuthorized = (request: Request) => {
  const expected = getExpectedSecret()
  if (!expected) {
    return false
  }

  const provided = request.headers.get(INTERNAL_HEADER_NAME)?.trim() || ''
  return provided === expected
}

export const getInternalUnauthorizedResponse = () =>
  Response.json({ error: 'Unauthorized internal request.' }, { status: 401 })

export const INTERNAL_API_HEADER_NAME = INTERNAL_HEADER_NAME
