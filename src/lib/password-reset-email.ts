type ForgotPasswordEmailArgs = {
  token?: string
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const getStorefrontUrl = () =>
  (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.STOREFRONT_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    'http://127.0.0.1:3000'
  ).replace(/\/+$/, '')

export const buildPasswordResetUrl = (token: string) =>
  `${getStorefrontUrl()}/reset-password?token=${encodeURIComponent(token)}`

export const generatePasswordResetEmailSubject = () => 'Obnoveni hesla | Lumera'

export const generatePasswordResetEmailHtml = ({ token }: ForgotPasswordEmailArgs = {}) => {
  const resetUrl = token ? buildPasswordResetUrl(token) : getStorefrontUrl()
  const safeResetUrl = escapeHtml(resetUrl)

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f4ef;font-family:Arial,sans-serif;color:#111111">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ef;padding:32px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">
            <tr>
              <td style="padding:32px">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8b7f6e">Lumera</p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:400">Obnoveni hesla</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4b4b4b">
                  Obdrzeli jsme zadost o obnoveni hesla k vasemu uctu. Pro nastaveni noveho hesla kliknete na tlacitko nize.
                </p>
                <p style="margin:0 0 26px">
                  <a href="${safeResetUrl}" style="display:inline-block;background:#E1B12C;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 22px;border-radius:3px">
                    Nastavit nove heslo
                  </a>
                </p>
                <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6b6257">
                  Pokud tlacitko nefunguje, zkopirujte tento odkaz do prohlizece:
                </p>
                <p style="margin:0 0 22px;font-size:13px;line-height:1.6;word-break:break-all">
                  <a href="${safeResetUrl}" style="color:#111111">${safeResetUrl}</a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6257">
                  Pokud jste o obnoveni hesla nezadali, tento e-mail muzete ignorovat.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
