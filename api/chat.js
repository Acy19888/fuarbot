// api/chat.js – AI Chatbot: answers questions about contacts & quotes
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "CLAUDE_API_KEY not configured" });

  const { question, contacts = [], quotes = [], lang = "de" } = req.body || {};
  if (!question) return res.status(400).json({ error: "No question provided" });

  // Build contact summary
  const contactSummary = contacts.slice(0, 300).map(c =>
    `KONTAKT: ${c.name || "?"} | Firma: ${c.company || ""} | Email: ${c.email || ""} | Tel: ${c.phone || ""}`
  ).join("\n");

  // Sort quotes by date descending (newest first)
  const sortedQuotes = [...quotes].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const quoteSummary = sortedQuotes.slice(0, 300).map(q => {
    const lines = Array.isArray(q.lines) && q.lines.length > 0
      ? q.lines.map(l => {
          const product = l.product || "";
          const desc = l.description || "";
          const qty = l.qty || 1;
          const price = l.unitPrice || 0;
          const total = (parseFloat(qty) * parseFloat(price)).toFixed(2);
          return `  - ${product}${desc ? " – " + desc : ""}: ${qty} Stk. × ${price} ${q.currency || "EUR"} = ${total} ${q.currency || "EUR"}`;
        }).join("\n")
      : (q.product ? `  - ${q.product}: Gesamt ${q.totalGross} ${q.currency || "EUR"}` : "  (keine Positionen)");

    const date = q.createdAt ? new Date(q.createdAt).toLocaleDateString("de-DE") : "?";
    return `---
Angebot: ${q.quoteNumber || "?"} | Kunde: ${q.contactName || q.contactEmail || "?"} | Firma: ${q.company || ""}
Status: ${q.status || "draft"} | Datum: ${date} | Gesamt: ${q.totalGross || 0} ${q.currency || "EUR"}
${lines}`;
  }).join("\n");

  const systemPrompt = `Du bist ein KI-Assistent für WINDOFORM (Türkischer Hersteller von Tür- und Fenstergriffen).

ANTWORT-FORMAT (immer einhalten):
- Strukturiere Antworten klar mit Trennlinien und Bullet-Points
- Für jeden gefundenen Datensatz: nutze "---" als Trenner
- Nutze "▸ Feldname: Wert" für Details
- Wenn nach Preisen gefragt: zeige Angebotsnummer, Datum, Produkt/Griff, Stückpreis, Gesamt
- Maximal 3-4 Angebote anzeigen, neueste zuerst
- Antworte auf Deutsch (außer Frage ist Türkisch → Türkisch)
- Kurz und präzise, keine langen Erklärungen

HEUTE: ${new Date().toLocaleDateString("de-DE")}

=== KONTAKTE (${contacts.length} gesamt) ===
${contactSummary || "Keine Kontakte"}

=== ANGEBOTE (${quotes.length} gesamt, neueste zuerst) ===
${quoteSummary || "Keine Angebote"}

Suche bei Namen/Firmen auch nach Teilübereinstimmungen (z.B. "Ege" findet "Ege Akustik").
Erfinde NIEMALS Daten. Wenn nothing found → "Kein Angebot gefunden für [Name]."`;

  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: question }]
      })
    });

    const data = await claudeRes.json();
    if (!claudeRes.ok) {
      console.error("Claude error:", JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || "Claude API error" });
    }

    const answer = data.content?.[0]?.text || "Keine Antwort erhalten.";
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("Chat error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
