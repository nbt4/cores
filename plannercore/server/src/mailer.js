import nodemailer from 'nodemailer';

/*
 * E-Mail-Versand über einen Microsoft-365-Tenant.
 *
 * MAIL_PROVIDER=graph  -> Microsoft Graph API (App-Registrierung mit Mail.Send-
 *                         Anwendungsberechtigung, Client-Credentials-Flow)
 * MAIL_PROVIDER=smtp   -> SMTP AUTH über smtp.office365.com (Postfach mit
 *                         aktiviertem "Authenticated SMTP")
 * MAIL_PROVIDER=console-> Kein Versand, E-Mails werden nur geloggt (Entwicklung)
 */

const PROVIDER = (process.env.MAIL_PROVIDER || 'console').toLowerCase();
const APP_URL = process.env.APP_URL || 'http://localhost:8080';

let graphToken = null;
let graphTokenExpires = 0;

async function getGraphToken() {
  if (graphToken && Date.now() < graphTokenExpires - 60_000) return graphToken;
  const tenant = process.env.GRAPH_TENANT_ID;
  const body = new URLSearchParams({
    client_id: process.env.GRAPH_CLIENT_ID,
    client_secret: process.env.GRAPH_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Graph-Token fehlgeschlagen: ${res.status} ${await res.text()}`);
  const data = await res.json();
  graphToken = data.access_token;
  graphTokenExpires = Date.now() + data.expires_in * 1000;
  return graphToken;
}

async function sendViaGraph(to, subject, html) {
  const token = await getGraphToken();
  const sender = process.env.MAIL_SENDER;
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: false,
      }),
    }
  );
  if (!res.ok) throw new Error(`Graph sendMail fehlgeschlagen: ${res.status} ${await res.text()}`);
}

let smtpTransport = null;
function getSmtp() {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.office365.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      requireTLS: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return smtpTransport;
}

export async function sendMail(to, subject, html) {
  try {
    if (PROVIDER === 'graph') {
      await sendViaGraph(to, subject, html);
    } else if (PROVIDER === 'smtp') {
      await getSmtp().sendMail({
        from: process.env.MAIL_SENDER || process.env.SMTP_USER,
        to,
        subject,
        html,
      });
    } else {
      console.log(`[MAIL console] An: ${to} | Betreff: ${subject}`);
    }
  } catch (e) {
    // E-Mail-Fehler dürfen die API nie blockieren.
    console.error('E-Mail-Versand fehlgeschlagen:', e.message);
  }
}

export function mailTemplate(title, lines, ctaText, ctaPath) {
  const body = lines.map((l) => `<p style="margin:0 0 12px;color:#3b3b3b;font-size:14px;line-height:1.5">${l}</p>`).join('');
  const cta = ctaText
    ? `<a href="${APP_URL}${ctaPath}" style="display:inline-block;background:#31752f;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-size:14px;margin-top:8px">${ctaText}</a>`
    : '';
  return `
  <div style="background:#f5f5f5;padding:24px;font-family:'Segoe UI',Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0">
      <div style="background:#31752f;color:#fff;padding:16px 24px;font-size:16px;font-weight:600">Planner</div>
      <div style="padding:24px">
        <h2 style="margin:0 0 16px;font-size:18px;color:#1b1b1b">${title}</h2>
        ${body}
        ${cta}
      </div>
      <div style="padding:12px 24px;border-top:1px solid #eee;color:#8a8a8a;font-size:12px">
        Diese Nachricht wurde automatisch von Planner gesendet.
      </div>
    </div>
  </div>`;
}
