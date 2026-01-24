#!/bin/bash
# TruthSeeker - Local Ollama Setup Script

echo "🚀 TruthSeeker - Ollama Local Setup"
echo "===================================="

# Check if Ollama is running
echo "Checking if Ollama is running..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "❌ Ollama is not running!"
    echo "Please start Ollama first:"
    echo "  Windows: Download from https://ollama.ai and run 'ollama serve'"
    echo "  Mac/Linux: Run 'ollama serve'"
    exit 1
fi

echo "✅ Ollama is running!"

# Check if a model is available
MODEL=${OLLAMA_MODEL:-mistral}
echo "Checking for model: $MODEL"
if ! curl -s http://localhost:11434/api/tags | grep -q "$MODEL"; then
    echo "⚠️  Model '$MODEL' not found. Downloading..."
    curl -X POST http://localhost:11434/api/pull -d "{\"name\":\"$MODEL\"}"
fi

echo "✅ Model ready!"

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the backend server
echo "Starting backend server..."
npm run backend &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start the Vite dev server
echo "Starting frontend dev server..."
npm run dev

# Cleanup
trap "kill $BACKEND_PID" EXIT
