// api/quote.js – AI-powered quote generation and sending
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

// ============================================================
// RAL Color Dictionary (most common codes)
// ============================================================
const RAL_COLORS = {
  "1000": "Grünbeige", "1001": "Beige", "1002": "Sandgelb", "1003": "Signalgelb",
  "1004": "Goldgelb", "1005": "Honiggelb", "1006": "Maisgelb", "1007": "Narzissengelb",
  "1013": "Perlweiß", "1014": "Elfenbein", "1015": "Hellelfenbein", "1016": "Schwefelgelb",
  "1017": "Safrangelb", "1018": "Zinkgelb", "1019": "Graubeige", "1020": "Olivgelb",
  "1021": "Rapsgelb", "1023": "Verkehrsgelb", "1024": "Ockergelb", "1026": "Leuchtgelb",
  "1027": "Currygelb", "1028": "Melonengelb", "1032": "Ginstergelb", "1033": "Dahliengelb",
  "1034": "Pastellgelb", "2000": "Gelborange", "2001": "Rotorange", "2002": "Blutorange",
  "2003": "Pastellorange", "2004": "Reinorange", "2005": "Leuchtorange", "2007": "Leuchthellorange",
  "2008": "Hellrotorange", "2009": "Verkehrsorange", "2010": "Signalorange",
  "2011": "Tieforange", "2012": "Lachsorange", "3000": "Feuerrot", "3001": "Signalrot",
  "3002": "Karminrot", "3003": "Rubinrot", "3004": "Purpurrot", "3005": "Weinrot",
  "3007": "Schwarzrot", "3009": "Oxidrot", "3012": "Beigerot", "3013": "Tomatenrot",
  "3014": "Altrosa", "3015": "Hellrosa", "3016": "Korallenrot", "3017": "Rose",
  "3018": "Erdbeerrot", "3020": "Verkehrsrot", "3022": "Lachsrot", "3024": "Leuchtrot",
  "3026": "Leuchthellrot", "3027": "Himbeerrot", "3028": "Reinrot", "3031": "Orientrot",
  "4001": "Rotlila", "4002": "Rotviolett", "4003": "Erikaviolett", "4004": "Bordeauxviolett",
  "4005": "Blaulila", "4006": "Verkehrspurpur", "4007": "Purpurviolett", "4008": "Signalviolett",
  "4009": "Pastellviolett", "4010": "Telemagenta", "5000": "Violettblau", "5001": "Grünblau",
  "5002": "Ultramarinblau", "5003": "Saphirblau", "5004": "Schwarzblau", "5005": "Signalblau",
  "5007": "Brillantblau", "5008": "Graublau", "5009": "Azurblau", "5010": "Enzianblau",
  "5011": "Stahlblau", "5012": "Hellblau", "5013": "Kobaltblau", "5014": "Taubenblau",
  "5015": "Himmelblau", "5017": "Verkehrsblau", "5018": "Türkisblau", "5019": "Capriblau",
  "5020": "Ozeanblau", "5021": "Wasserblau", "5022": "Nachtblau", "5023": "Fernblau",
  "5024": "Pastellblau", "6000": "Patinagrün", "6001": "Smaragdgrün", "6002": "Laubgrün",
  "6003": "Olivgrün", "6004": "Blaugrün", "6005": "Moosgrün", "6006": "Grauoliv",
  "6007": "Flaschengrün", "6008": "Braungrün", "6009": "Tannengrün", "6010": "Grasgrün",
  "6011": "Resedagrün", "6012": "Schwarzgrün", "6013": "Schilfgrün", "6014": "Gelboliv",
  "6015": "Schwarzoliv", "6016": "Türkisgrün", "6017": "Maigrün", "6018": "Gelbgrün",
  "6019": "Weißgrün", "6020": "Chromoxidgrün", "6021": "Blaßgrün", "6022": "Braunoliv",
  "6024": "Verkehrsgrün", "6025": "Farngrün", "6026": "Opalgrün", "6027": "Lichtgrün",
  "6028": "Kieferngrün", "6029": "Minzgrün", "6032": "Signalgrün", "6033": "Minttürkis",
  "6034": "Pastelltürkis", "6035": "Perlgrün", "6036": "Perlopalgrün", "7000": "Fehgrau",
  "7001": "Silbergrau", "7002": "Olivgrau", "7003": "Moosgrau", "7004": "Signalgrau",
  "7005": "Mausgrau", "7006": "Beigegrau", "7008": "Khakigrau", "7009": "Grüngrau",
  "7010": "Zeltgrau", "7011": "Eisengrau", "7012": "Basaltgrau", "7013": "Braungrau",
  "7015": "Schiefergrau", "7016": "Anthrazitgrau", "7021": "Schwarzgrau", "7022": "Umbragrau",
  "7023": "Betongrau", "7024": "Graphitgrau", "7026": "Granitgrau", "7030": "Steingrau",
  "7031": "Blaugrau", "7032": "Kieselgrau", "7033": "Zementgrau", "7034": "Gelbgrau",
  "7035": "Lichtgrau", "7036": "Platingrau", "7037": "Staubgrau", "7038": "Achatgrau",
  "7039": "Quarzgrau", "7040": "Fenstergrau", "7042": "Verkehrsgrau A", "7043": "Verkehrsgrau B",
  "7044": "Seidengrau", "7045": "Telegrau 1", "7046": "Telegrau 2", "7047": "Telegrau 4",
  "7048": "Perlmausgrau", "8000": "Grünbraun", "8001": "Ockerbraun", "8002": "Signalbraun",
  "8003": "Lehmbraun", "8004": "Kupferbraun", "8007": "Rehbraun", "8008": "Olivbraun",
  "8011": "Nußbraun", "8012": "Rotbraun", "8014": "Sepiabraun", "8015": "Kastanienbraun",
  "8016": "Mahagoniebraun", "8017": "Schokoladebraun", "8019": "Graubraun", "8022": "Schwarzbraun",
  "8023": "Orangebraun", "8024": "Beigebraun", "8025": "Blaßbraun", "8028": "Terrabraun",
  "9001": "Cremeweiß", "9002": "Grauweiß", "9003": "Signalweiß", "9004": "Signalschwarz",
  "9005": "Tiefschwarz", "9006": "Weißaluminium", "9007": "Graualuminium", "9010": "Reinweiß",
  "9011": "Graphitschwarz", "9016": "Verkehrsweiß", "9017": "Verkehrsschwarz", "9018": "Papyrusweiß"
};

