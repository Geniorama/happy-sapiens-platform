// Netlify Scheduled Function — se ejecuta diariamente a las 6am UTC
// Llama al endpoint interno que reactiva suscripciones cuya pausa ha vencido

export const handler = async () => {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.URL
  const secret = process.env.WEBHOOK_TRIGGER_SECRET

  if (!baseUrl || !secret) {
    console.error('Faltan variables de entorno: NEXTAUTH_URL o WEBHOOK_TRIGGER_SECRET')
    return { statusCode: 500 }
  }

  try {
    const response = await fetch(`${baseUrl}/api/cron/reactivate-subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': secret,
      },
    })

    const data = await response.json()
    console.log('Reactivación automática:', data)
    return { statusCode: 200, body: JSON.stringify(data) }
  } catch (err) {
    console.error('Error en cron de reactivación:', err)
    return { statusCode: 500 }
  }
}
