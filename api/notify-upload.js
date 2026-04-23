const ADMIN_EMAIL = 'paul@circl.com.au';
const FROM = 'ChekkU SWMS <noreply@swms.chekku.au>';

function row(label, value) {
  return `<tr style="border-top:1px solid #E8EEEC;">
    <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#163029;background:#F4F7F5;width:38%;border-right:1px solid #E8EEEC;">${label}</td>
    <td style="padding:8px 14px;font-size:13px;color:#2A5648;">${value || '&mdash;'}</td>
  </tr>`;
}

function buildEmail(d) {
  const fileNote = d.hasFile
    ? 'The submitted SWMS is <strong>attached</strong> to this email.'
    : `The file was too large to attach (${d.fileName}). Contact the trade directly to obtain the document.`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F4F7F5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F5;padding:40px 20px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(22,48,41,.10);">
<tr><td style="background:#163029;padding:24px 32px;">
  <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">CHEKK<span style="color:#AAFF04;">U</span></span>
  <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">SWMS Platform</div>
</td></tr>
<tr><td style="background:#F6B73C;padding:11px 32px;">
  <span style="font-size:13px;font-weight:700;color:#163029;">&#x1F4CB; SWMS Submitted for Review</span>
</td></tr>
<tr><td style="padding:28px 32px;">
  <p style="font-size:15px;color:#163029;margin:0 0 20px;">${fileNote}</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8EEEC;border-radius:8px;overflow:hidden;margin-bottom:0;">
    ${row('Name', d.name)}
    ${row('Email', `<a href="mailto:${d.email}" style="color:#163029;">${d.email}</a>`)}
    ${row('Trade', d.trade)}
    ${row('File', d.fileName)}
    ${d.notes ? row('Notes', d.notes) : ''}
    ${row('Submitted', d.today)}
  </table>
</td></tr>
<tr><td style="padding:14px 32px;background:#F4F7F5;border-top:1px solid #E8EEEC;">
  <p style="font-size:11px;color:#A0BEB5;margin:0;">ChekkU SWMS &mdash; <a href="https://swms.chekku.au" style="color:#3E7264;text-decoration:none;">swms.chekku.au</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: 'Email service not configured' });

  const { name, email, trade, notes, fileName, fileBase64 } = req.body || {};
  const today = new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  const hasFile = !!fileBase64;

  const attachments = hasFile && fileName
    ? [{ filename: fileName, content: fileBase64 }]
    : [];

  const html = buildEmail({ name, email, trade, notes, fileName, today, hasFile });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [ADMIN_EMAIL],
        subject: `SWMS Submitted for Review — ${name} — ${trade}`,
        html,
        attachments
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || `Resend error ${r.status}`);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('notify-upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