function getRalColorName(ralCode) {
  const code = (ralCode || "").replace(/[^0-9]/g, "");
  return RAL_COLORS[code] ? `RAL ${code} (${RAL_COLORS[code]})` : `RAL ${code}`;
}

// ============================================================
// Quote number generator
// ============================================================
function generateQuoteNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ANG-${y}${m}-${rand}`;
}

// ============================================================
// Build HTML Quote from structured data
// ============================================================
function buildHtmlQuote({ quoteNumber, date, company, salesPerson, userPhone, contact, lines, totalNet, vat, totalGross, currency, notes, lang }) {
  const L = {
    de: { title: "Angebot", pos: "Pos.", product: "Produkt / Beschreibung", qty: "Menge", unit: "Einheit", unitStr: "Stk.", unitPrice: "Einzelpreis", total: "Gesamtpreis", net: "Gesamtbetrag (Netto)", vatLabel: "MwSt.", gross: "Bruttobetrag", validity: "Gültigkeit", validityVal: "30 Tage", delivery: "Lieferbedingungen", deliveryVal: "EXW (Ex Works)", payment: "Zahlungsbedingungen", paymentVal: "30 Tage netto", greeting: "Sehr geehrte Damen und Herren,", closing: "Mit freundlichen Grüßen", to: "Angeboten an", from: "Von" },
    tr: { title: "Teklif", pos: "Pos.", product: "Ürün / Açıklama", qty: "Miktar", unit: "Birim", unitStr: "Adet", unitPrice: "Birim Fiyat", total: "Toplam Fiyat", net: "Toplam Tutar (Net)", vatLabel: "KDV", gross: "Brüt Tutar", validity: "Geçerlilik", validityVal: "30 gün", delivery: "Teslimat Şekli", deliveryVal: "EXW (Ex Works)", payment: "Ödeme Koşulları", paymentVal: "30 gün net", greeting: "Sayın Yetkili,", closing: "Saygılarımla", to: "Teklif Sunulan", from: "Teklifi Sunan" },
    en: { title: "Quotation", pos: "Pos.", product: "Product / Description", qty: "Qty", unit: "Unit", unitStr: "pcs", unitPrice: "Unit Price", total: "Total", net: "Total Amount (Net)", vatLabel: "VAT", gross: "Gross Amount", validity: "Validity", validityVal: "30 days", delivery: "Delivery Terms", deliveryVal: "EXW (Ex Works)", payment: "Payment Terms", paymentVal: "30 days net", greeting: "Dear Sir or Madam,", closing: "Best regards", to: "Offered to", from: "From" }
  };
  const l = L[lang] || L.en;
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "TRY" ? "₺" : "€";
  const numLocale = currency === "USD" ? "en-US" : currency === "TRY" ? "tr-TR" : lang === "de" ? "de-DE" : lang === "tr" ? "tr-TR" : "en-US";
  const fmt = (n) => Number(n).toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + sym;
  // Normalize unit to language-specific string (AI sometimes returns German "Stk." regardless of language)
  const normUnit = (u) => (!u || ["Stk.", "Stk", "stk.", "adet", "Adet", "pcs", "Pcs", "piece", "pieces"].includes(u)) ? l.unitStr : u;

  const rows = lines.map((line, i) => `
    <tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:10px 8px;color:#555;font-size:13px;">${i + 1}</td>
      <td style="padding:10px 8px;color:#333;font-size:13px;line-height:1.5;"><strong>${line.product}</strong>${line.description ? `<br><span style="color:#888;font-size:12px;">${line.description}</span>` : ""}</td>
      <td style="padding:10px 8px;text-align:right;color:#555;font-size:13px;">${line.qty}</td>
      <td style="padding:10px 8px;text-align:center;color:#555;font-size:13px;">${normUnit(line.unit)}</td>
      <td style="padding:10px 8px;text-align:right;color:#555;font-size:13px;">${fmt(line.unitPrice)}</td>
      <td style="padding:10px 8px;text-align:right;color:#333;font-size:13px;font-weight:600;">${fmt(line.qty * line.unitPrice)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=800">
<title>${l.title} ${quoteNumber}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f5f5f5;">
<div style="max-width:700px;margin:24px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#2B5597,#1E4080);padding:32px 40px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <img src="https://raw.githubusercontent.com/Acy19888/fuarbot/main/public/logo.jpg" alt="${company}" style="height:48px;display:block;margin-bottom:12px;" />
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:1px;">${l.title.toUpperCase()}</h1>
    </div>
    <div style="text-align:right;color:rgba(255,255,255,0.85);font-size:13px;line-height:1.8;">
      <div style="font-size:16px;font-weight:700;color:#fff;">${quoteNumber}</div>
      <div>${date}</div>
    </div>
  </div>

  <!-- Contact + Company -->
  <div style="padding:32px 40px 0;display:flex;justify-content:space-between;gap:40px;">
    <div>
      <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">${l.to}</div>
      <div style="font-size:14px;color:#333;line-height:1.8;">
        <strong>${contact.name}</strong><br>
        ${contact.company ? contact.company + "<br>" : ""}
        ${contact.address ? contact.address.replace(/\n/g, "<br>") + "<br>" : ""}
        ${contact.email ? contact.email : ""}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">${l.from}</div>
      <div style="font-size:14px;color:#333;line-height:1.8;">
        <strong>${company}</strong><br>
        ${salesPerson}<br>
        ${userPhone || ""}
      </div>
    </div>
  </div>

  <!-- Greeting -->
  <div style="padding:24px 40px 0;font-size:14px;color:#333;">${l.greeting}</div>

  <!-- Products Table -->
  <div style="padding:24px 40px;">
    <table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#2B5597;">
          <th style="padding:12px 8px;text-align:left;color:#fff;font-size:12px;width:40px;">${l.pos}</th>
          <th style="padding:12px 8px;text-align:left;color:#fff;font-size:12px;">${l.product}</th>
          <th style="padding:12px 8px;text-align:right;color:#fff;font-size:12px;width:60px;">${l.qty}</th>
          <th style="padding:12px 8px;text-align:center;color:#fff;font-size:12px;width:60px;">${l.unit}</th>
          <th style="padding:12px 8px;text-align:right;color:#fff;font-size:12px;width:100px;">${l.unitPrice}</th>
          <th style="padding:12px 8px;text-align:right;color:#fff;font-size:12px;width:100px;">${l.total}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <!-- Totals -->
    <table style="width:100%;margin-top:16px;border-collapse:collapse;">
      <tr style="background:#f0f5fc;border-radius:6px;">
        <td style="width:60%;"></td>
        <td style="padding:10px 8px;font-size:15px;font-weight:700;color:#2B5597;">${l.net}</td>
        <td style="padding:10px 8px;font-size:15px;font-weight:700;color:#2B5597;text-align:right;">${fmt(totalNet)}</td>
      </tr>
    </table>
  </div>

  <!-- Terms -->
  <div style="padding:0 40px 24px;">
    <table style="width:100%;border-collapse:collapse;background:#f9f9f9;border-radius:8px;padding:16px;">
      <tr>
        <td style="padding:6px 16px;font-size:12px;color:#999;width:30%;">${l.validity}</td>
        <td style="padding:6px 16px;font-size:12px;color:#333;">${l.validityVal}</td>
        <td style="padding:6px 16px;font-size:12px;color:#999;width:30%;">${l.delivery}</td>
        <td style="padding:6px 16px;font-size:12px;color:#333;">${l.deliveryVal}</td>
      </tr>
      <tr>
        <td style="padding:6px 16px;font-size:12px;color:#999;">${l.payment}</td>
        <td colspan="3" style="padding:6px 16px;font-size:12px;color:#333;">${l.paymentVal}</td>
      </tr>
    </table>
  </div>

  ${notes ? `<div style="padding:0 40px 16px;font-size:13px;color:#555;line-height:1.6;border-left:3px solid #2B5597;margin:0 40px 24px;padding-left:16px;">${notes}</div>` : ""}

  <!-- Closing + Signature -->
  <div style="padding:0 40px 32px;">
    <p style="font-size:14px;color:#333;">${l.closing},<br><strong>${salesPerson}</strong><br><span style="color:#888;font-size:12px;">${company}</span></p>
  </div>

  <!-- Footer -->
  <div style="background:#f5f5f5;padding:16px 40px;font-size:11px;color:#aaa;text-align:center;">
    ${quoteNumber} · ${date} · ${company}
  </div>
</div>
</body></html>`;
}

// ============================================================
// Sanitize text for PDFKit built-in fonts (Windows-1252 range)
// Turkish: ş/Ş→s/S, ğ/Ğ→g/G, ı→i, İ→I — ü ö ç are fine in Win-1252
// ============================================================
function sanitizeForPdf(str) {
  if (!str) return "";
  return str
    .replace(/ş/g, "s").replace(/Ş/g, "S")
    .replace(/ğ/g, "g").replace(/Ğ/g, "G")
    .replace(/ı/g, "i").replace(/İ/g, "I")
    .replace(/₺/g, "TRY")
    .replace(/[^\x00-\xFF]/g, "?");
}

// ============================================================
// Short email body for PDF-attachment emails
// ============================================================
function buildEmailBody({ company, salesPerson, quoteNumber, lang }) {
  const sp = salesPerson || company;
  const bodies = {
    de: {
      text: `Sehr geehrte Damen und Herren,\n\nIhr Angebot ${quoteNumber} finden Sie im Anhang.\n\nMit freundlichen Grüßen\n${sp}\n${company}`,
      html: `<p>Sehr geehrte Damen und Herren,</p><p>Ihr Angebot <strong>${quoteNumber}</strong> finden Sie im Anhang.</p><p>Mit freundlichen Grüßen<br><strong>${sp}</strong><br>${company}</p>`
    },
    tr: {
      text: `Sayin Yetkili,\n\nTeklifiniz (${quoteNumber}) ekte yer almaktadir.\n\nSaygilarimla\n${sp}\n${company}`,
      html: `<p>Sayın Yetkili,</p><p>Teklifiniz (<strong>${quoteNumber}</strong>) ekte yer almaktadır.</p><p>Saygılarımla<br><strong>${sp}</strong><br>${company}</p>`
    },
    en: {
      text: `Dear Sir or Madam,\n\nPlease find your quotation ${quoteNumber} attached.\n\nBest regards\n${sp}\n${company}`,
      html: `<p>Dear Sir or Madam,</p><p>Please find your quotation <strong>${quoteNumber}</strong> attached.</p><p>Best regards<br><strong>${sp}</strong><br>${company}</p>`
    }
  };
  return bodies[lang] || bodies.en;
}

// ============================================================
// Build A4 PDF quote with pdfkit (server-side, no binary deps)
// ============================================================
async function buildPdfQuote({ quoteNumber, date, company, salesPerson, userPhone, contact, lines, totalNet, currency, notes, lang }) {
  const L = {
    de: { title: "Angebot", pos: "Pos.", product: "Produkt / Beschreibung", qty: "Menge", unit: "Einheit", unitStr: "Stk.", unitPrice: "Einzelpreis", total: "Gesamtpreis", net: "Gesamtbetrag (Netto)", validity: "Gültigkeit", validityVal: "30 Tage", delivery: "Lieferbedingungen", deliveryVal: "EXW (Ex Works)", payment: "Zahlungsbedingungen", paymentVal: "30 Tage netto", greeting: "Sehr geehrte Damen und Herren,", closing: "Mit freundlichen Grüßen", to: "Angeboten an", from: "Von" },
    tr: { title: "Teklif", pos: "Pos.", product: "Urun / Aciklama", qty: "Miktar", unit: "Birim", unitStr: "Adet", unitPrice: "Birim Fiyat", total: "Toplam Fiyat", net: "Toplam Tutar (Net)", validity: "Gecerlilik", validityVal: "30 gun", delivery: "Teslimat Sekli", deliveryVal: "EXW (Ex Works)", payment: "Odeme Kosullari", paymentVal: "30 gun net", greeting: "Sayin Yetkili,", closing: "Saygilarimla", to: "Teklif Sunulan", from: "Teklifi Sunan" },
    en: { title: "Quotation", pos: "Pos.", product: "Product / Description", qty: "Qty", unit: "Unit", unitStr: "pcs", unitPrice: "Unit Price", total: "Total", net: "Total Amount (Net)", validity: "Validity", validityVal: "30 days", delivery: "Delivery Terms", deliveryVal: "EXW (Ex Works)", payment: "Payment Terms", paymentVal: "30 days net", greeting: "Dear Sir or Madam,", closing: "Best regards", to: "Offered to", from: "From" }
  };
  const l = L[lang] || L.en;
  const s = sanitizeForPdf;

  // Currency formatting — avoid ₺ (not in Helvetica/Win-1252)
  const fmtAmt = (n) => {
    const abs = Number(n);
    const dec = (lang === "de" || lang === "tr")
      ? abs.toFixed(2).replace(".", ",")
      : abs.toFixed(2);
    if (currency === "USD") return "$ " + dec;
    if (currency === "TRY") return dec + " TRY";
    if (currency === "GBP") return dec + " GBP";
    return dec + " EUR";
  };

  const normUnit = (u) =>
    (!u || ["Stk.", "Stk", "stk.", "adet", "Adet", "pcs", "Pcs", "piece", "pieces"].includes(u))
      ? l.unitStr : u;

  // Fetch logo image for PDF embedding (fallback to text if unavailable)
  let logoBuffer = null;
  try {
    const logoRes = await fetch("https://raw.githubusercontent.com/Acy19888/fuarbot/main/public/logo.jpg");
    if (logoRes.ok) {
      const ab = await logoRes.arrayBuffer();
      logoBuffer = Buffer.from(ab);
    }
  } catch (_) { /* use text fallback */ }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
    const buffers = [];
    doc.on("data", chunk => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const W = 595.28;
    const H = 841.89;
    const mg = 40;
    const cW = W - 2 * mg; // 515.28

    // ── HEADER ──────────────────────────────────────────────
    doc.rect(0, 0, W, 90).fill("#2B5597");

    // Logo image (left side) or company name fallback
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, mg, 16, { height: 54, fit: [180, 54] });
      } catch (_) {
        doc.font("Helvetica-Bold").fontSize(18).fillColor("#ffffff")
           .text(s(company).toUpperCase(), mg, 22, { width: 280 });
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#ffffff")
         .text(s(company).toUpperCase(), mg, 22, { width: 280 });
    }

    // Quote type label below logo
    doc.font("Helvetica").fontSize(11).fillColor("rgba(255,255,255,0.8)")
       .text(l.title.toUpperCase(), mg, 74, { width: 280 });

    // Quote number & date – right-aligned in header
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#ffffff")
       .text(quoteNumber, mg, 22, { width: cW, align: "right" });

    doc.font("Helvetica").fontSize(10).fillColor("rgba(255,255,255,0.75)")
       .text(date, mg, 44, { width: cW, align: "right" });

    let y = 106;

    // ── TO / FROM ────────────────────────────────────────────
    const halfW = Math.floor(cW / 2) - 10; // ~247
    const col2X = mg + halfW + 20;

    doc.font("Helvetica").fontSize(8).fillColor("#aaaaaa")
       .text(l.to.toUpperCase(), mg, y, { width: halfW });
    doc.text(l.from.toUpperCase(), col2X, y, { width: halfW });

    y += 13;
    let leftY = y;
    let rightY = y;

    // Contact (left)
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#333333")
       .text(s(contact.name || ""), mg, leftY, { width: halfW });
    leftY += 14;
    doc.font("Helvetica").fontSize(10).fillColor("#555555");
    if (contact.company) { doc.text(s(contact.company), mg, leftY, { width: halfW }); leftY += 13; }
    if (contact.address) {
      contact.address.split("\n").forEach(line => {
        doc.text(s(line), mg, leftY, { width: halfW }); leftY += 13;
      });
    }
    if (contact.email) { doc.text(contact.email, mg, leftY, { width: halfW }); leftY += 13; }

    // From (right)
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#333333")
       .text(s(company), col2X, rightY, { width: halfW });
    rightY += 14;
    doc.font("Helvetica").fontSize(10).fillColor("#555555")
       .text(s(salesPerson || ""), col2X, rightY, { width: halfW });
    rightY += 13;
    if (userPhone) { doc.text(s(userPhone), col2X, rightY, { width: halfW }); rightY += 13; }

    y = Math.max(leftY, rightY) + 10;

    // Thin separator
    doc.moveTo(mg, y).lineTo(W - mg, y).lineWidth(0.5).strokeColor("#dddddd").stroke();
    y += 14;

    // ── GREETING ─────────────────────────────────────────────
    doc.font("Helvetica").fontSize(10).fillColor("#333333")
       .text(s(l.greeting), mg, y, { width: cW });
    y += 22;

    // ── PRODUCTS TABLE ────────────────────────────────────────
    // Column layout: pos(28) product(200) qty(40) unit(45) unitPrice(98) total(104) = 515
    const cols = [
      { label: l.pos,       x: mg,           w: 28,  align: "center" },
      { label: l.product,   x: mg + 28,      w: 200, align: "left"   },
      { label: l.qty,       x: mg + 228,     w: 40,  align: "right"  },
      { label: l.unit,      x: mg + 268,     w: 45,  align: "center" },
      { label: l.unitPrice, x: mg + 313,     w: 98,  align: "right"  },
      { label: l.total,     x: mg + 411,     w: 104, align: "right"  }
    ];

    // Header row
    doc.rect(mg, y, cW, 22).fill("#2B5597");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
    cols.forEach(col => {
      doc.text(col.label, col.x + 3, y + 7, { width: col.w - 6, align: col.align });
    });
    y += 22;

    // Data rows
    lines.forEach((line, i) => {
      const hasDesc = line.description && line.description.trim();
      const rowH = hasDesc ? 32 : 22;

      doc.rect(mg, y, cW, rowH).fill(i % 2 === 0 ? "#ffffff" : "#f6f8fc");
      doc.moveTo(mg, y + rowH).lineTo(W - mg, y + rowH)
         .lineWidth(0.3).strokeColor("#e0e0e0").stroke();

      const tY = y + 7;

      // Pos
      doc.font("Helvetica").fontSize(9).fillColor("#888888")
         .text(String(i + 1), cols[0].x + 3, tY, { width: cols[0].w - 6, align: "center" });

      // Product + optional description
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#222222")
         .text(s(line.product), cols[1].x + 3, tY, { width: cols[1].w - 6 });
      if (hasDesc) {
        doc.font("Helvetica").fontSize(8).fillColor("#888888")
           .text(s(line.description), cols[1].x + 3, y + 20, { width: cols[1].w - 6 });
      }

      // Qty
      doc.font("Helvetica").fontSize(9).fillColor("#555555")
         .text(String(line.qty), cols[2].x + 3, tY, { width: cols[2].w - 6, align: "right" });

      // Unit
      doc.text(normUnit(line.unit), cols[3].x + 3, tY, { width: cols[3].w - 6, align: "center" });

      // Unit price
      doc.text(fmtAmt(line.unitPrice), cols[4].x + 3, tY, { width: cols[4].w - 6, align: "right" });

      // Total (bold)
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#222222")
         .text(fmtAmt(line.qty * line.unitPrice), cols[5].x + 3, tY, { width: cols[5].w - 6, align: "right" });

      y += rowH;
    });

    y += 8;

    // ── NET TOTAL ─────────────────────────────────────────────
    const totBoxX = mg + 260;
    const totBoxW = cW - 260;
    doc.rect(totBoxX, y, totBoxW, 28).fill("#eef2fb");
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#2B5597")
       .text(l.net, totBoxX + 6, y + 8, { width: totBoxW - 12 });
    doc.text(fmtAmt(totalNet), totBoxX + 6, y + 8, { width: totBoxW - 12, align: "right" });
    y += 38;

    // ── TERMS ────────────────────────────────────────────────
    doc.rect(mg, y, cW, 46).fill("#f9f9f9");

    const tLabelW = 100;
    const tValW = halfW - tLabelW - 4;

    doc.font("Helvetica").fontSize(9).fillColor("#999999")
       .text(l.validity + ":", mg + 8, y + 8, { width: tLabelW });
    doc.fillColor("#333333")
       .text(l.validityVal, mg + 8 + tLabelW, y + 8, { width: tValW });

    doc.fillColor("#999999")
       .text(l.delivery + ":", col2X, y + 8, { width: tLabelW });
    doc.fillColor("#333333")
       .text(l.deliveryVal, col2X + tLabelW, y + 8, { width: tValW });

    doc.fillColor("#999999")
       .text(l.payment + ":", mg + 8, y + 26, { width: tLabelW });
    doc.fillColor("#333333")
       .text(l.paymentVal, mg + 8 + tLabelW, y + 26, { width: tValW });

    y += 56;

    // ── NOTES ────────────────────────────────────────────────
    if (notes && notes.trim()) {
      doc.rect(mg, y, 3, 20).fill("#2B5597"); // bar (height adjusted below visually)
      doc.font("Helvetica").fontSize(10).fillColor("#555555")
         .text(s(notes), mg + 12, y, { width: cW - 12 });
      y += 32;
    }

    // ── CLOSING ──────────────────────────────────────────────
    doc.font("Helvetica").fontSize(10).fillColor("#333333")
       .text(s(l.closing) + ",", mg, y);
    y += 14;
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#333333")
       .text(s(salesPerson || company), mg, y);
    y += 15;
    doc.font("Helvetica").fontSize(10).fillColor("#999999")
       .text(s(company), mg, y);

    // ── FOOTER ───────────────────────────────────────────────
    doc.rect(0, H - 30, W, 30).fill("#f5f5f5");
    doc.font("Helvetica").fontSize(9).fillColor("#aaaaaa")
       .text(`${quoteNumber}  ·  ${date}  ·  ${s(company)}`, 0, H - 18, { align: "center", width: W });

    doc.end();
  });
}

// ============================================================
// Product Database + Keyword Lookup
// ============================================================
const WINDOFORM_PRODUCTS = [
  { keys: ["asya", "asya akustik", "asya acoustic"], en: "Asya Acoustic Series", tr: "Asya Akustik Serisi", type: "acoustic window handle" },
  { keys: ["alfa", "alfa akustik", "alfa acoustic"], en: "Alfa Acoustic Series", tr: "Alfa Akustik Serisi", type: "acoustic window handle" },
  { keys: ["atlas"], en: "Atlas Series", tr: "Atlas Serisi", type: "window handle" },
  { keys: ["siena"], en: "Siena Series", tr: "Siena Serisi", type: "window handle" },
  { keys: ["belgrad", "belgrade"], en: "Belgrad Series", tr: "Belgrad Serisi", type: "window handle" },
  { keys: ["ege"], en: "Ege Series", tr: "Ege Serisi", type: "window handle" },
  { keys: ["porto"], en: "Porto Series", tr: "Porto Serisi", type: "window handle" },
  { keys: ["istanbul", "istanbul akustik", "istanbul acoustic"], en: "Istanbul Acoustic Series", tr: "Istanbul Akustik Serisi", type: "acoustic window handle" },
  { keys: ["sydney", "sydney akustik", "sydney acoustic"], en: "Sydney Acoustic Series", tr: "Sydney Akustik Serisi", type: "acoustic window handle" },
  { keys: ["poznan"], en: "Poznan Series", tr: "Poznan Serisi", type: "window handle" },
  { keys: ["milano", "milan"], en: "Milano Series", tr: "Milano Serisi", type: "window handle" },
  { keys: ["ibiza"], en: "Ibiza Series", tr: "Ibiza Serisi", type: "window handle" },
  { keys: ["izmir", "İzmir"], en: "Izmir Series", tr: "Izmir Serisi", type: "window handle" },
  { keys: ["mostar"], en: "Mostar Series", tr: "Mostar Serisi", type: "window handle" },
  { keys: ["lara"], en: "Lara Series", tr: "Lara Serisi", type: "window handle" },
  { keys: ["basik", "zero", "basik kollar"], en: "Zero Series", tr: "Basik Kollar Serisi", type: "flat handle" },
  { keys: ["munih", "munich", "münchen"], en: "Munich Series", tr: "Munih Serisi", type: "window handle" },
  { keys: ["paris serisi", "paris series"], en: "Paris Series", tr: "Paris Serisi", type: "window handle" },
  { keys: ["kiev", "kyiv"], en: "Kyiv Series", tr: "Kiev Serisi", type: "window handle" },
  { keys: ["bagdat", "baghdad", "bağdat"], en: "Baghdad Series", tr: "Bagdat Serisi", type: "window handle" },
  { keys: ["parisyen"], en: "Parisyen Series", tr: "Parisyen Serisi", type: "window handle" },
  { keys: ["hebe schiebe", "hebe"], en: "Hebe Schiebe Series", tr: "Hebe Schiebe Serisi", type: "lift-slide handle" },
  { keys: ["smyrna"], en: "Smyrna Series", tr: "Smyrna Serisi", type: "window handle" },
  { keys: ["trendy"], en: "Trendy Series", tr: "Trendy Serisi", type: "window handle" },
  { keys: ["basma kollar", "lever door", "basma"], en: "Lever Door Series", tr: "Basma Kollar Serisi", type: "lever door handle" },
  { keys: ["santafe", "granada", "santafe granada"], en: "Santafe-Granada Series", tr: "Santafe Granada Serisi", type: "door handle" },
  { keys: ["toledo"], en: "Toledo Series", tr: "Toledo Serisi", type: "door handle" },
  { keys: ["tiran", "tirana"], en: "Tiran Series", tr: "Tiran Serisi", type: "window handle" },
  { keys: ["madrid"], en: "Madrid Series", tr: "Madrid Serisi", type: "door handle" },
  { keys: ["metsa kollar", "metsa handle", "metsa"], en: "Metsa Handle Series", tr: "Metsa Kollar Serisi", type: "handle" },
  { keys: ["surme", "sürme", "sliding"], en: "Sliding Series", tr: "Surme Serisi", type: "sliding door handle" },
  { keys: ["metsa d", "d tipi", "dtype"], en: "Metsa DType Handle", tr: "Metsa D Tipi Kol", type: "handle" },
  { keys: ["mentese", "menteşe", "hinge", "hinges"], en: "Hinges", tr: "Menteseler", type: "hinge" },
  { keys: ["karsilik", "karşılık", "opposite", "strike plate"], en: "Opposite (Strike Plates)", tr: "Karsiliklar", type: "strike plate" },
  { keys: ["panjur", "shutter lock"], en: "Shutter Lock", tr: "Panjur Kilidi", type: "shutter lock" },
  { keys: ["montajmatik", "hinge installation", "installation kit"], en: "Hinge Installation Kit", tr: "Montajmatik", type: "installation kit" },
  { keys: ["havalandirma", "ventilation", "latch", "mandal"], en: "Ventilation (Security) Latch", tr: "Havalandirma Mandali", type: "ventilation latch" },
];

function findMatchingProducts(userRequest) {
  const lower = userRequest.toLowerCase();
  const matched = WINDOFORM_PRODUCTS.filter(p =>
    p.keys.some(k => lower.includes(k.toLowerCase()))
  );
  if (matched.length === 0) return null;
  return matched.map(p => `- ${p.en} (${p.tr}): ${p.type}`).join("\n");
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
      userRequest, contact, previousQuotes,
      salesPerson, messeName, companyName, catalogUrl,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
      userPhone, sendEmail, lang
    } = req.body;

    if (!userRequest || !contact) return res.status(400).json({ error: "Missing userRequest or contact" });

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "CLAUDE_API_KEY not configured" });

    const company = companyName || "Windoform";
    const quoteNumber = generateQuoteNumber();
    const date = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

    // Build previous quotes context
    const prevCtx = previousQuotes && previousQuotes.length > 0
      ? `\n\nPrevious quotes for this customer:\n${previousQuotes.slice(0, 5).map(q => `- ${q.quoteNumber}: ${q.product} @ ${q.totalPrice} ${q.currency} (${q.createdAt?.slice(0, 10)})`).join("\n")}`
      : "";

    // Smart product lookup - only inject matched products, not full catalog
    const matchedProducts = findMatchingProducts(userRequest);
    const productCtx = matchedProducts
      ? `\nMatched Windoform product(s) for this request:\n${matchedProducts}\nUse the correct product name from above in the quote.`
      : `\nNo specific product matched. Use the product name as written by the user.`;

    // Detect currency from user's request before sending to AI
    const reqLower = userRequest.toLowerCase();
    let detectedCurrency = "EUR"; // default
    if (/dollar|\busd\b|\$/.test(reqLower)) detectedCurrency = "USD";
    else if (/\btry\b|türk lira|turk lira|turkish lira|lira|₺/.test(reqLower)) detectedCurrency = "TRY";
    else if (/euro|€|\beur\b/.test(reqLower)) detectedCurrency = "EUR";

    const prompt = `You are a professional B2B sales assistant for ${company}.

COMPANY: WINDOFORM® - Turkish manufacturer of door and window handles for aluminum/PVC profiles. EXW pricing, no VAT for export. Payment: 30 days net.
RAL 9016 = Verkehrsweiss (white). All prices are NET EXW.
${productCtx}

The user wants to create a quote. Parse the request and return ONLY valid JSON (no markdown, no code fences).

User request: "${userRequest}"
Customer: ${contact.name || "Unknown"}, ${contact.company || ""}, ${contact.email || ""}, ${contact.address || ""}
Company creating quote: ${company}
Sales person: ${salesPerson || ""}
${prevCtx}

Instructions:
- RAL codes like "RAL 9016" or "9016" -> always include German color name. RAL 9016 = Verkehrsweiss (white)
- Extract: product name, quantity, unit price (or total price if given), any special notes
- If only total given (e.g. "5000"), set unitPrice = total / qty (default qty=1 if not given)
- Generate a professional product description including RAL color if present
- All prices are NET (no VAT) - EXW export pricing
- CURRENCY: The user specified "${detectedCurrency}" — use this currency code exactly in the response
- lang: "${lang || "de"}"
- UNIT: Use "${lang === "tr" ? "Adet" : lang === "en" ? "pcs" : "Stk."}" as the default unit for pieces

Return JSON:
{
  "lines": [{ "product": "string", "description": "string including RAL color name", "qty": number, "unit": "${lang === "tr" ? "Adet" : lang === "en" ? "pcs" : "Stk."}", "unitPrice": number }],
  "currency": "${detectedCurrency}",
  "notes": "any additional info or special conditions",
  "subject": "quote email subject line",
  "ralCode": "extracted RAL code or null",
  "ralColorName": "German color name from RAL or null"
}`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      return res.status(500).json({ error: "Claude API error", details: err.slice(0, 300) });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text?.trim() || "";

    let parsed;
    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "Could not parse AI response", raw: rawText.slice(0, 500) });
    }

    // Calculate totals
    const lines = parsed.lines || [];
    const totalNet = lines.reduce((s, l) => s + (l.qty * l.unitPrice), 0);
    const totalGross = totalNet; // No VAT for Turkish exports (EXW terms)
    const currency = parsed.currency || "EUR";

    // Enhance RAL description in lines
    const enhancedLines = lines.map(line => ({
      ...line,
      description: line.description || (parsed.ralCode ? getRalColorName(parsed.ralCode) : "")
    }));

    // Build HTML quote
    const htmlQuote = buildHtmlQuote({
      quoteNumber, date, company, salesPerson: salesPerson || company,
      userPhone: userPhone || "", contact, lines: enhancedLines,
      totalNet, vat: 0, totalGross: totalNet, currency,
      notes: parsed.notes || "", lang: lang || "de"
    });

    const product = lines[0]?.product || userRequest.slice(0, 60);
    const subject = parsed.subject || `Angebot ${quoteNumber} – ${product}`;

    // Send email if requested — PDF as attachment, short text body
    let emailSent = false;
    if (sendEmail && smtpHost && smtpUser && smtpPass && contact.email) {
      try {
        // Generate A4 PDF for attachment
        const pdfBuffer = await buildPdfQuote({
          quoteNumber, date, company, salesPerson: salesPerson || company,
          userPhone: userPhone || "", contact, lines: enhancedLines,
          totalNet, currency, notes: parsed.notes || "", lang: lang || "de"
        });

        const emailBody = buildEmailBody({
          company, salesPerson: salesPerson || company,
          quoteNumber, lang: lang || "de"
        });

        const transporter = nodemailer.createTransport({
          host: smtpHost, port: parseInt(smtpPort) || 465,
          secure: (parseInt(smtpPort) || 465) === 465,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false }
        });
        await transporter.sendMail({
          from: `"${company}" <${smtpFrom || smtpUser}>`,
          to: contact.email,
          subject,
          text: emailBody.text,
          html: emailBody.html,
          attachments: [{
            filename: `${quoteNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf"
          }]
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("Email send error:", emailErr.message);
        // Don't fail the whole request — return quote data anyway
      }
    }

    return res.status(200).json({
      success: true, emailSent, quoteNumber,
      product, totalNet, totalGross, currency,
      ralCode: parsed.ralCode || null,
      ralColorName: parsed.ralColorName || null,
      htmlQuote, subject, lines: enhancedLines,
      notes: parsed.notes || ""
    });

  } catch (error) {
    console.error("Quote handler error:", error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
}
