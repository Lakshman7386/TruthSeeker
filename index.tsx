
import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';

interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

interface AnalysisResult {
  id: string;
  timestamp: number;
  claim: string;
  verdict: 'TRUE' | 'FALSE' | 'MISLEADING' | 'UNCERTAIN';
  confidence: number;
  summary: string;
  explanation: string;
  evidence: { claim: string; reality: string; status: 'TRUE' | 'FALSE' | 'MISLEADING' }[];
  sources: GroundingChunk[];
}

const TruthSeeker = () => {
  const [claimText, setClaimText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from "Local Backend" (LocalStorage)
  useEffect(() => {
    const saved = localStorage.getItem('truth_seeker_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (item: AnalysisResult) => {
    const updated = [item, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem('truth_seeker_history', JSON.stringify(updated));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const verifyClaim = async (textOverride?: string) => {
    const targetText = textOverride || claimText;
    if (!targetText && !imageFile) return;
    
    setIsAnalyzing(true);
    setResult(null);

    try {
      let textOutput = "";
      let chunks = [];

      // Attempt to use the backend first, fallback to Direct SDK for demo purposes
      try {
        const formData = new FormData();
        if (targetText) formData.append('claimText', targetText);
        if (imageFile) formData.append('image', imageFile);

        const backendResponse = await fetch('http://localhost:3000/api/verify', {
          method: 'POST',
          body: formData,
        });

        if (backendResponse.ok) {
          const data = await backendResponse.json();
          textOutput = data.text;
          chunks = data.groundingChunks;
        } else {
          throw new Error('Backend unavailable');
        }
      } catch (e) {
        console.log("Backend not detected, falling back to direct SDK...");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-3-pro-preview';
        let contents: any[] = [];
        if (imageFile) {
          const base64Data = await fileToBase64(imageFile);
          contents.push({ inlineData: { mimeType: imageFile.type, data: base64Data } });
        }
        contents.push({ text: `
          As a world-class misinformation expert, analyze this input and provide a STRUCTURED report.
          Input: ${targetText || 'Analyze the provided image context.'}
          Follow this strict structure:
          SUMMARY: [One sentence high-level summary]
          EXPLANATION: [Deep-dive facts]
          EVIDENCE_START
          CLAIM: [Point] | REALITY: [Fact] | STATUS: [TRUE/FALSE/MISLEADING]
          EVIDENCE_END
          FINAL CONCLUSION: VERDICT: [TRUE/FALSE/MISLEADING/UNCERTAIN], CONFIDENCE: [0-100]%
        ` });

        const response = await ai.models.generateContent({
          model,
          contents: { parts: contents },
          config: { tools: [{ googleSearch: {} }] },
        });
        textOutput = response.text || "";
        chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      }

      // Parsing
      const summaryMatch = textOutput.match(/SUMMARY:\s*(.*)/i);
      const explanationMatch = textOutput.match(/EXPLANATION:\s*([\s\S]*?)EVIDENCE_START/i);
      const evidenceMatches = [...textOutput.matchAll(/CLAIM:\s*(.*?)\s*\|\s*REALITY:\s*(.*?)\s*\|\s*STATUS:\s*(TRUE|FALSE|MISLEADING)/gi)];
      const verdictMatch = textOutput.match(/VERDICT:\s*(TRUE|FALSE|MISLEADING|UNCERTAIN)/i);
      const confidenceMatch = textOutput.match(/CONFIDENCE:\s*(\d+)%/i);

      const newResult: AnalysisResult = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        claim: targetText || "Visual Analysis",
        verdict: (verdictMatch ? verdictMatch[1].toUpperCase() : 'UNCERTAIN') as any,
        confidence: confidenceMatch ? parseInt(confidenceMatch[1], 10) : 75,
        summary: summaryMatch ? summaryMatch[1].trim() : "Analysis complete.",
        explanation: explanationMatch ? explanationMatch[1].trim() : textOutput,
        evidence: evidenceMatches.map(m => ({
          claim: m[1].trim(),
          reality: m[2].trim(),
          status: m[3].toUpperCase() as any
        })),
        sources: chunks
      };

      setResult(newResult);
      saveToHistory(newResult);
    } catch (error) {
      console.error("Verification failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const examples = [
    "The sky is blue because it reflects the ocean",
    "Humans only use 10% of their brains",
    "Honey never spoils"
  ];

  return (
    <div className="main-container flex">
      {/* Sidebar - History */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-black text-slate-800 tracking-tight text-lg">Verification Vault</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {history.length === 0 ? (
              <div className="text-center py-10 opacity-30">
                <p className="text-xs font-bold uppercase tracking-widest">No history yet</p>
              </div>
            ) : (
              history.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => setResult(item)}
                  className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md ${result?.id === item.id ? 'border-teal-500 bg-teal-50/50' : 'border-slate-100 bg-slate-50'}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                      item.verdict === 'TRUE' ? 'bg-emerald-100 text-emerald-600' :
                      item.verdict === 'FALSE' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>{item.verdict}</span>
                    <span className="text-[8px] text-slate-400 font-bold">{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 truncate">{item.claim}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        {/* Top Nav */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-slate-100 rounded-lg">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 teal-bg rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </div>
              <span className="font-bold text-lg tracking-tight">Truth Seeker</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               Verification Network Active
             </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Input Section */}
          <div className="glass-card rounded-[2rem] p-8 space-y-8 mb-12 shadow-xl shadow-slate-200/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                   <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                   What's the claim?
                </label>
                <textarea 
                  value={claimText}
                  onChange={(e) => setClaimText(e.target.value)}
                  placeholder="Paste news, a tweet, or a claim..."
                  className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-5 focus:ring-4 focus:ring-teal-500/10 focus:outline-none focus:border-teal-500/50 resize-none text-slate-700 transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Visual Proof
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="dotted-upload w-full h-40 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden group relative"
                >
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover p-2 rounded-2xl" />
                  ) : (
                    <div className="text-center p-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </div>
                      <span className="text-xs font-bold text-slate-400">Add Image Context</span>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-4">
              <div className="flex gap-2">
                {examples.map((ex, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setClaimText(ex); verifyClaim(ex); }}
                    className="hidden sm:block text-[10px] font-bold text-slate-400 hover:text-teal-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 transition-all"
                  >
                    {ex.substring(0, 15)}...
                  </button>
                ))}
              </div>
              <button 
                onClick={() => verifyClaim()}
                disabled={isAnalyzing || (!claimText && !imageFile)}
                className="teal-btn w-full sm:w-auto px-12 py-3.5 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-teal-500/30 disabled:opacity-50"
              >
                {isAnalyzing ? "Scanning..." : "Verify Claim"}
              </button>
            </div>
          </div>

          {/* Results Area */}
          {result && (
            <div className="animate-fade-in space-y-8">
              <div className={`p-10 rounded-[2.5rem] border shadow-2xl ${
                result.verdict === 'TRUE' ? 'bg-emerald-50 border-emerald-100' :
                result.verdict === 'FALSE' ? 'bg-red-50 border-red-100' :
                result.verdict === 'MISLEADING' ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
                   <div>
                     <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2 block">Official Verdict</span>
                     <h2 className={`text-7xl font-black tracking-tighter ${
                       result.verdict === 'TRUE' ? 'text-emerald-600' :
                       result.verdict === 'FALSE' ? 'text-red-600' :
                       result.verdict === 'MISLEADING' ? 'text-amber-600' : 'text-slate-600'
                     }`}>{result.verdict}</h2>
                   </div>
                   <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confidence</span>
                     <span className="text-4xl font-black text-teal-600">{result.confidence}%</span>
                   </div>
                </div>

                <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-white mb-10 shadow-sm">
                   <p className="text-xl font-bold leading-relaxed text-slate-800 italic">"{result.summary}"</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.evidence.map((item, idx) => (
                    <div key={idx} className="bg-white/80 p-6 rounded-2xl border border-white flex flex-col gap-3 shadow-sm transition-transform hover:-translate-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-md">POINT #{idx+1}</span>
                        <span className={`text-[9px] font-black px-2 py-1 rounded-md ${
                          item.status === 'TRUE' ? 'bg-emerald-100 text-emerald-600' :
                          item.status === 'FALSE' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                        }`}>{item.status}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 mb-2 leading-snug">{item.claim}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-50 pt-2 mt-2">{item.reality}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-[2rem] p-10 space-y-10 shadow-lg">
                <section>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-4 teal-bg rounded-full"></div>
                    Analytical Deep-Dive
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                    {result.explanation}
                  </p>
                </section>

                {result.sources.length > 0 && (
                  <section className="pt-10 border-t border-slate-100">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-2">
                      <div className="w-1.5 h-4 teal-bg rounded-full"></div>
                      Grounded Evidence Citations
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.sources.map((src, i) => src.web && (
                        <a key={i} href={src.web.uri} target="_blank" rel="noopener" className="bg-slate-50 border border-slate-200 hover:border-teal-500 hover:bg-teal-50 px-5 py-4 rounded-2xl transition-all group">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 w-2 h-2 rounded-full bg-teal-500 shrink-0 group-hover:scale-125 transition-transform"></div>
                            <div>
                              <p className="text-[11px] font-bold text-slate-700 line-clamp-1">{src.web.title}</p>
                              <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">{src.web.uri}</p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="py-20 text-center opacity-30">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Secure Grounded Protocol v2.5.0</p>
        </footer>
      </main>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<TruthSeeker />);
