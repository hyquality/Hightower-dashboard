/** Served from /public — same file is used in outbound HTML emails (absolute URL on deploy). */
export const BRAND_LOGO_PUBLIC_PATH = "/hightower-logo-email.png";

function browserOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/**
 * Navbar + in-app email preview.
 * Override with VITE_BRAND_LOGO_URL for a CDN; otherwise same host as the app + public logo.
 */
export const BRAND_LOGO_URL =
  import.meta.env.VITE_BRAND_LOGO_URL ||
  (browserOrigin() ? `${browserOrigin()}${BRAND_LOGO_PUBLIC_PATH}` : BRAND_LOGO_PUBLIC_PATH);
