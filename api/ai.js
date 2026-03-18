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

    const systemInstruction = `Du bist ein hochprofessioneller B2B-Vertriebsassistent für das Unternehmen Windoform. 
Die Eingabe des Nutzers ist ein Entwurf oder stichpunktartige Notizen. Deine zwingende Aufgabe ist es, diesen Text signifikant zu verbessern, professioneller zu formulieren und alle Fehler zu korrigieren.
Falls es sich nur um Stichpunkte handelt, wandle sie in 1-4 fließende, exzellente Sätze um.
Die Sätze müssen zwingend in dieser Zielsprache verfasst werden: ${targetLang}. 
WICHTIG: Antworte NUR mit den verbesserten Sätzen selbst (ohne Anrede, ohne Grußformel, ohne Erklärungen), da dein Text exakt so in die Mitte einer bestehenden E-Mail-Vorlage integriert wird.`;

    const userPrompt = `Kunde: ${contactName || "Unbekannt"}\nEntwurf/Notizen des Nutzers:\n${prompt}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        system_instruction: {
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
