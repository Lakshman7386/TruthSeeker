
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer'); // For handling image uploads
const upload = multer();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Note: In a real local environment, you'd use a .env file
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

app.post('/api/verify', upload.single('image'), async (req, res) => {
  try {
    const { claimText } = req.body;
    const model = 'gemini-3-pro-preview';
    let contents = [];

    if (req.file) {
      contents.push({
        inlineData: {
          mimeType: req.file.mimetype,
          data: req.file.buffer.toString('base64'),
        },
      });
    }

    const prompt = `
      As a world-class misinformation expert, analyze this input and provide a STRUCTURED report.
      Input: ${claimText || 'Analyze the provided image context.'}
      
      Follow this strict output structure:
      SUMMARY: [One sentence high-level summary for instant reading]
      EXPLANATION: [Concise but comprehensive objective deep-dive into the facts]
      
      EVIDENCE_START
      CLAIM: [Specific point from input] | REALITY: [Verified fact] | STATUS: [TRUE/FALSE/MISLEADING]
      EVIDENCE_END
      
      FINAL CONCLUSION: VERDICT: [TRUE/FALSE/MISLEADING/UNCERTAIN], CONFIDENCE: [0-100]%
    `;
    contents.push({ text: prompt });

    const response = await ai.models.generateContent({
      model,
      contents: { parts: contents },
      config: { tools: [{ googleSearch: {} }] },
    });

    res.json({
      text: response.text,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
