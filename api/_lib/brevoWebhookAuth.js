/**
 * Brevo cannot send a Supabase user JWT. Authenticate webhooks with a shared secret.
 * Configure the same value in Brevo (webhook secret / custom header) and in BREVO_WEBHOOK_SECRET.
 *
 * Accepted if secret is set:
 * - Header `x-webhook-secret: <secret>`
 * - Header `Authorization: Bearer <secret>`
 */
export function verifyBrevoWebhook(req) {
  const secret = process.env.BREVO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("BREVO_WEBHOOK_SECRET is not set — webhook endpoint is public. Set it in production.");
    return true;
  }
  const h = req.headers["x-webhook-secret"];
  const auth = req.headers.authorization;
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (h === secret || bearer === secret) return true;
  return false;
}
