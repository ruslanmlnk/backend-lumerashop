import nodemailer from 'nodemailer'
import type { EmailAdapter } from 'payload'

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  fromAddress: string
  fromName: string
}

const readEnv = (name: string) => process.env[name]?.trim() || ''
const toBoolean = (value: string) => /^(1|true|yes|on)$/i.test(value.trim())

const getSmtpConfig = (): SmtpConfig | null => {
  const host = readEnv('SMTP_HOST')
  const secure = toBoolean(readEnv('SMTP_SECURE'))
  const rawPort = readEnv('SMTP_PORT')
  const port = Number(rawPort || (secure ? '465' : '587'))
  const user = readEnv('SMTP_USER')
  const pass = readEnv('SMTP_PASS')
  const from = readEnv('SMTP_FROM') || user
  const fromName = readEnv('SMTP_FROM_NAME') || 'Lumera'

  if (!host || !Number.isFinite(port) || port <= 0 || !from) {
    return null
  }

  const addressMatch = from.match(/<([^>]+)>/)
  const fromAddress = (addressMatch?.[1] || from).trim()

  return {
    host,
    port,
    secure,
    user,
    pass,
    fromAddress,
    fromName,
  }
}

export const payloadEmailAdapter = (): EmailAdapter => () => {
  const config = getSmtpConfig()
  const transporter = config
    ? nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.user || config.pass ? { user: config.user, pass: config.pass } : undefined,
      })
    : null

  return {
    defaultFromAddress: config?.fromAddress || 'no-reply@lumerashop.cz',
    defaultFromName: config?.fromName || 'Lumera',
    name: 'lumera-smtp',
    async sendEmail(message) {
      if (!transporter) {
        throw new Error('SMTP is not configured for Payload emails.')
      }

      return transporter.sendMail(message)
    },
  }
}
