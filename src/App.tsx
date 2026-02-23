/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  RefreshCw, 
  History, 
  Trash2, 
  Maximize2,
  ChevronRight,
  LayoutGrid,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Loader2,
  Cloud,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  timestamp: number;
}

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "3:4" | "4:3" | "9:16" | "16:9">("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSavingToGoogle, setIsSavingToGoogle] = useState(false);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check Google Auth status
  useEffect(() => {
    fetch('/api/auth/google/status')
      .then(res => res.json())
      .then(data => setIsGoogleAuthenticated(data.isAuthenticated));
  }, []);

  // Listen for OAuth success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsGoogleAuthenticated(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      window.open(url, 'google_oauth', 'width=600,height=700');
    } catch (err) {
      console.error("Failed to get auth URL", err);
    }
  };

  const handleSaveToGoogle = async () => {
    if (!currentImage) return;
    
    setIsSavingToGoogle(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await fetch('/api/save-to-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: currentImage.url,
          prompt: currentImage.prompt,
          aspectRatio: currentImage.aspectRatio
        })
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSavingToGoogle(false);
    }
  };

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('visionary_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('visionary_history', JSON.stringify(history));
  }, [history]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/openrouter-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio }),
      });

      const result = await res.json();

      if (res.status !== 200) {
        throw new Error(result.error || 'Failed to generate image via OpenRouter');
      }

      const newImage: GeneratedImage = {
        id: Math.random().toString(36).substring(7),
        url: result.url,
        prompt: result.prompt,
        aspectRatio,
        timestamp: result.timestamp,
      };

      setCurrentImage(newImage);
      setHistory(prev => [newImage, ...prev].slice(0, 20));
    } catch (err: any) {
      setError(err.message || "Something went wrong during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename.slice(0, 20)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteFromHistory = (id: string) => {
    setHistory(prev => prev.filter(img => img.id !== id));
    if (currentImage?.id === id) setCurrentImage(null);
  };

  const clearHistory = () => {
    if (confirm("Clear all history?")) {
      setHistory([]);
      setCurrentImage(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <h1 className="font-display font-bold text-xl tracking-tight">VISIONARY</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={clearHistory}
              className="text-white/40 hover:text-white transition-colors p-2"
              title="Clear History"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Controls */}
        <div className="lg:col-span-5 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display font-semibold uppercase tracking-widest text-white/50">Prompt</h2>
              <span className="text-[10px] font-mono text-white/30">OPENROUTER (STABLE DIFFUSION XL)</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A futuristic city with neon lights and flying cars, digital art style..."
              className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none font-sans text-lg placeholder:text-white/20"
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-display font-semibold uppercase tracking-widest text-white/50">Aspect Ratio</h2>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: "1:1", icon: Square, label: "1:1" },
                { id: "4:3", icon: RectangleHorizontal, label: "4:3" },
                { id: "3:4", icon: RectangleVertical, label: "3:4" },
                { id: "16:9", icon: RectangleHorizontal, label: "16:9" },
                { id: "9:16", icon: RectangleVertical, label: "9:16" },
              ].map((ratio) => (
                <button
                  key={ratio.id}
                  onClick={() => setAspectRatio(ratio.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                    aspectRatio === ratio.id 
                      ? "bg-white border-white text-black" 
                      : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"
                  )}
                >
                  <ratio.icon className="w-5 h-5" />
                  <span className="text-[10px] font-mono">{ratio.label}</span>
                </button>
              ))}
            </div>
          </section>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={cn(
              "w-full py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-3 transition-all",
              isGenerating || !prompt.trim()
                ? "bg-white/10 text-white/20 cursor-not-allowed"
                : "bg-white text-black hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                GENERATING...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                GENERATE IMAGE
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Preview & History */}
        <div className="lg:col-span-7 space-y-12">
          {/* Preview Area */}
          <section className="relative aspect-square lg:aspect-auto lg:h-[600px] w-full bg-white/5 rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center group">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-white/40 font-mono text-sm animate-pulse uppercase tracking-widest">Synthesizing Pixels...</p>
                </motion.div>
              ) : currentImage ? (
                <motion.div
                  key={currentImage.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative w-full h-full flex items-center justify-center p-4"
                >
                  <img 
                    src={currentImage.url} 
                    alt={currentImage.prompt}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                  />
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => downloadImage(currentImage.url, currentImage.prompt)}
                      className="bg-black/80 backdrop-blur-md border border-white/20 p-3 rounded-full hover:bg-white hover:text-black transition-all"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    
                    {!isGoogleAuthenticated ? (
                      <button 
                        onClick={handleGoogleConnect}
                        className="bg-black/80 backdrop-blur-md border border-white/20 p-3 rounded-full hover:bg-blue-500 hover:text-white transition-all flex items-center gap-2 px-4"
                        title="Connect Google"
                      >
                        <Cloud className="w-5 h-5" />
                        <span className="text-xs font-bold">CONNECT GOOGLE</span>
                      </button>
                    ) : (
                      <button 
                        onClick={handleSaveToGoogle}
                        disabled={isSavingToGoogle}
                        className={cn(
                          "bg-black/80 backdrop-blur-md border border-white/20 p-3 rounded-full transition-all flex items-center gap-2 px-4",
                          saveSuccess ? "bg-green-500 text-white border-green-400" : "hover:bg-blue-500 hover:text-white"
                        )}
                        title="Save to Google Drive & Sheets"
                      >
                        {isSavingToGoogle ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : saveSuccess ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Cloud className="w-5 h-5" />
                        )}
                        <span className="text-xs font-bold">
                          {isSavingToGoogle ? "SAVING..." : saveSuccess ? "SAVED!" : "SAVE TO GOOGLE"}
                        </span>
                      </button>
                    )}

                    <button 
                      className="bg-black/80 backdrop-blur-md border border-white/20 p-3 rounded-full hover:bg-white hover:text-black transition-all"
                      onClick={() => window.open(currentImage.url, '_blank')}
                      title="Open Original"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 text-white/20"
                >
                  <ImageIcon className="w-16 h-16 stroke-[1]" />
                  <p className="font-display text-sm uppercase tracking-widest">Your creation will appear here</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* History Grid */}
          {history.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-display font-semibold uppercase tracking-widest text-white/50">Recent Creations</h2>
                <span className="text-[10px] font-mono text-white/30">{history.length} / 20</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {history.map((img) => (
                  <motion.div
                    key={img.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "relative aspect-square rounded-2xl overflow-hidden border transition-all cursor-pointer group",
                      currentImage?.id === img.id ? "border-white" : "border-white/10 hover:border-white/30"
                    )}
                    onClick={() => setCurrentImage(img)}
                  >
                    <img 
                      src={img.url} 
                      alt={img.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(img.url, img.prompt);
                        }}
                        className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFromHistory(img.id);
                        }}
                        className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/10 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-white/40">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-widest">Powered by Gemini AI</span>
          </div>
          <div className="flex items-center gap-8 text-[10px] font-mono uppercase tracking-widest text-white/30">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">API Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
