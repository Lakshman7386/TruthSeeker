
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const upload = multer();
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configuration
const USE_OLLAMA = process.env.USE_OLLAMA === 'true';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const API_KEY = process.env.API_KEY;

// Optional: Import Google GenAI for fallback
let GoogleGenAI;
if (!USE_OLLAMA) {
  try {
    const module = await import('@google/genai');
    GoogleGenAI = module.GoogleGenAI;
  } catch (e) {
    console.warn('Google GenAI not available');
  }
}

app.post('/api/verify', upload.single('image'), async (req, res) => {
  try {
    const { claimText } = req.body;
    
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

    let textOutput = '';

    if (USE_OLLAMA) {
      // Use Ollama
      console.log(`Using Ollama with model: ${OLLAMA_MODEL}`);
      try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false
          })
        });

        if (!response.ok) {
          throw new Error(`Ollama error: ${response.statusText}`);
        }

        const data = await response.json();
        textOutput = data.response;
      } catch (error) {
        console.error('Ollama request failed:', error.message);
        return res.status(500).json({ 
          error: 'Ollama verification failed. Make sure Ollama is running at ' + OLLAMA_URL,
          details: error.message
        });
      }
    } else {
      // Use Google GenAI
      if (!GoogleGenAI || !API_KEY) {
        return res.status(500).json({ error: 'Google GenAI not configured' });
      }

      const ai = new GoogleGenAI({ apiKey: API_KEY });
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

      contents.push({ text: prompt });

      const response = await ai.models.generateContent({
        model,
        contents: { parts: contents },
        config: { tools: [{ googleSearch: {} }] },
      });

      textOutput = response.text;
    }

    res.json({
      text: textOutput,
      groundingChunks: []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed', details: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
