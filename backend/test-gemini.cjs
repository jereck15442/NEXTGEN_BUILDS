require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set in backend/.env');
    process.exitCode = 1;
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 20000 } });
    const result = await ai.models.generateContent({
      model,
      contents: 'Reply with exactly: OK',
      config: { maxOutputTokens: 100 }
    });

    console.log('Model:', model);
    console.log('Response:', result.text || 'No text');
    console.log('Gemini is working.');
  } catch (err) {
    console.error('Gemini test failed:', err.message);
    process.exitCode = 1;
  }
}

testGemini();
