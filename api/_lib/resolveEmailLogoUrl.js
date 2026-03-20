/**
 * Outbound HTML emails need an absolute https URL for <img src>.
 * Set PUBLIC_APP_URL (e.g. https://your-app.vercel.app) or BRAND_LOGO_URL in Vercel.
 * VERCEL_URL is used as a fallback on Vercel deployments.
 */
const LOGO_PATH = "/hightower-logo-email.png";

export function resolveOutboundEmailLogoUrl() {
  const explicit = (process.env.BRAND_LOGO_URL || "").trim();
  if (explicit) return explicit;

  const pub = (process.env.PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (pub) return `${pub}${LOGO_PATH}`;

  const vercel = (process.env.VERCEL_URL || "").trim();
  if (vercel) return `https://${vercel}${LOGO_PATH}`;

  return "";
}
