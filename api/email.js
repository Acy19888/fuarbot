// api/email.js – Vercel Serverless Function
// Auto-detects language from email domain + contact name

import nodemailer from "nodemailer";

// ============================================================
// Language detection
// ============================================================
function detectLanguage(email, contactName) {
  const domain = (email || "").toLowerCase().split("@")[1] || "";
  const name = (contactName || "").toLowerCase();

  // Turkish indicators
  const trDomains = [".tr", ".com.tr", ".org.tr", ".net.tr"];
  const trChars = /[çğıöşüÇĞİÖŞÜ]/;
  const trNames = ["ahmet", "mehmet", "ayşe", "fatih", "mustafa", "ali", "hasan", "hüseyin", "ibrahim", "ömer", "yusuf", "elif", "zeynep", "deniz", "emre", "burak", "can", "cem", "murat", "serkan", "tolga", "onur", "kemal", "osman", "selim", "berat", "arda", "barış", "gökhan", "sinan", "volkan", "erdem", "özgür", "tuğba", "selin", "derya", "gül", "pınar", "melek", "esra", "merve", "başak", "defne", "ecrin", "nisa", "yüksel", "özkan", "demir", "yılmaz", "kaya", "çelik", "şahin", "aydın", "arslan", "doğan", "polat", "koç", "aksoy", "kurt"];
  if (trDomains.some((d) => domain.endsWith(d))) return "tr";
  if (trChars.test(contactName || "")) return "tr";
  if (trNames.some((n) => name.includes(n))) return "tr";

  // German indicators
  const deDomains = [".de", ".at", ".ch"];
  const deNames = ["stefan", "michael", "thomas", "andreas", "markus", "peter", "klaus", "hans", "werner", "heinrich", "wolfgang", "jürgen", "dieter", "bernd", "frank", "martin", "matthias", "christian", "uwe", "ralf", "sabine", "monika", "petra", "andrea", "susanne", "gabriele", "birgit", "ursula", "heike", "karin", "müller", "schmidt", "schneider", "fischer", "weber", "meyer", "wagner", "becker", "hoffmann", "richter", "schäfer", "koch", "bauer", "klein", "wolf", "schröder", "neumann", "schwarz", "braun", "zimmermann", "krüger"];
  if (deDomains.some((d) => domain.endsWith(d))) return "de";
  if (deNames.some((n) => name.includes(n))) return "de";

  // Spanish indicators
  const esDomains = [".es", ".com.es", ".mx", ".com.mx", ".ar", ".com.ar", ".cl", ".co", ".com.co", ".pe"];
  if (esDomains.some((d) => domain.endsWith(d))) return "es";

  // French indicators
  const frDomains = [".fr", ".com.fr", ".be"];
  if (frDomains.some((d) => domain.endsWith(d))) return "fr";

  // Italian indicators
  const itDomains = [".it", ".com.it"];
  if (itDomains.some((d) => domain.endsWith(d))) return "it";

  // Default: English
  return "en";
}

