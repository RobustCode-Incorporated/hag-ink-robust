// Optional transactional email through Resend's HTTP API (no SDK).
// Without RESEND_API_KEY + EMAIL_FROM, emails are skipped and the booking still works.
import 'server-only';

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
