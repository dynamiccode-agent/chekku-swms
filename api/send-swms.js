const ADMIN_EMAIL = 'paul@circl.com.au';
const FROM = 'ChekkU SWMS <noreply@swms.chekku.au>';

function row(label, value) {
  return `<tr style="border-top:1px solid #E8EEEC;">
    <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#163029;background:#F4F7F5;width:38%;border-right:1px solid #E8EEEC;">${label}</td>
    <td style="padding:8px 14px;font-size:13px;color:#2A5648;">${value || '&mdash;'}</td>
  </tr>`;
}

function header(accentBg, accentText, label) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F7F5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F5;padding:40px 20px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(22,48,41,.10);">
<tr><td style="background:#163029;padding:24px 32px;">
  <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">CHEKK<span style="color:#AAFF04;">U</span></span>
  <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">SWMS Platform</div>
</td></tr>
<tr><td style="background:${accentBg};padding:11px 32px;">
  <span style="font-size:13px;font-weight:700;color:${accentText};">${label}</span>
</td></tr>
<tr><td style="padding:28px 32px;">`;
}

function footer() {
  return `</td></tr>
<tr><td style="padding:14px 32px;background:#F4F7F5;border-top:1px solid #E8EEEC;">
  <p style="font-size:11px;color:#A0BEB5;margin:0;">ChekkU SWMS &mdash; <a href="https://swms.chekku.au" style="color:#3E7264;text-decoration:none;">swms.chekku.au</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function adminEmail(d) {
  return header('#AAFF04', '#163029', '&#x2713; New SWMS Generated') +
    `<p style="font-size:15px;color:#163029;margin:0 0 20px;">A new SWMS has been generated via the ChekkU onboarding tool. <strong>The document is attached.</strong></p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8EEEC;border-radius:8px;overflow:hidden;margin-bottom:0;">
      ${row('Business', d.company)}
      ${row('Contact Name', d.tradeName)}
      ${row('Email', `<a href="mailto:${d.tradeEmail}" style="color:#163029;">${d.tradeEmail}</a>`)}
      ${row('Phone', d.phone)}
      ${row('Trade', d.trade)}
      ${row('Activity / Task', d.activity)}
      ${row('Site Address', d.site)}
      ${row('Start Date', d.startDate)}
      ${row('Principal Contractor', d.pcName)}
      ${row('Responsible Person', d.responsible)}
    </table>` +
  footer();
}

function tradeEmail(d) {
  return header('#AAFF04', '#163029', '&#x2713; Your SWMS is ready') +
    `<p style="font-size:15px;color:#163029;margin:0 0 16px;">Hi ${d.tradeName},</p>
    <p style="font-size:15px;color:#2A5648;line-height:1.6;margin:0 0 24px;">
      Your Safe Work Method Statement for <strong>${d.activity}</strong> has been generated and is <strong>attached to this email</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F5;border-radius:8px;padding:0;margin-bottom:24px;border:1px solid #E8EEEC;overflow:hidden;">
      <tr><td style="padding:14px 16px 10px;"><p style="font-size:13px;font-weight:700;color:#163029;margin:0 0 10px;">To save as PDF:</p>
        <ol style="font-size:13px;color:#2A5648;margin:0;padding-left:18px;line-height:2;">
          <li>Open the attached <strong>.html</strong> file in Chrome or Safari</li>
          <li>The print dialog will open automatically</li>
          <li>Select <strong>Save as PDF</strong> as the destination</li>
          <li>Have all workers sign the document before starting work</li>
        </ol>
      </td></tr>
    </table>
    <p style="font-size:13px;color:#6A9A8D;margin:0;">Our compliance team will review your SWMS and be in touch within 1 business day.</p>` +
  footer();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'Email service not configured' });

  const {
    tradeName, tradeEmail: toTrade, company, trade, phone,
    activity, site, startDate, pcName, responsible, swmsHtml
  } = req.body || {};

  if (!swmsHtml || !toTrade) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const filename = 'SWMS_' + (company || 'Document').replace(/[^a-z0-9]/gi, '_') + '.html';
  const attachment = { filename, content: Buffer.from(swmsHtml).toString('base64') };

  const d = { tradeName, tradeEmail: toTrade, company, trade, phone, activity, site, startDate, pcName, responsible };

  async function send(to, subject, html) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, attachments: [attachment] })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || `Resend error ${r.status}`);
    return data;
  }

  try {
    await Promise.all([
      send(ADMIN_EMAIL, `New SWMS Generated — ${company} — ${activity}`, adminEmail(d)),
      send(toTrade,     `Your SWMS is ready — ${company}`,               tradeEmail(d))
    ]);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('send-swms error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
