const BRAND_ACCENT = "#D97757";
const BRAND_INK = "#2B2B2B";
const BRAND_MUTED = "#666666";
const BRAND_BORDER = "#E5E5E5";
const BRAND_BG = "#F7F7F7";
const LOGO_URL = "https://putwatermark.com/Icon.png";
const SITE_URL = "https://putwatermark.com";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderDetailRow(label: string, value: string, options?: { isMessage?: boolean }) {
  const safeValue = escapeHtml(value);
  const valueHtml = options?.isMessage
    ? safeValue.replaceAll("\n", "<br />")
    : safeValue;

  return `
    <tr>
      <td style="padding:0 0 16px 0;vertical-align:top;width:96px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${BRAND_MUTED};">
        ${escapeHtml(label)}
      </td>
      <td style="padding:0 0 16px 0;vertical-align:top;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND_INK};">
        ${options?.isMessage
          ? `<div style="margin:0;padding:14px 16px;background:${BRAND_BG};border:1px solid ${BRAND_BORDER};border-radius:10px;white-space:pre-wrap;">${valueHtml}</div>`
          : valueHtml}
      </td>
    </tr>
  `;
}

export function buildContactFormNotificationEmail(input: {
  email: string;
  message: string;
  name: string;
  topicLabel: string;
}) {
  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:${BRAND_BG};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:${BRAND_BG};margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid ${BRAND_BORDER};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 20px 32px;border-bottom:1px solid ${BRAND_BORDER};">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="vertical-align:middle;width:44px;padding-right:12px;">
                      <img src="${LOGO_URL}" alt="PutWatermark" width="40" height="40" style="display:block;width:40px;height:40px;border:0;outline:none;text-decoration:none;" />
                    </td>
                    <td style="vertical-align:middle;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.03em;color:${BRAND_INK};">
                      PutWatermark
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <h1 style="margin:0 0 10px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:${BRAND_INK};">
                  New contact form submission
                </h1>
                <div style="width:56px;height:3px;background-color:${BRAND_ACCENT};border-radius:999px;margin:0 0 20px 0;"></div>
                <p style="margin:0 0 24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND_MUTED};">
                  Someone submitted the contact form on putwatermark.com. Reply directly to this email to respond to them.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                  ${renderDetailRow("Topic", input.topicLabel)}
                  ${renderDetailRow("Name", input.name)}
                  ${renderDetailRow("Email", input.email)}
                  ${renderDetailRow("Message", input.message, { isMessage: true })}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-top:1px solid ${BRAND_BORDER};">
                  <tr>
                    <td style="padding-top:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${BRAND_MUTED};">
                      This message was sent via the contact form on
                      <a href="${SITE_URL}" style="color:${BRAND_ACCENT};text-decoration:none;font-weight:600;">putwatermark.com</a>.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "New contact form submission",
    "",
    `Topic: ${input.topicLabel}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    "",
    "Message:",
    input.message,
    "",
    `Sent via the contact form on ${SITE_URL}`,
  ].join("\n");

  return { html, text };
}

export function buildContactFormNotificationSubject(input: {
  name: string;
  topicLabel: string;
}) {
  return `[PutWatermark ${input.topicLabel}] Message from ${input.name}`;
}
