"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { X, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import dayjs from "dayjs";

interface ScrapeLog {
  id: string;
  district: string;
  status: string;
  tendersFound: number;
  source: string;
  error: string | null;
  createdAt: string;
}

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogsModal({ isOpen, onClose }: LogsModalProps) {
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/logs/scrape?page=${pageNum}&pageSize=15`);
      setLogs(res.data.data);
      setTotalPages(res.data.meta.totalPages);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs(page);
    }
  }, [isOpen, page]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm">
      <div className="bg-white w-full h-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">System Logs</h2>
            <p className="text-sm text-gray-500 mt-1">History of manual updates and automatic scrapes.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
          {loading && logs.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No logs found.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-slate-800 text-white font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-300">Date/Time</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-300">Target</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-300">Source</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-300">Status</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider text-slate-300 text-right">Tenders Found</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {dayjs(log.createdAt).format("DD MMM YYYY, hh:mm A")}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 capitalize">
                          {log.district}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                            log.source === "MANUAL" 
                              ? "bg-purple-100 text-purple-800 border border-purple-200" 
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}>
                            {log.source === "MANUAL" ? "Manual (Button)" : "Auto (Cron Job)"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-max ${
                              log.status === "SUCCESS" 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-red-100 text-red-800"
                            }`}>
                              {log.status}
                            </span>
                            {log.error && (
                              <span className="text-[10px] text-red-500 mt-1 max-w-[200px] truncate" title={log.error}>
                                {log.error}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {log.tendersFound}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium">
            Page <span className="text-gray-900">{page}</span> of <span className="text-gray-900">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => page > 1 && setPage(page - 1)}
              disabled={page === 1}
              className="p-2 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-medium shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <button
              onClick={() => page < totalPages && setPage(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-medium shadow-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
