/**
 * Sends email. EMAIL_PROVIDER=console logs it (development), resend uses the
 * Resend API (RESEND_API_KEY), smtp uses any SMTP server (SMTP_URL), e.g. Zoho,
 * Brevo, Mailgun or Gmail.
 */
export async function sendEmail(msg: { to: string; subject: string; text: string; html: string }): Promise<void> {
  const cfg = serverConfig()

  if (cfg.emailProvider === 'console') {
    if (!import.meta.dev) console.warn('[email] EMAIL_PROVIDER=console in production: emails are not being sent')
    console.log(`[email] to ${msg.to}: ${msg.subject}\n${msg.text}`)
    return
  }

  const failed = (e: unknown) => {
    console.error('[email] send failed', e)
    throw createError({ statusCode: 502, message: 'We couldn’t send the email. Please try again.' })
  }

  if (cfg.emailProvider === 'resend') {
    if (!cfg.resendApiKey) throw createError({ statusCode: 500, message: 'RESEND_API_KEY is not set' })
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.resendApiKey}` },
      body: { from: cfg.emailFrom, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html },
    }).catch(failed)
    return
  }

  if (cfg.emailProvider === 'smtp') {
    if (!cfg.smtpUrl) throw createError({ statusCode: 500, message: 'SMTP_URL is not set' })
    const { createTransport } = await import('nodemailer')
    await createTransport(cfg.smtpUrl).sendMail({ from: cfg.emailFrom, ...msg }).catch(failed)
    return
  }

  throw createError({ statusCode: 500, message: `Unknown EMAIL_PROVIDER "${cfg.emailProvider}"` })
}

export function sendSignInEmail(email: string, code: string) {
  const text = `Your Kusa sign-in code is ${code}.\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`
  const html = `<!doctype html><html><body style="margin:0;background:#FAF6EE;font-family:Arial,Helvetica,sans-serif;color:#16211B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:440px;background:#ffffff;border:1px solid #E7E0D2;border-radius:18px" cellpadding="0" cellspacing="0"><tr><td style="padding:28px">
<p style="margin:0 0 4px;font-size:20px;font-weight:bold;color:#0B6E4F">kusa</p>
<p style="margin:16px 0 8px;font-size:16px">Your sign-in code is</p>
<p style="margin:0 0 16px;font-size:34px;font-weight:bold;letter-spacing:8px">${code}</p>
<p style="margin:0;font-size:14px;color:#5B6660">It expires in 10 minutes. If you didn't ask for it, you can ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`
  return sendEmail({ to: email, subject: `${code} is your Kusa code`, text, html })
}
