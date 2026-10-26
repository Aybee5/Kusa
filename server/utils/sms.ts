/**
 * Sends the sign-in code. SMS_PROVIDER=console logs it instead (development),
 * SMS_PROVIDER=termii sends a real SMS through Termii.
 */
export async function sendSignInCode(phone: string, code: string): Promise<void> {
  const cfg = serverConfig()
  const message = `Your Kusa code is ${code}. It expires in 10 minutes. Don't share it with anyone.`

  if (cfg.smsProvider === 'console') {
    if (!import.meta.dev) console.warn('[sms] SMS_PROVIDER=console in production: codes are not being sent')
    console.log(`[sms] to ${phone}: ${message}`)
    return
  }

  if (cfg.smsProvider === 'termii') {
    if (!cfg.termii.apiKey) throw createError({ statusCode: 500, statusMessage: 'TERMII_API_KEY is not set' })
    await $fetch(`${cfg.termii.baseUrl}/api/sms/send`, {
      method: 'POST',
      body: {
        api_key: cfg.termii.apiKey,
        to: phone.replace(/^\+/, ''),
        from: cfg.termii.senderId,
        sms: message,
        type: 'plain',
        channel: cfg.termii.channel,
      },
    }).catch((e: unknown) => {
      console.error('[sms] Termii error', e)
      throw createError({ statusCode: 502, statusMessage: 'We couldn’t send the code. Please try again.' })
    })
    return
  }

  throw createError({ statusCode: 500, statusMessage: `Unknown SMS_PROVIDER "${cfg.smsProvider}"` })
}
