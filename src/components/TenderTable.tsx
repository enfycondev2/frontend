"use client";

import { Tender } from "@prisma/client";
import dayjs from "dayjs";
import { Download, ExternalLink, Calendar, Search, Filter } from "lucide-react";

import { DISTRICTS } from "@/lib/scraper/districts";

interface TenderTableProps {
  tenders: Tender[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  activeFilter: string;
  setActiveFilter: (s: string) => void;
  districtFilter: string;
  setDistrictFilter: (s: string) => void;
  priorityFilter: string;
  setPriorityFilter: (s: string) => void;
  dateFilter?: string;
  setDateFilter?: (s: string) => void;
  hideControls?: boolean;
}

export function TenderTable({
  tenders,
  searchTerm,
  setSearchTerm,
  activeFilter,
  setActiveFilter,
  districtFilter,
  setDistrictFilter,
  priorityFilter,
  setPriorityFilter,
  dateFilter,
  setDateFilter,
  hideControls = false
}: TenderTableProps) {
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      
      {/* Table Controls */}
      {!hideControls && (
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/95 backdrop-blur-sm sticky top-[69px] z-10">
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
        
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
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
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired</option>
          </select>
          
          <input 
            type="date" 
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
            value={dateFilter || ""}
            onChange={(e) => setDateFilter && setDateFilter(e.target.value)}
          />

          <button 
            onClick={() => setPriorityFilter(priorityFilter === 'HIGH' ? '' : 'HIGH')}
            className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-sm transition-colors flex items-center gap-1 ${priorityFilter === 'HIGH' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-700'}`}
          >
            🔥 High Priority
          </button>
        </div>
      </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 w-48">District</th>
              <th className="px-6 py-4 max-w-md">Title & AI Summary</th>
              <th className="px-6 py-4 w-48">Financials</th>
              <th className="px-6 py-4 w-40">Timeline</th>
              <th className="px-6 py-4 w-32">Documents</th>
              <th className="px-6 py-4 w-24">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tenders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No tenders found. Try adjusting your filters or run the scraper.
                </td>
              </tr>
            ) : tenders.map((tender) => (
              <tr key={tender.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {tender.district}
                  </span>
                </td>
                <td className="px-6 py-4 max-w-md whitespace-normal">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900 line-clamp-2">{tender.title}</p>
                    {tender.priority === 'HIGH' && (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 uppercase tracking-wider border border-red-200">
                        HIGH PRIORITY
                      </span>
                    )}
                  </div>
                  
                  {tender.aiSummary ? (
                    <p className="text-gray-700 text-xs mt-2 p-2.5 bg-yellow-50/80 rounded border border-yellow-100 shadow-sm font-medium">
                      💡 {tender.aiSummary}
                    </p>
                  ) : tender.description && (
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{tender.description}</p>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">Est. Value</span>
                      <span className="text-emerald-600 font-semibold truncate" title={tender.tenderValue || "N/A"}>{tender.tenderValue || "N/A"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">EMD</span>
                      <span className="text-blue-600 font-semibold truncate" title={tender.emd || "N/A"}>{tender.emd || "N/A"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-medium text-[10px] uppercase tracking-wider">App Cost</span>
                      <span className="text-purple-600 font-semibold truncate" title={tender.applicationCost || "N/A"}>{tender.applicationCost || "N/A"}</span>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Calendar className="w-3 h-3" />
                      Start: {tender.startDate ? dayjs(tender.startDate).format("DD MMM YYYY") : "N/A"}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-red-600">
                      <Calendar className="w-3 h-3" />
                      End: {tender.endDate ? dayjs(tender.endDate).format("DD MMM YYYY") : "N/A"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <a href={tender.sourceUrl} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-700">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
