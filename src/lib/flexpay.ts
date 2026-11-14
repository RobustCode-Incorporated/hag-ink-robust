import 'server-only';
// FlexPay (Infoset) client — Mobile Money push (type 1) and card checkout (type 2). Spec 012.
// Env: FLEXPAY_TOKEN, FLEXPAY_MERCHANT, FLEXPAY_MOBILE_URL, FLEXPAY_CARD_URL (paste them exactly, no quotes/spaces).

type FlexpayAnswer = { code?: string; message?: string; url?: string; orderNumber?: string };

export class FlexpayError extends Error {}

export function flexpayConfig() {
  const token = process.env.FLEXPAY_TOKEN?.trim();
  const merchant = process.env.FLEXPAY_MERCHANT?.trim();
  const mobileUrl = process.env.FLEXPAY_MOBILE_URL?.trim();
  const cardUrl = process.env.FLEXPAY_CARD_URL?.trim();
  return token && merchant && mobileUrl && cardUrl ? { token, merchant, mobileUrl, cardUrl } : null;
}

async function parse(res: Response, label: string): Promise<FlexpayAnswer> {
  const raw = await res.text();
  try {
    return JSON.parse(raw) as FlexpayAnswer;
  } catch {
    console.error(`FlexPay ${label}: non-JSON answer (status ${res.status})`, raw.slice(0, 500));
    throw new FlexpayError(`FlexPay ${label}: invalid answer (status ${res.status})`);
  }
}

type Common = { reference: string; amount: string; currency: string; callbackUrl: string };

export async function startMobileMoney(p: Common & { phone: string }) {
  const cfg = flexpayConfig();
  if (!cfg) throw new FlexpayError('FlexPay is not configured');
  const res = await fetch(cfg.mobileUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.token}` },
    body: JSON.stringify({ merchant: cfg.merchant, type: '1', phone: p.phone, reference: p.reference, amount: p.amount, currency: p.currency, callbackUrl: p.callbackUrl }),
  });
  const data = await parse(res, 'Mobile Money');
  if (data.code !== '0' || !data.orderNumber) throw new FlexpayError(data.message || 'FlexPay Mobile Money error');
  return { orderNumber: data.orderNumber, message: data.message ?? '' };
}

export async function startCard(p: Common & { description: string; approveUrl: string; cancelUrl: string; declineUrl: string }) {
  const cfg = flexpayConfig();
  if (!cfg) throw new FlexpayError('FlexPay is not configured');
  const res = await fetch(cfg.cardUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authorization: `Bearer ${cfg.token}`, merchant: cfg.merchant, reference: p.reference, amount: p.amount, currency: p.currency,
      description: p.description, callback_url: p.callbackUrl, approve_url: p.approveUrl, cancel_url: p.cancelUrl, decline_url: p.declineUrl,
    }),
  });
  const data = await parse(res, 'Card');
  if (data.code !== '0' || !data.orderNumber || !data.url) throw new FlexpayError(data.message || 'FlexPay Card error');
  return { orderNumber: data.orderNumber, url: data.url };
}