// ============================================================
// Email templates per language
// ============================================================
function getEmailContent(lang, contactName, messeName, salesPerson, company, catalogUrl) {
  const templates = {
    de: {
      subject: `Vielen Dank für Ihren Besuch – ${messeName}`,
      greeting: `Sehr geehrte/r <strong>${contactName}</strong>,`,
      body1: `vielen Dank für Ihren Besuch an unserem Stand auf der <strong>${messeName}</strong>. Es war uns eine große Freude, Sie persönlich kennenzulernen und mit Ihnen ins Gespräch zu kommen.`,
      body2: `Wie besprochen sende ich Ihnen gerne unseren aktuellen Katalog mit weiteren Informationen:`,
      cta: `📄 Katalog ansehen`,
      body3: `Sollten Sie Fragen haben, stehe ich Ihnen jederzeit gerne zur Verfügung.`,
      closing: `Mit freundlichen Grüßen,`,
      footer: `Diese E-Mail wurde im Anschluss an Ihren Messebesuch versendet.`,
    },
    tr: {
      subject: `Ziyaretiniz için teşekkürler – ${messeName}`,
      greeting: `Sayın <strong>${contactName}</strong>,`,
      body1: `<strong>${messeName}</strong> fuarında standımızı ziyaret ettiğiniz için çok teşekkür ederiz. Sizinle tanışmak ve görüşmek bizim için büyük bir memnuniyet oldu.`,
      body2: `Görüşmemizde belirttiğimiz gibi, ürün yelpazemiz hakkında daha fazla bilgi içeren güncel kataloğumuzu sizinle paylaşmak isteriz:`,
      cta: `📄 Kataloğu Görüntüle`,
      body3: `Herhangi bir sorunuz olursa, lütfen benimle iletişime geçmekten çekinmeyin.`,
      closing: `Saygılarımla,`,
      footer: `Bu e-posta fuar ziyaretinizin ardından gönderilmiştir.`,
    },
    es: {
      subject: `Gracias por su visita – ${messeName}`,
      greeting: `Estimado/a <strong>${contactName}</strong>,`,
      body1: `Le agradecemos sinceramente su visita a nuestro stand en <strong>${messeName}</strong>. Fue un gran placer conocerle personalmente y conversar con usted.`,
      body2: `Como comentamos, me complace enviarle nuestro catálogo actual con más información sobre nuestra gama de productos:`,
      cta: `📄 Ver catálogo`,
      body3: `Si tiene alguna pregunta, no dude en ponerse en contacto conmigo.`,
      closing: `Atentamente,`,
      footer: `Este correo fue enviado tras su visita a la feria.`,
    },
    fr: {
      subject: `Merci pour votre visite – ${messeName}`,
      greeting: `Cher/Chère <strong>${contactName}</strong>,`,
      body1: `Nous vous remercions sincèrement pour votre visite sur notre stand au <strong>${messeName}</strong>. Ce fut un grand plaisir de vous rencontrer et d'échanger avec vous.`,
      body2: `Comme convenu, je vous envoie avec plaisir notre catalogue actuel avec plus d'informations sur notre gamme de produits :`,
      cta: `📄 Voir le catalogue`,
      body3: `Si vous avez des questions, n'hésitez pas à me contacter.`,
      closing: `Cordialement,`,
      footer: `Cet e-mail a été envoyé suite à votre visite au salon.`,
    },
    it: {
      subject: `Grazie per la Sua visita – ${messeName}`,
      greeting: `Gentile <strong>${contactName}</strong>,`,
      body1: `La ringraziamo per aver visitato il nostro stand al <strong>${messeName}</strong>. È stato un grande piacere conoscerLa e parlare con Lei.`,
      body2: `Come discusso, Le invio con piacere il nostro catalogo attuale con ulteriori informazioni:`,
      cta: `📄 Visualizza il catalogo`,
      body3: `Per qualsiasi domanda, non esiti a contattarmi.`,
      closing: `Cordiali saluti,`,
      footer: `Questa e-mail è stata inviata in seguito alla Sua visita in fiera.`,
    },
    en: {
      subject: `Thank you for visiting us – ${messeName}`,
      greeting: `Dear <strong>${contactName}</strong>,`,
      body1: `Thank you for visiting our booth at <strong>${messeName}</strong>. It was a great pleasure to meet you in person and discuss potential opportunities together.`,
      body2: `As discussed, I would like to share our current catalog with more information about our product range:`,
      cta: `📄 View Catalog`,
      body3: `Should you have any questions, please don't hesitate to reach out.`,
      closing: `Best regards,`,
      footer: `This email was sent following your visit at the trade fair.`,
    },
  };

  return templates[lang] || templates.en;
}

