const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function askGeminiBiology(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return "API key missing. Please set VITE_GEMINI_API_KEY in your .env file.";
  }

  const systemInstruction = 
    "You are an expert NCERT Class 11 Biology Tutor for NEET preparation. " +
    "Provide concise, high-yield answers, highlighting key concepts, formulas, and NCERT terminology.";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY, // Auth header for AQ. keys
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nStudent Question: ${prompt}` }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Gemini Response Error Details:", errorData);
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't process that question right now."
    );
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to connect to AI server. Check your connection or API key.";
  }
}