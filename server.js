
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import multer from 'multer';
import dotenv from 'dotenv';
import Tesseract from 'tesseract.js';

dotenv.config();

const upload = multer();
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Configuration
const USE_OLLAMA = process.env.USE_OLLAMA === 'true';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const API_KEY = process.env.API_KEY;
const MAX_CLAIM_LENGTH = 12000;

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

// Function to extract text from image using OCR
async function extractTextFromImage(imageBuffer) {
  try {
    console.log('Extracting text from image using OCR...');
    const result = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: m => console.log('OCR Progress:', m.progress)
    });
    return result.data.text;
  } catch (error) {
    console.error('OCR Error:', error);
    return '';
  }
}

function buildPrompt(input) {
  return `You are TruthSeeker, a rigorous fact-checking analyst. Analyze the user's content without assuming it is true or false.

Use this process:
1. Split the input into up to five independently checkable claims.
2. Assess each claim using established knowledge and, when available, retrieved sources.
3. Separate a claim that is false from one that is technically true but missing important context.
4. Use UNCERTAIN when the evidence is insufficient, disputed, time-sensitive, or the claim is not objectively verifiable.
5. Never invent sources, quotes, statistics, or URLs. Explain what evidence would be needed when uncertain.

Confidence is your confidence in the verdict, not how persuasive the writing is:
- 90-100: directly verifiable, unambiguous evidence
- 75-89: strong evidence with minor limitations
- 50-74: mixed, incomplete, or context-dependent evidence
- 0-49: insufficient evidence or unresolved disagreement

Return ONLY valid JSON matching this shape:
{
  "summary": "one concise sentence",
  "explanation": "objective explanation with the key reasoning and limitations",
  "verdict": "TRUE | FALSE | MISLEADING | UNCERTAIN",
  "confidence": 0,
  "evidence": [
    {
      "claim": "specific checkable claim",
      "reality": "what the evidence supports",
      "status": "TRUE | FALSE | MISLEADING | UNCERTAIN"
    }
  ]
}

Input to analyze:
${input}`;
}

function clampConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function normalizeAnalysis(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  const validVerdicts = new Set(['TRUE', 'FALSE', 'MISLEADING', 'UNCERTAIN']);
  const verdict = validVerdicts.has(String(parsed?.verdict).toUpperCase())
    ? String(parsed.verdict).toUpperCase()
    : 'UNCERTAIN';
  const evidence = Array.isArray(parsed?.evidence)
    ? parsed.evidence.slice(0, 5).map((item) => ({
        claim: String(item?.claim || '').trim(),
        reality: String(item?.reality || '').trim(),
        status: validVerdicts.has(String(item?.status).toUpperCase())
          ? String(item.status).toUpperCase()
          : 'UNCERTAIN'
      })).filter((item) => item.claim && item.reality)
    : [];

  return {
    summary: String(parsed?.summary || 'The model could not produce a reliable summary.').trim(),
    explanation: String(parsed?.explanation || 'Insufficient explanation was returned.').trim(),
    verdict,
    confidence: clampConfidence(parsed?.confidence),
    evidence
  };
}

function parseModelResponse(text) {
  const cleaned = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return normalizeAnalysis(JSON.parse(cleaned));
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return normalizeAnalysis(JSON.parse(jsonMatch[0]));
      } catch {
        // Fall through to a safe, explicit uncertain result.
      }
    }
    return {
      summary: 'The model returned an unreadable analysis.',
      explanation: cleaned || 'No analysis was returned.',
      verdict: 'UNCERTAIN',
      confidence: 0,
      evidence: []
    };
  }
}

app.post('/api/verify', upload.single('image'), async (req, res) => {
  try {
    let { claimText } = req.body;
    claimText = typeof claimText === 'string' ? claimText.trim().slice(0, MAX_CLAIM_LENGTH) : '';
    let extractedImageText = '';

    // Extract text from image if provided
    if (req.file) {
      console.log('Image received, extracting text...');
      extractedImageText = await extractTextFromImage(req.file.buffer);
      console.log('Extracted text:', extractedImageText);
    }

    // Combine claim text and extracted image text
    const finalClaimText = claimText && extractedImageText 
      ? `${claimText}\n\nText from image: ${extractedImageText}`
      : claimText || extractedImageText || 'Analyze the provided content.';
    
    if (!claimText && !extractedImageText) {
      return res.status(400).json({ error: 'Provide text or an image to verify.' });
    }

    const prompt = buildPrompt(finalClaimText);

    let textOutput = '';
    let groundingChunks = [];

    if (USE_OLLAMA) {
      // Use Ollama
      console.log(`Using Ollama with model: ${OLLAMA_MODEL}`);
      try {
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages: [
              { role: 'system', content: 'You are a precise fact-checking system. Follow the requested JSON contract exactly.' },
              { role: 'user', content: prompt }
            ],
            format: 'json',
            stream: false,
            options: {
              temperature: 0.1,
              top_p: 0.9,
              num_ctx: 8192
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Ollama error: ${response.statusText}`);
        }

        const data = await response.json();
        textOutput = data.message?.content || data.response || '';
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
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json'
        },
      });

      textOutput = response.text;
      groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    }

    const analysis = parseModelResponse(textOutput);
    res.json({
      text: textOutput,
      analysis,
      groundingChunks,
      extractedImageText
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed', details: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
