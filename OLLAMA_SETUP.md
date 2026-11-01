# TruthSeeker - Ollama Local Setup Guide

## Prerequisites

### 1. Install Ollama
- **Windows**: Download from [ollama.ai](https://ollama.ai)
- **Mac**: Download from [ollama.ai](https://ollama.ai)
- **Linux**: `curl https://ollama.ai/install.sh | sh`

### 2. Start Ollama
```bash
ollama serve
```
This will start Ollama on `http://localhost:11434` (keep this running)

### 3. Download a Model
Choose one of the available models. Popular options for fact-checking:

```bash
# Mistral (7B, fast, good quality) - RECOMMENDED
ollama pull mistral

# Llama 2 (7B, good quality)
ollama pull llama2

# Neural Chat (7B, optimized for chat)
ollama pull neural-chat

# Dolphin Mistral (7B, very smart)
ollama pull dolphin-mixtral
```

## Setup

### Windows
1. Double-click `setup-ollama.bat`
2. Follow the prompts

### Mac/Linux
```bash
chmod +x setup-ollama.sh
./setup-ollama.sh
```

### Manual Setup
```bash
npm install
npm run start
```

## Running the Application

### Option 1: Combined Start
```bash
npm run start
```
This starts both backend and frontend:
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

### Option 2: Separate Terminals
Terminal 1:
```bash
npm run backend
```

Terminal 2:
```bash
npm run dev
```

## Configuration

Edit `.env` to customize:

```env
# Use Ollama (true) or Google GenAI (false)
USE_OLLAMA=true

# Ollama settings
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# Google GenAI (only needed if USE_OLLAMA=false)
API_KEY=your-key-here
```

## Available Models

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| mistral | 7B | Fast ⚡⚡ | Good ✓✓ | General purpose |
| llama2 | 7B | Medium ⚡ | Good ✓✓ | Balanced |
| neural-chat | 7B | Medium ⚡ | Good ✓✓ | Chat/Analysis |
| dolphin-mixtral | 7B | Medium ⚡ | Excellent ✓✓✓ | Complex reasoning |

## Troubleshooting

### "Ollama is not running"
- Make sure you ran `ollama serve` in another terminal
- Check if Ollama is installed correctly

### "Model not found"
- The model will auto-download if missing
- Or manually: `ollama pull mistral`

### Slow responses
- Larger models are slower
- Try `mistral` or `neural-chat` for faster responses
- Check your GPU is being utilized

### Backend connection errors
- Verify backend is running: `npm run backend`
- Check port 3001 is not in use

## Performance Tips

1. **Use GPU**: Ollama automatically uses GPU if available (NVIDIA CUDA)
2. **Smaller models**: Mistral (7B) is fast and good quality
3. **Reduce context**: Keep claims concise for faster analysis
4. **Run locally**: No internet required, instant offline analysis

## Switching Between Ollama and Google GenAI

To use Google GenAI instead:
```env
USE_OLLAMA=false
API_KEY=your-google-genai-key
```

To switch back to Ollama:
```env
USE_OLLAMA=true
```

No code changes needed - just update `.env`!

## API Endpoints

### POST /api/verify
```json
{
  "claimText": "string",
  "image": "file (optional)"
}
```

Response:
```json
{
  "text": "analysis result",
  "groundingChunks": []
}
```

## Notes

- All processing is local - your data never leaves your computer
- First request may take a few seconds while loading the model into memory
- Subsequent requests are faster
- GPU memory is freed when not in use
