# 🛡️ TruthSeeker - IdeaSprint 2026

**TruthSeeker ** is an AI-based solution that takes text and images as input and fact-checks them. In an era where misinformation spreads rapidly, this tool helps users verify the authenticity of content they encounter online.

This project is a prototype developed for the **IdeaSprint – National Innovation Challenge 2026**.

![TruthSeeker Screenshot](https://i.imgur.com/your-screenshot-url.png)
*(Note: Replace with a real screenshot of the application.)*

## 🚀 Key Features

- **Text Analysis:** Paste any text snippet to analyze its factual accuracy.
- **Image Analysis:** Upload an image to check for known misinformation or out-of-context use.
- **Combined Analysis:** The system can analyze text and images together for a comprehensive verdict.
- **Confidence Score:** Get a clear confidence score for each verification.
- **Detailed Explanations:** Understand *why* a piece of content is flagged as correct, false, or misleading.
- **Local-First AI:** Built to comply with hackathon rules, the entire analysis runs in the browser. No data ever leaves your device.

## ⚙️ Tech Stack

This prototype is built with a modern, efficient, and visually appealing tech stack:

- **Framework:** [React](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)

## 🛠️ Getting Started

To run this project locally, follow these steps:

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/) (or yarn/pnpm)

### Installation & Running

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/truth-guard-ai.git
    ```

2.  **Navigate to the project directory:**
    ```sh
    cd truth-guard-ai
    ```

3.  **Install dependencies:**
    ```sh
    npm install
    ```

4.  **Start the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## 🔒 Limitations & Future Work

This prototype was built within the constraints of the IdeaSprint hackathon, which strictly prohibits the use of third-party APIs and mandates the use of local models.

-   **Simulated AI Engine:** The core analysis is currently performed by a **mock AI engine** that runs entirely in the browser. It uses a limited, predefined "knowledge base" to identify a few example claims. This approach was chosen to demonstrate the full UI and user experience without violating hackathon rules.
-   **Limited Knowledge:** The current knowledge base is very small and only serves to prove the concept.

### Future Roadmap

Our goal is to evolve this prototype into a powerful, fully-functional tool. The next steps are:

1.  **Integrate a Real Local LLM:** Replace the mock engine with a genuine, locally-run Large Language Model (e.g., [Ollama](https://ollama.ai/) with Llama 3, Mistral, or Phi-3). This is the highest priority for turning the prototype into a real product.
2.  **Implement Image Recognition:** Use a local computer vision model (like Tesseract.js for OCR or a custom model) to perform real analysis on images, such as reading text, identifying logos, and reverse image searching against a local database.
3.  **Expand the Knowledge Base:** For offline fact-checking, we plan to integrate open-source fact-checking databases (like those from reputable journalism sources) that can be stored and accessed locally.
4.  **Browser Extension:** Develop a browser extension to allow users to fact-check content directly on social media platforms and news websites.
