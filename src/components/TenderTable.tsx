"use client";

import { useState, useEffect } from "react";
import { Tender } from "@prisma/client";
import dayjs from "dayjs";
import { Download, ExternalLink, Calendar, Search, Star, RefreshCw, CheckCircle, ChevronLeft, ChevronRight, Zap, Flame } from "lucide-react";
import axios from "axios";

import { DISTRICTS } from "@/lib/scraper/districts";

const getStartText = (date: Date) => {
  const diff = dayjs().startOf('day').diff(dayjs(date).startOf('day'), 'day');
  if (diff === 0) return "(Today)";
  if (diff === 1) return "(1 day ago)";
  if (diff > 1) return `(${diff} days ago)`;
  if (diff === -1) return "(Tomorrow)";
  return `(In ${Math.abs(diff)} days)`;
};

const getEndText = (date: Date) => {
  const diff = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (diff < -1) return `(Expired ${Math.abs(diff)} days ago)`;
  if (diff === -1) return "(Expired yesterday)";
  if (diff === 0) return "(Expires today)";
  if (diff === 1) return "(Expires tomorrow)";
  return `(Expires in ${diff} days)`;
};

export interface ExtendedTender extends Tender {
  isHighPriority?: boolean;
}

interface TenderTableProps {
  tenders: ExtendedTender[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  activeFilter: string;
  setActiveFilter: (s: string) => void;
  districtFilter: string;
  setDistrictFilter: (s: string) => void;
  priorityFilter: string;
  setPriorityFilter: (s: string) => void;
  highPriorityCount?: number;
  dateFilter?: string;
  setDateFilter?: (s: string) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  hideControls?: boolean;
}

export function TenderTable({
  tenders: initialTenders,
  searchTerm,
  setSearchTerm,
  activeFilter,
  setActiveFilter,
  districtFilter,
  setDistrictFilter,
  priorityFilter,
  setPriorityFilter,
  highPriorityCount,
  dateFilter,
  setDateFilter,
  page,
  totalPages,
  onPageChange,
  hideControls = false
}: TenderTableProps) {
  const [tenders, setTenders] = useState<ExtendedTender[]>(initialTenders);

  useEffect(() => {
    setTenders(initialTenders);
  }, [initialTenders]);

  const toggleBookmark = async (id: string, currentStatus: boolean) => {
    try {
      setTenders(tenders.map(t => 
        t.id === id ? { ...t, isBookmarked: !currentStatus } : t
      ));
      
      await axios.patch(`/api/tenders/${id}/bookmark`, {
        isBookmarked: !currentStatus
      });
    } catch (error) {
      console.error("Failed to toggle bookmark", error);
      setTenders(tenders.map(t => 
        t.id === id ? { ...t, isBookmarked: currentStatus } : t
      ));
    }
  };

  const toggleApplied = async (id: string, currentStatus: boolean) => {
    try {
      setTenders(tenders.map(t => 
        t.id === id ? { ...t, isApplied: !currentStatus } : t
      ));
      
      await axios.patch(`/api/tenders/${id}/applied`, {
        isApplied: !currentStatus
      });
    } catch (error) {
      console.error("Failed to toggle applied status", error);
      setTenders(tenders.map(t => 
        t.id === id ? { ...t, isApplied: currentStatus } : t
      ));
    }
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      
      {/* Table Controls */}
      {!hideControls && (
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/95 backdrop-blur-sm sticky top-[60px] lg:top-[64px] z-30 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search tenders..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 w-full lg:w-auto">
          <select 
            className="flex-1 min-w-[140px] px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
          >
            <option value="">All Districts</option>
            {DISTRICTS.map((dist) => (
              <option key={dist} value={dist} className="capitalize">
                {dist}
              </option>
            ))}
          </select>
          
          <select 
            className="flex-1 min-w-[140px] px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>
          
          <input 
            type="date" 
            className="flex-1 min-w-[140px] px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
            value={dateFilter || ""}
            onChange={(e) => setDateFilter && setDateFilter(e.target.value)}
          />

          <button 
            onClick={() => setPriorityFilter(priorityFilter === 'HIGH' ? '' : 'HIGH')}
            className={`flex-1 min-w-[140px] justify-center px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm transition-colors flex items-center gap-1 ${priorityFilter === 'HIGH' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-700'}`}
          >
            🔥 High Priority {highPriorityCount !== undefined && highPriorityCount > 0 ? `(${highPriorityCount})` : ''}
          </button>
        </div>
      </div>
      )}

      {/* Table */}
      <div className="max-md:overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100 mt-6">
        <table className="w-full table-fixed min-w-[800px] text-left text-sm text-gray-600 relative">
          <thead className="bg-gradient-to-r from-gray-50 to-white text-gray-700 font-semibold border-b border-gray-200 sticky top-[60px] md:top-[148px] lg:top-[160px] z-20">
            <tr>
              <th className="px-5 py-4 w-[12%] text-xs uppercase tracking-wider text-gray-500">District</th>
              <th className="px-5 py-4 w-[40%] text-xs uppercase tracking-wider text-gray-500">Title & AI Summary</th>
              <th className="px-5 py-4 w-[18%] text-xs uppercase tracking-wider text-gray-500">Financials</th>
              <th className="px-5 py-4 w-[15%] text-xs uppercase tracking-wider text-gray-500">Timeline</th>
              <th className="px-5 py-4 w-[10%] text-center text-xs uppercase tracking-wider text-gray-500">Documents</th>
              <th className="px-5 py-4 w-[8%] text-center text-xs uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tenders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  No tenders found. Try adjusting your filters or run the scraper.
                </td>
              </tr>
            ) : tenders.map((tender) => (
              <tr key={tender.id} className="even:bg-blue-50/30 odd:bg-white hover:bg-blue-50/80 transition-all duration-200 group">
                <td className="px-5 py-5 whitespace-normal align-top">
                  <span className="text-gray-900 font-medium capitalize flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    {tender.district}
                  </span>
                </td>
                <td className="px-5 py-5 whitespace-normal align-top">
                  <div className="flex flex-col gap-2">
                    <p className="font-medium text-gray-900 leading-tight">{tender.title}</p>
                    
                    {tender.tags && tender.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tender.tags.map(tag => (
                          <span key={tag} className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                      
                      {tender.aiSummary ? (
                        <div className="flex items-start gap-1.5 p-2 bg-yellow-50/50 rounded-lg border border-yellow-100/50 mt-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-700 leading-relaxed italic">{tender.aiSummary}</p>
                        </div>
                      ) : (
                        <div className="mt-2 bg-gray-50/50 p-2 rounded-lg border border-gray-100 flex items-center gap-2">
                          <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                          <p className="text-xs text-gray-500 italic">AI summary processing...</p>
                        </div>
                      )}
                      
                      {tender.isHighPriority && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full w-max mt-1 tracking-wide shadow-sm">
                          🔥 HIGH PRIORITY
                        </span>
                      )}
                    </div>
                </td>
                
                <td className="px-5 py-5 whitespace-normal align-top">
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Est. Value</span>
                      <span className="text-emerald-600 font-semibold break-words" title={tender.tenderValue || "N/A"}>{tender.tenderValue || "N/A"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">EMD</span>
                      <span className="text-blue-600 font-semibold break-words" title={tender.emd || "N/A"}>{tender.emd || "N/A"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">App Cost</span>
                      <span className="text-purple-600 font-semibold break-words" title={tender.applicationCost || "N/A"}>{tender.applicationCost || "N/A"}</span>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-5 whitespace-normal align-top">
                  <div className="flex flex-col gap-2 text-xs">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Calendar className="w-3 h-3" />
                      Start: {tender.startDate ? (
                        <>
                          {dayjs(tender.startDate).format("DD MMM YYYY")}
                          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded ml-1 font-semibold tracking-wide">
                            {getStartText(tender.startDate)}
                          </span>
                        </>
                      ) : "N/A"}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-red-600">
                      <Calendar className="w-3 h-3" />
                      End: {tender.endDate ? (
                        <>
                          {dayjs(tender.endDate).format("DD MMM YYYY")}
                          <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded ml-1 font-bold tracking-wide">
                            {getEndText(tender.endDate)}
                          </span>
                        </>
                      ) : "N/A"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-normal">
                  <div className="flex flex-wrap gap-2">
                    {tender.noticePdfUrl && (
                      <a href={tender.noticePdfUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs bg-blue-50 px-2 py-1 rounded">
                        <Download className="w-3 h-3" /> Notice
                      </a>
                    )}
                    {tender.tenderPdfUrl && (
                      <a href={tender.tenderPdfUrl} target="_blank" rel="noreferrer" className="text-purple-600 hover:text-purple-800 flex items-center gap-1 text-xs bg-purple-50 px-2 py-1 rounded">
                        <Download className="w-3 h-3" /> Tender
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-5 py-5 whitespace-normal align-top">
                  <div className="flex items-center justify-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => toggleApplied(tender.id, !!tender.isApplied)}
                      className={`transition-all hover:scale-110 ${tender.isApplied ? 'text-emerald-500 drop-shadow-sm' : 'text-gray-300 hover:text-emerald-400'}`}
                      title={tender.isApplied ? "Remove Applied Status" : "Mark as Applied"}
                    >
                      <CheckCircle className="w-5 h-5" fill={tender.isApplied ? "currentColor" : "none"} />
                    </button>
                    <button 
                      onClick={() => toggleBookmark(tender.id, !!tender.isBookmarked)}
                      className={`transition-all hover:scale-110 ${tender.isBookmarked ? 'text-yellow-400 hover:text-yellow-500 drop-shadow-sm' : 'text-gray-300 hover:text-gray-400'}`}
                      title={tender.isBookmarked ? "Remove Bookmark" : "Bookmark Tender"}
                    >
                      <Star className="w-5 h-5" fill={tender.isBookmarked ? "currentColor" : "none"} />
                    </button>
                    <a href={tender.sourceUrl} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-blue-600 transition-colors" title="View Source">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination (Sticky Bottom) */}
      {!hideControls && totalPages && totalPages > 1 && (
        <div className="sticky bottom-0 z-30 p-4 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex items-center justify-between rounded-b-xl">
          <span className="text-sm text-gray-500 font-medium">
            Page <span className="text-gray-900">{page}</span> of <span className="text-gray-900">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange && page && page > 1 && onPageChange(page - 1)}
              disabled={page === 1}
              className="p-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <button
              onClick={() => onPageChange && page && page < totalPages && onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
    </div>
  );
}
