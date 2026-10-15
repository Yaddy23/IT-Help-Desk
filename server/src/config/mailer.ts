import nodemailer, { type Transporter } from 'nodemailer'
import { env } from './env.js'

let transporter: Transporter | null = null
let etherealUser: string | null = null

export async function initMailer() {
  if (env.smtp.host && env.smtp.user && env.smtp.pass) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
    console.log('Mailer: using configured SMTP')
    return
  }

  // Dev fallback: Ethereal test account â€” emails are captured, not delivered.
  const testAccount = await nodemailer.createTestAccount()
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  })
  etherealUser = testAccount.user
  console.log(`Mailer: Ethereal test account (preview at https://ethereal.email/login with ${etherealUser})`)
}

export async function sendMail(to: string, subject: string, html: string) {
  if (!transporter) return
  const info = await transporter.sendMail({ from: env.smtp.from, to, subject, html })
  if (nodemailer.getTestMessageUrl(info)) {
    console.log(`Email preview: ${nodemailer.getTestMessageUrl(info)}`)
  }
}
