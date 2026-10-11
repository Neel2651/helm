export interface NotifyResult {
  sent: boolean;
  reason?: string;
}

// Sends a message to a Telegram chat. If Telegram is not configured, the message is logged instead.
export function telegramConfigured(): boolean {
  return Boolean(process.env.HELM_TELEGRAM_BOT_TOKEN && process.env.HELM_TELEGRAM_CHAT_ID);
}

export async function notify(text: string): Promise<NotifyResult> {
  if (!telegramConfigured()) {
    console.log(`[helm alert] ${text}`);
    return { sent: false, reason: 'Telegram is not configured' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.HELM_TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.HELM_TELEGRAM_CHAT_ID, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}) as { description?: string });
      const reason = `Telegram ${res.status}: ${body.description || 'no details'}`;
      console.error(`[helm] ${reason}`);
      return { sent: false, reason };
    }
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[helm] Telegram send failed: ${message}`);
    return { sent: false, reason: message };
  }
}
