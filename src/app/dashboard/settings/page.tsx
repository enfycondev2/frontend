"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Settings, Plus, X, ArrowLeft, Zap, Info } from "lucide-react";
import Link from "next/link";

interface Keyword {
  id: string;
  word: string;
}

export default function SettingsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchKeywords = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/keywords");
      if (res.data.success) {
        setKeywords(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load keywords.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    
    try {
      setAdding(true);
      setError("");
      const res = await axios.post("/api/keywords", { word: newKeyword });
      if (res.data.success) {
        setKeywords([...keywords, res.data.data]);
        setNewKeyword("");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to add keyword.");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    try {
      setKeywords(keywords.filter(k => k.id !== id)); // Optimistic UI
      await axios.delete(`/api/keywords?id=${id}`);
    } catch (err) {
      console.error(err);
      setError("Failed to delete keyword.");
      fetchKeywords(); // Revert optimistic UI on failure
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors p-2 -ml-2 rounded-lg hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                  Settings
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Dynamic Priority Keywords
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Add keywords to automatically flag matching tenders as <strong className="text-red-600">HIGH PRIORITY</strong>. 
              The system uses the AI-generated tags to perform instantaneous matching without re-reading the PDFs.
            </p>
          </div>

          <div className="p-6">
            <form onSubmit={handleAddKeyword} className="flex gap-3 max-w-md mb-8">
              <input
                type="text"
                placeholder="e.g. Solar, Infrastructure, IT..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                disabled={adding}
              />
              <button
                type="submit"
                disabled={adding || !newKeyword.trim()}
                className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-4 uppercase tracking-wider">Active Keywords</h3>
              
              {loading ? (
                <div className="flex gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-8 w-24 bg-gray-100 animate-pulse rounded-full" />
                  ))}
                </div>
              ) : keywords.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-gray-500 text-sm">No priority keywords added yet.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {keywords.map(keyword => (
                    <div 
                      key={keyword.id} 
                      className="group flex items-center gap-1 bg-white border border-gray-200 text-gray-800 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm transition-all hover:border-red-200 hover:shadow"
                    >
                      <span>{keyword.word}</span>
                      <button 
                        onClick={() => handleDeleteKeyword(keyword.id)}
                        className="ml-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        title="Remove keyword"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
