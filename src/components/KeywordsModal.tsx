"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Settings, Plus, X, Zap, Info } from "lucide-react";

interface Keyword {
  id: string;
  word: string;
}

interface KeywordsModalProps {
  isOpen: boolean;
  onClose: (changed?: boolean) => void;
}

export function KeywordsModal({ isOpen, onClose }: KeywordsModalProps) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

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
    if (isOpen) {
      setHasChanges(false);
      fetchKeywords();
    }
  }, [isOpen]);

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
        setHasChanges(true);
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
      setHasChanges(true);
    } catch (err) {
      console.error(err);
      setError("Failed to delete keyword.");
      fetchKeywords(); // Revert optimistic UI on failure
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Modify Keywords</h2>
          </div>
          <button 
            onClick={() => onClose(hasChanges)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          <div className="mb-6 p-4 border border-blue-100 bg-gradient-to-r from-blue-50/50 to-transparent rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-500" />
              Dynamic Priority Keywords
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Add keywords to automatically flag matching tenders as <strong className="text-red-600">HIGH PRIORITY</strong>. 
              The system uses the AI-generated tags to perform instantaneous matching without re-reading the PDFs.
            </p>
          </div>

          <form onSubmit={handleAddKeyword} className="flex gap-3 mb-6">
            <input
              type="text"
              placeholder="e.g. Solar, Infrastructure, IT..."
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              disabled={adding}
            />
            <button
              type="submit"
              disabled={adding || !newKeyword.trim()}
              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <h4 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Active Keywords</h4>
            
            {loading ? (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-7 w-20 bg-gray-100 animate-pulse rounded-full" />
                ))}
              </div>
            ) : keywords.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-400 text-xs">No priority keywords added yet.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.map(keyword => (
                  <div 
                    key={keyword.id} 
                    className="group flex items-center gap-1 bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm transition-all hover:border-red-200 hover:shadow"
                  >
                    <span>{keyword.word}</span>
                    <button 
                      onClick={() => handleDeleteKeyword(keyword.id)}
                      className="ml-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                      title="Remove keyword"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
