@echo off
REM TruthSeeker - Local Ollama Setup Script for Windows

echo.
echo 🚀 TruthSeeker - Ollama Local Setup
echo ====================================
echo.

REM Check if Ollama is running
echo Checking if Ollama is running...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:11434/api/tags' -TimeoutSec 2 -ErrorAction SilentlyContinue; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"

if errorlevel 1 (
    echo.
    echo ❌ Ollama is not running!
    echo.
    echo Please start Ollama first:
    echo   1. Download from https://ollama.ai
    echo   2. Install and run the Ollama application
    echo   3. Run 'ollama serve' in a terminal
    echo.
    pause
    exit /b 1
)

echo ✅ Ollama is running!
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

if errorlevel 1 (
    echo.
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo To start the application, run:
echo   npm run start
echo.
echo This will start both the backend (port 3000) and frontend (port 5173)
echo.
pause
