import { resolveOutboundEmailLogoUrl } from "./resolveEmailLogoUrl.js";

export function buildEmailHtml({ subject = "", body = "", recipientName = "" } = {}) {
  const resolvedLogo = resolveOutboundEmailLogoUrl();
  const logoUrl = resolvedLogo;
  if (!resolvedLogo) {
    console.warn(
      "emailHtml: set PUBLIC_APP_URL (e.g. https://your-app.vercel.app) or BRAND_LOGO_URL so the logo <img> has an absolute URL."
    );
  }
  const logoHtml = logoUrl
    ? `<img src="${String(logoUrl).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" alt="Hightower Funding" width="280"
         style="display:block;margin:0 auto;max-width:280px;width:100%;height:auto;background:#ffffff;border-radius:8px;padding:12px 18px;box-sizing:content-box;" />`
    : `<span style="display:inline-block;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.06em;">HIGHTOWER FUNDING</span>`;

  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";
  const bodyHtml = body
    .split("\n")
    .map((line) =>
      line.trim()
        ? `<p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.75;">${line}</p>`
        : ""
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:linear-gradient(160deg,#1a2fa8 0%,#0f1f80 100%);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;min-height:100vh;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(160deg,#1a2fa8 0%,#0f1f80 100%);padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 0 24px 0;text-align:center;">
              ${logoHtml}
            </td>
          </tr>
          <tr>
            <td style="text-align:center;padding-bottom:20px;">
              <span style="background:rgba(0,200,150,0.15);border:1px solid rgba(0,200,150,0.4);color:#00c896;font-size:12px;font-weight:600;padding:6px 16px;border-radius:20px;letter-spacing:0.5px;">
                ⚡ Same Day Funding Available
              </span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px 16px 0 0;padding:40px 40px 32px 40px;">
              <p style="margin:0 0 24px 0;font-size:17px;font-weight:700;color:#111827;">${greeting}</p>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:28px 40px;text-align:center;">
              <a href="https://www.hightowerfunding.com"
                 style="display:inline-block;background:#00c896;color:#ffffff;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.2px;">
                Check My Options — Free →
              </a>
              <p style="margin:12px 0 0 0;color:#9ca3af;font-size:12px;">No obligation · No hard credit pull · 2 minutes</p>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(90deg,#1a2fa8,#0f1f80);padding:24px 40px;border-left:1px solid rgba(255,255,255,0.1);border-right:1px solid rgba(255,255,255,0.1);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="font-size:20px;font-weight:800;color:#00c896;">$400M+</div>
                    <div style="font-size:11px;color:#93c5fd;margin-top:3px;">Total Funded</div>
                  </td>
                  <td align="center">
                    <div style="font-size:20px;font-weight:800;color:#00c896;">10,000+</div>
                    <div style="font-size:11px;color:#93c5fd;margin-top:3px;">Businesses Helped</div>
                  </td>
                  <td align="center">
                    <div style="font-size:20px;font-weight:800;color:#00c896;">4.8 ★</div>
                    <div style="font-size:11px;color:#93c5fd;margin-top:3px;">Average Rating</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#0b1660;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;color:#6b7280;font-size:11px;line-height:1.6;">
                Hightower Funding · 786-677-6771 · hightowerfunding.com
              </p>
              <p style="margin:0;color:#4b5563;font-size:10px;">
                You're receiving this because your business may qualify for funding.
                <a href="#" style="color:#00c896;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendBrevoEmail({ to, toName, subject, htmlContent }) {
  const key = process.env.BREVO_API_KEY;
  const from = process.env.BREVO_SENDER_EMAIL;
  if (!key || !from) {
    throw new Error("Missing BREVO_API_KEY or BREVO_SENDER_EMAIL");
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || "Hightower Funding", email: from },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
      trackOpens: true,
      trackClicks: true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Brevo error");
  return data;
}
