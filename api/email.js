// api/email.js – Vercel Serverless Function
// Accepts per-user SMTP settings from the frontend

import nodemailer from "nodemailer";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      to, contactName, messeName, salesPerson,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
      companyName, catalogUrl,
    } = req.body;

    if (!to || !contactName) {
      return res.status(400).json({ error: "Missing: to, contactName" });
    }
    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.status(400).json({ error: "SMTP not configured. Please set up your email in Settings." });
    }

    const port = parseInt(smtpPort) || 465;
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    });

    const company = companyName || "Windoform";
    const catalog = catalogUrl || "https://windoform.de";
    const fromAddr = smtpFrom || smtpUser;

    const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f5;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:#1a1a2e;padding:32px 40px;">
<h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">${company}</h1>
</div>
<div style="padding:40px;">
<p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">
Sehr geehrte/r <strong>${contactName}</strong>,
</p>
<p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">
vielen Dank für Ihren Besuch an unserem Stand auf der <strong>${messeName || "Messe"}</strong>.
Es war uns eine große Freude, Sie persönlich kennenzulernen und mit Ihnen ins Gespräch zu kommen.
</p>
<p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">
Wie besprochen sende ich Ihnen gerne unseren aktuellen Katalog mit weiteren Informationen:
</p>
<div style="text-align:center;margin:32px 0;">
<a href="${catalog}" style="display:inline-block;background:#E8553D;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(232,85,61,0.3);">
📄 Katalog ansehen
</a>
</div>
<p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">
Sollten Sie Fragen haben, stehe ich Ihnen jederzeit gerne zur Verfügung.
</p>
<p style="font-size:15px;color:#555;line-height:1.7;margin:24px 0 0;">Mit freundlichen Grüßen,</p>
<p style="font-size:16px;color:#333;font-weight:600;margin:8px 0 0;">${salesPerson || "Ihr Ansprechpartner"}</p>
<p style="font-size:14px;color:#888;margin:4px 0 0;">${company}</p>
</div>
<div style="background:#f8f8f8;padding:20px 40px;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;text-align:center;">
Diese E-Mail wurde im Anschluss an Ihren Messebesuch versendet.
</p>
</div>
</div>
</body></html>`;

    const info = await transporter.sendMail({
      from: `"${salesPerson || company}" <${fromAddr}>`,
      to,
      subject: `Vielen Dank für Ihren Besuch – ${messeName || "Messe"}`,
      html: htmlBody,
    });

    console.log("Email sent:", info.messageId, "via", smtpHost);
    return res.status(200).json({ success: true, messageId: info.messageId });

  } catch (err) {
    console.error("Email error:", err.message);
    return res.status(500).json({
      error: "Email fehlgeschlagen",
      message: err.code === "EAUTH" ? "SMTP Login fehlgeschlagen – Benutzername oder Passwort falsch"
        : err.code === "ESOCKET" ? "SMTP Server nicht erreichbar – Host oder Port prüfen"
        : err.message,
    });
  }
}
