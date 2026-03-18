// api/ai.js – Vercel Serverless Function
export default async function handler(req, res) {
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

    const langMap = {
      en: "English",
      tr: "Turkish",
      de: "German",
      es: "Spanish",
      fr: "French",
      it: "Italian"
    };
    const targetLang = langMap[language] || "German";

    // Combine system instructions + user content into a single prompt
    // This avoids any issues with system_instruction API field support
    const fullPrompt = `You are a highly professional B2B sales assistant for the company Windoform.
The user's input is a rough draft or bullet-point notes. Your mandatory task is to significantly improve this text, make it more professional, and correct all errors.
If it is only bullet points, convert them into 1-4 fluent, excellent sentences.
The sentences MUST be written in this target language: ${targetLang}.
IMPORTANT: Reply ONLY with the improved sentences themselves (no greeting, no closing, no explanations), as your text will be embedded directly into the middle of an existing email template.

Customer name: ${contactName || "Unknown"}
User's draft/notes:
${prompt}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 400
          }
        })
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Gemini API error:", response.status, responseText);
      return res.status(500).json({ error: `Gemini API error ${response.status}`, details: responseText.slice(0, 300) });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("JSON parse error:", responseText);
      return res.status(500).json({ error: "Invalid JSON from Gemini API" });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      console.error("Empty Gemini response:", JSON.stringify(data));
      return res.status(500).json({ error: "Gemini returned an empty response", raw: JSON.stringify(data).slice(0, 300) });
    }

    return res.status(200).json({ result: text });

  } catch (error) {
    console.error("AI handler error:", error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
}
