// api/ai.js – Vercel Serverless Function (uses Claude, same as scan.js)
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

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "CLAUDE_API_KEY is not configured in Vercel environment." });
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

    const systemPrompt = `You are a highly professional B2B sales assistant for the company Windoform.
The user's input is a rough draft or bullet-point notes. Your mandatory task is to significantly improve this text, make it more professional, and correct all errors.
If it is only bullet points, convert them into 1-4 fluent, excellent sentences.
The sentences MUST be written in this target language: ${targetLang}.
IMPORTANT: Reply ONLY with the improved sentences themselves (no greeting, no closing, no explanations), as your text will be embedded directly into the middle of an existing email template.`;

    const userMessage = `Customer name: ${contactName || "Unknown"}\nUser's draft/notes:\n${prompt}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-20250514",
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }]
      })
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Claude API error:", response.status, responseText);
      return res.status(500).json({ error: `AI error ${response.status}`, details: responseText.slice(0, 300) });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(500).json({ error: "Invalid response from AI" });
    }

    const text = data.content?.[0]?.text?.trim();
    if (!text) {
      return res.status(500).json({ error: "AI returned an empty response" });
    }

    return res.status(200).json({ result: text });

  } catch (error) {
    console.error("AI handler error:", error);
    return res.status(500).json({ error: "Server error", details: error.message });
  }
}
