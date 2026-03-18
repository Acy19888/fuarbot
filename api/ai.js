// api/ai.js
export default async function handler(req, res) {
  // Add CORS headers for local testing
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { prompt, contactName, language } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured in Vercel environment." });
    }

    // Determine the language string for the prompt
    const langMap = {
      en: "Englisch",
      tr: "Türkisch",
      de: "Deutsch"
    };
    const targetLang = langMap[language] || "Deutsch";

    const systemInstruction = `Du bist ein professioneller B2B-Vertriebsassistent für das Unternehmen Windoform. 
Deine Aufgabe ist es, kurze, unformatierte Stichpunkte des Nutzers in 1-3 höchst professionelle, höfliche und fließende Sätze umzuwandeln, die direkt in eine E-Mail an einen Kunden eingefügt werden.
Die Sätze müssen zwingend in dieser Sprache verfasst werden: ${targetLang}. 
WICHTIG: Antworte NUR mit den formulierten Sätzen selbst (ohne Anrede, ohne Grußformel, ohne Erklärungen oder Anführungszeichen), da dein Text exakt so in eine bestehende E-Mail-Vorlage integriert wird.`;

    const userPrompt = `Kunde: ${contactName || "Unbekannt"}\nNotizen des Nutzers:\n${prompt}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Failed to communicate with Gemini API: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Fehler beim Generieren";

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error("AI handler error:", error);
    return res.status(500).json({ error: "Ein Fehler ist aufgetreten", details: error.message });
  }
}
