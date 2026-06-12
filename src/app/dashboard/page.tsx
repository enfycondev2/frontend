"use client";

import { useState, useEffect, useRef } from "react";
import { Tender } from "@prisma/client";
import { DashboardStats } from "@/components/DashboardStats";
import { TenderTable } from "@/components/TenderTable";
import { RefreshCw, LayoutDashboard, LogOut } from "lucide-react";
import axios from "axios";

export default function Dashboard() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'active', 'expired'
  const [districtFilter, setDistrictFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, expiring: 0, districts: 0, pendingQueue: 0, totalPages: 0 });
  const [priorityFilter, setPriorityFilter] = useState("");
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [todayTenders, setTodayTenders] = useState<Tender[]>([]);
  const [activeTab, setActiveTab] = useState("home"); // 'home', 'today', 'this_week', 'bookmarks'
  const [page, setPage] = useState(1);
  const [tableTotalPages, setTableTotalPages] = useState(1);
  const lastSearchTerm = useRef(searchTerm);

  const fetchTenders = async () => {
    setLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (districtFilter) params.append("district", districtFilter);
      if (activeFilter === "active") params.append("active", "true");
      if (activeFilter === "expired") params.append("active", "false");
      if (activeFilter === "expiring") params.append("active", "expiring");
      if (priorityFilter) params.append("priority", priorityFilter);
      // Tab-based overrides
      if (activeTab === "bookmarks") {
        params.append("bookmarked", "true");
      } else if (activeTab === "applied") {
        params.append("applied", "true");
      } else if (activeTab === "this_week") {
        params.append("dateRange", "this_week");
      } else if (activeTab === "today") {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        params.append("date", todayStr);
      } else {
        if (dateFilter) params.append("date", dateFilter);
        else params.append("excludeToday", "true");
      }
      
      // Only request heavy stats calculations when no filters are applied
      if (!searchTerm && !districtFilter && activeFilter === "all" && !priorityFilter) {
        params.append("includeStats", "true");
      }
      
      params.append("pageSize", "20");
      params.append("page", page.toString());

      const res = await axios.get(`/api/tenders?${params.toString()}`);
      const data = res.data.data as Tender[];
      
      setTenders(data);
      setTableTotalPages(res.data.meta.totalPages);
      
      if (!searchTerm && !districtFilter && activeFilter === "all" && !priorityFilter) {
        setStats({
          total: res.data.meta.total,
          active: res.data.meta.active,
          expiring: res.data.meta.expiring,
          districts: res.data.meta.districts,
          pendingQueue: res.data.meta.pendingQueue
        });
      }

    } catch (error) {
      console.error("Error fetching tenders", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayTenders = async () => {
    try {
      const today = new Date();
      // Format as YYYY-MM-DD in local time
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const res = await axios.get(`/api/tenders?date=${todayStr}&pageSize=20`);
      setTodayTenders(res.data.data as Tender[]);
    } catch (error) {
      console.error("Error fetching today tenders", error);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchTerm, activeFilter, districtFilter, priorityFilter, dateFilter, activeTab]);

  useEffect(() => {
    if (lastSearchTerm.current !== searchTerm) {
      lastSearchTerm.current = searchTerm;
      const timer = setTimeout(() => {
        fetchTenders();
      }, 500); // Debounce search
      return () => clearTimeout(timer);
    } else {
      // Fetch instantly on load, pagination, or filter changes
      fetchTenders();
    }
  }, [searchTerm, activeFilter, districtFilter, priorityFilter, dateFilter, activeTab, page]);

  useEffect(() => {
    fetchTodayTenders();
  }, []);

  // BACKGROUND AI QUEUE PROCESSOR
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const processQueue = async () => {
      if (stats.pendingQueue > 0 && !isProcessingQueue) {
        setIsProcessingQueue(true);
        try {
          const res = await axios.post("/api/queue");
          // Update the remaining count
          setStats(prev => ({ ...prev, pendingQueue: res.data.remaining }));
          
          // If it processed some, refresh the table so the user sees the new data!
          if (res.data.processed > 0) {
            fetchTenders();
            fetchTodayTenders();
          }
        } catch (error) {
          console.error("Queue processing error", error);
        } finally {
          setIsProcessingQueue(false);
        }
      }
    };

    if (stats.pendingQueue > 0) {
      // Poll every 30 seconds to stay safely under Gemini's 15 Requests Per Minute limit
      interval = setInterval(processQueue, 30000);
      // Run immediately on first detect
      if (!isProcessingQueue) processQueue();
    }

    return () => clearInterval(interval);
  }, [stats.pendingQueue, isProcessingQueue]);

  const handleScrape = async () => {
    if (scraping) return;
    setScraping(true);
    try {
      const { DISTRICTS } = await import("@/lib/scraper/districts");
      let totalNew = 0;
      let totalProcessed = 0;
      
      for (const district of DISTRICTS) {
        try {
          // Update button UI state to show progress
          const btn = document.getElementById("scrape-btn");
          if (btn) btn.innerText = `Crawling ${district}...`;

          const res = await axios.post("/api/scrape", { district });
          if (res.data.success) {
            totalNew += res.data.newTenders || 0;
            totalProcessed++;
          }
        } catch (err) {
          console.error(`Failed to scrape ${district}:`, err);
        }
        // Small delay between districts to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      alert(`Scraping completed! Found ${totalNew} new tenders across ${totalProcessed} districts.`);
      fetchTenders();
      fetchTodayTenders();
    } catch (error) {
      console.error("Scraping error:", error);
      alert("Failed to trigger scrape.");
    } finally {
      setScraping(false);
      const btn = document.getElementById("scrape-btn");
      if (btn) btn.innerText = "Run Scraper";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-center h-auto lg:h-16 gap-4 py-3 lg:py-0">
            
            {/* Logo - Left */}
            <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-between lg:justify-start">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900 hidden sm:block">Odisha Tender Platform</h1>
                <h1 className="text-lg font-bold tracking-tight text-gray-900 sm:hidden">OTP</h1>
              </div>
              
              {/* Mobile Actions (Visible only on mobile) */}
              <div className="flex lg:hidden items-center gap-2 sm:gap-3 shrink-0">
                <button
                  onClick={() => {
                    document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                    window.location.href = "/login";
                  }}
                  className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
                <button
                  id="scrape-btn-mobile"
                  onClick={handleScrape}
                  disabled={scraping}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors
                    ${scraping ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <RefreshCw className={`w-4 h-4 shrink-0 ${scraping ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{scraping ? 'Crawling...' : 'Run Scraper'}</span>
                  <span className="sm:hidden">{scraping ? '...' : 'Scrape'}</span>
                </button>
              </div>
            </div>

            {/* Navigation - Middle */}
            <nav className="flex gap-4 sm:gap-6 overflow-x-auto hide-scrollbar w-full lg:w-auto lg:h-full items-center justify-start lg:justify-center">
              {[
                { id: "home", label: "Home" },
                { id: "today", label: "Today" },
                { id: "this_week", label: "This Week" },
                { id: "bookmarks", label: "Bookmarks" },
                { id: "applied", label: "Applied" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap lg:h-full py-2 lg:py-0 border-b-2 font-medium text-sm transition-colors flex items-center ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Actions - Right (Visible only on desktop) */}
            <div className="hidden lg:flex items-center gap-4 shrink-0">
              <button
                onClick={() => {
                  document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                  window.location.href = "/login";
                }}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Logout
              </button>
              <button
                id="scrape-btn"
                onClick={handleScrape}
                disabled={scraping}
                className={`inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors
                  ${scraping ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${scraping ? 'animate-spin' : ''}`} />
                {scraping ? 'Crawling Districts...' : 'Run Scraper'}
              </button>
            </div>
            
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === "home" && (
          <>
            <DashboardStats 
              total={stats.total} 
              active={stats.active} 
              expiring={stats.expiring} 
              districts={stats.districts}
              onFilterClick={setActiveFilter}
            />

            {todayTenders.length > 0 && (
              <div className="mb-8 mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  📅 Today's Tenders
                </h2>
                <TenderTable 
                  tenders={todayTenders}
                  searchTerm=""
                  setSearchTerm={() => {}}
                  activeFilter="all"
                  setActiveFilter={() => {}}
                  districtFilter=""
                  setDistrictFilter={() => {}}
                  priorityFilter=""
                  setPriorityFilter={() => {}}
                  hideControls={true}
                />
              </div>
            )}
          </>
        )}
        
        <div className="mb-6 mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {activeTab === 'home' && 'All Tenders'}
              {activeTab === 'today' && "Today's Tenders"}
              {activeTab === 'this_week' && "This Week's Tenders"}
              {activeTab === 'bookmarks' && 'Bookmarked Tenders'}
              {activeTab === 'applied' && 'Applied Tenders'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'home' && 'Monitor and track latest tenders across districts.'}
              {activeTab === 'today' && 'Tenders published today.'}
              {activeTab === 'this_week' && 'Tenders published within the current week.'}
              {activeTab === 'bookmarks' && 'Your saved tenders for quick access.'}
              {activeTab === 'applied' && 'Tenders you have submitted applications for.'}
            </p>
          </div>
          {stats.pendingQueue > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              AI Analysing {stats.pendingQueue} Tenders...
            </span>
          )}
        </div>

        {loading && tenders.length === 0 ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <TenderTable 
            tenders={tenders}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            districtFilter={districtFilter}
            setDistrictFilter={setDistrictFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            page={page}
            totalPages={tableTotalPages}
            onPageChange={setPage}
          />
        )}
      </main>
      
    </div>
  );
}