// ============================================================
// Handler
// ============================================================
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
      companyName, catalogUrl, userPhone, avatar, customMessage
    } = req.body;

    if (!to || !contactName) return res.status(400).json({ error: "Missing: to, contactName" });
    if (!smtpHost || !smtpUser || !smtpPass) return res.status(400).json({ error: "SMTP not configured" });

    // Detect language
    const lang = detectLanguage(to, contactName);
    const company = companyName || "Windoform";
    const catalog = catalogUrl || "https://windoform.de";
    const fromAddr = smtpFrom || smtpUser;
    const port = parseInt(smtpPort) || 465;

    const t = getEmailContent(lang, contactName, messeName, salesPerson, company, catalog);

    console.log(`[Email] To: ${to}, Lang: ${lang}, Via: ${smtpHost}`);

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure: port === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    });

    const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f5;">
<div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:#2B5597;padding:32px 40px;">
<h1 style="margin:0;color:#fff;font-size:20px;font-weight:600;">${company}</h1>
</div>
<div style="padding:40px;">
<p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">${t.greeting}</p>
${customMessage ? `<p style="font-size:15px;color:#333;font-weight:500;line-height:1.7;margin:0 0 20px;padding:16px;background:#f0f5fc;border-radius:6px;border-left:4px solid #2B5597;">${customMessage.replace(/\n/g, '<br>')}</p>` : ""}
<p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">${t.body1}</p>
<p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 24px;">${t.body2}</p>
<div style="text-align:center;margin:32px 0;">
<a href="${catalog}" style="display:inline-block;background:#2B5597;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(43,85,151,0.3);">
${t.cta}
</a>
</div>
<p style="font-size:15px;color:#555;line-height:1.7;margin:0 0 16px;">${t.body3}</p>
<p style="font-size:15px;color:#555;line-height:1.7;margin:24px 0 0;">${t.closing}</p>
<table style="margin-top:24px;border-top:1px solid #ddd;padding-top:20px;width:100%;border-collapse:collapse;">
  <tr>
    <td colspan="2" style="padding-bottom: 12px;padding-left:0;padding-right:0;">
      <p style="margin:0;font-size:15px;font-weight:700;color:#2B5597;letter-spacing:0.5px;">WİNDOFORM PVC KAPI VE PENCERE AKSESUARLARI</p>
    </td>
  </tr>
  <tr>
    ${avatar ? `<td style="width:75px;vertical-align:top;padding:0;"><img src="${avatar}" style="width:64px;height:64px;border-radius:50%;display:block;margin-right:16px;" alt="" /></td>` : ""}
    <td style="vertical-align:top;padding:0;">
      <p style="margin:0;font-size:14px;font-weight:600;color:#555;">Mit freundlichem Gruß,</p>
      <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#222;">${salesPerson || "—"}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#666;line-height:1.5;">
        <strong style="color:#2B5597;">E:</strong> <a href="mailto:${fromAddr}" style="color:#2B5597;text-decoration:none;">${fromAddr}</a><br/>
        ${userPhone ? `<strong style="color:#2B5597;">T:</strong> ${userPhone}<br/>` : ""}
      </p>
      <p style="margin:12px 0 0;font-size:12px;color:#888;line-height:1.5;">
        Kazım Karabekir Mh. Bekir Saydam Cd.<br/>
        No:104 A-10 Blok No:7-8<br/>
        Pancar Torbalı / İZMİR
      </p>
    </td>
  </tr>
</table>
</div>
<div style="background:#f8f8f8;padding:20px 40px;border-top:1px solid #eee;">
<p style="font-size:12px;color:#999;margin:0;text-align:center;">${t.footer}</p>
</div>
</div>
</body></html>`;

    const info = await transporter.sendMail({
      from: `"${salesPerson || company}" <${fromAddr}>`,
      to,
      subject: t.subject,
      html: htmlBody,
    });

    return res.status(200).json({ success: true, messageId: info.messageId, language: lang, htmlBody });

  } catch (err) {
    console.error("Email error:", err.message);
    return res.status(500).json({
      error: "Email fehlgeschlagen",
      message: err.code === "EAUTH" ? "SMTP Login fehlgeschlagen"
        : err.code === "ESOCKET" ? "SMTP Server nicht erreichbar"
        : err.message,
    });
  }
}
