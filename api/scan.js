// api/scan.js – Vercel Serverless Function
// This runs on the server so the Claude API key stays secret

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "CLAUDE_API_KEY not configured on server" });
  }

  try {
    const { image, mediaType } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: image,
                },
              },
              {
                type: "text",
                text: `Du bist ein OCR-Spezialist für Visitenkarten. Extrahiere ALLE Kontaktdaten von dieser Visitenkarte.

Antworte NUR mit einem JSON-Objekt in diesem Format (leerer String wenn nicht gefunden):
{
  "name": "Vollständiger Name",
  "company": "Firmenname",
  "position": "Jobtitel / Position",
  "email": "Email-Adresse",
  "phone": "Telefonnummer",
  "mobile": "Mobilnummer (falls separat)",
  "website": "Website URL",
  "address": "Adresse",
  "linkedin": "LinkedIn URL falls vorhanden",
  "notes": "Sonstige Infos auf der Karte"
}

WICHTIG: 
- Erkenne auch türkische, arabische und andere internationale Zeichen korrekt
- Wenn mehrere Telefonnummern: erste = phone, zweite = mobile
- Gib NUR valides JSON zurück, kein anderer Text`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Claude API error:", err);
      return res.status(response.status).json({ error: "Claude API error", details: err });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const cleaned = text.replace(/```json|```/g, "").trim();

    try {
      const contact = JSON.parse(cleaned);
      return res.status(200).json({ success: true, contact });
    } catch (parseErr) {
      return res.status(200).json({ success: false, raw: text, error: "Could not parse response" });
    }
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
