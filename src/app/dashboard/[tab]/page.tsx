"use client";

import { useState, useEffect, useRef } from "react";
import { Tender } from "@prisma/client";
import { DashboardStats } from "@/components/DashboardStats";
import { TenderTable } from "@/components/TenderTable";
import { SettingsModal } from "@/components/SettingsModal";
import { DistrictsModal } from "@/components/DistrictsModal";
import { RefreshCw, LayoutDashboard, LogOut, Settings, ChevronDown, User, Bot } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";

export default function Dashboard() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'active', 'expired'
  const [districtFilter, setDistrictFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, expiring: 0, districtsCrawled: 0, districtsData: [] as { district: string; _count: { _all: number } }[], highPriority: 0, pendingQueue: 0, totalPages: 0 });
  const [priorityFilter, setPriorityFilter] = useState("");
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [todayTenders, setTodayTenders] = useState<Tender[]>([]);
  const params = useParams();
  const activeTab = (params?.tab as string) || "district";

  const [viewType, setViewType] = useState<"all" | "district" | "state">("all");
  const [page, setPage] = useState(1);
  const [tableTotalPages, setTableTotalPages] = useState(1);
  const [username, setUsername] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDistrictsModalOpen, setIsDistrictsModalOpen] = useState(false);
  const lastSearchTerm = useRef(searchTerm);

  useEffect(() => {
    // Parse cookie to get username
    const cookies = document.cookie.split('; ');
    const authCookie = cookies.find(row => row.startsWith('auth='));
    if (authCookie) {
      let val = authCookie.split('=')[1];
      if (val === "true") val = "Admin";
      setUsername(val || "Admin");
    }
  }, []);

  const fetchTenders = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams();
      if (forceRefresh) params.append("_t", Date.now().toString());
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
      } else if (activeTab === "state") {
        params.append("tenderType", "state");
      } else if (activeTab === "district") {
        params.append("tenderType", "district");
      } else if (activeTab === "this_week") {
        params.append("dateRange", "this_week");
        if (viewType === "state") params.append("tenderType", "state");
        if (viewType === "district") params.append("tenderType", "district");
      } else if (activeTab === "today") {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        params.append("date", todayStr);
        if (viewType === "state") params.append("tenderType", "state");
        if (viewType === "district") params.append("tenderType", "district");
      } else {
        if (dateFilter) params.append("date", dateFilter);
        else params.append("excludeToday", "true");
      }
      
      // Only request heavy stats calculations when no filters are applied and we are on a tab that shows stats
      if (!searchTerm && !districtFilter && activeFilter === "all" && !priorityFilter && (activeTab === "district" || activeTab === "state")) {
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
          districtsCrawled: res.data.meta.districts || 0,
          districtsData: res.data.meta.districtsData || [],
          highPriority: res.data.meta.highPriority || 0,
          pendingQueue: res.data.meta.pendingQueue,
          totalPages: res.data.meta.totalPages
        });
      }

    } catch (error) {
      console.error("Error fetching tenders", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayTenders = async (forceRefresh = false) => {
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      const params = new URLSearchParams();
      if (forceRefresh) params.append("_t", Date.now().toString());
      params.append("date", todayStr);
      params.append("pageSize", "20");
      
      if (activeTab === 'district' || activeTab === 'state') {
        params.append("tenderType", activeTab);
      }
      
      if (searchTerm) params.append("search", searchTerm);
      if (activeFilter !== "all") params.append("active", activeFilter);
      if (districtFilter) params.append("district", districtFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
      
      const res = await axios.get(`/api/tenders?${params.toString()}`);
      setTodayTenders(res.data.data as Tender[]);
    } catch (error) {
      console.error("Error fetching today tenders", error);
    }
  };

  useEffect(() => {
    setPage(1);
    setTenders([]); // Clear stale data on tab switch
  }, [searchTerm, activeFilter, districtFilter, priorityFilter, dateFilter, activeTab, viewType]);

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
  }, [searchTerm, activeFilter, districtFilter, priorityFilter, dateFilter, activeTab, page, viewType]);

  useEffect(() => {
    if (activeTab !== "district" && activeTab !== "state") return;
    
    // We already have a debounce for fetchTenders, so we'll just piggyback on it
    // but we can also just use a simple timeout here if we want it isolated.
    const timer = setTimeout(() => {
      fetchTodayTenders();
    }, 300);
    return () => clearTimeout(timer);
  }, [activeTab, viewType, searchTerm, activeFilter, districtFilter, priorityFilter]);

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
            fetchTenders(true);
            fetchTodayTenders(true);
          }
        } catch (error) {
          console.error("Queue processing error", error);
        } finally {
          setIsProcessingQueue(false);
        }
      }
    };

    if (stats.pendingQueue > 0) {
      // Poll every 60 seconds to stay safely under Gemini's 15 Requests Per Minute limit
      interval = setInterval(processQueue, 60000);
      // Run immediately on first detect
      if (!isProcessingQueue) processQueue();
    }

    return () => clearInterval(interval);
  }, [stats.pendingQueue, isProcessingQueue, activeTab]);

  const handleScrape = async (type: 'district' | 'state') => {
    if (scraping) return;
    setScraping(true);
    try {
      let totalNew = 0;
      let totalProcessed = 0;
      
      if (type === 'district') {
        const { DISTRICTS } = await import("@/lib/scraper/districts");
        for (const district of DISTRICTS) {
          try {
            // Update button UI state to show progress
            const btn = document.getElementById("scrape-btn-district");
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
      } else if (type === 'state') {
        const btn = document.getElementById("scrape-btn-state");
        if (btn) btn.innerText = `Crawling State Portal...`;
        
        const res = await axios.post("/api/scrape", { district: 'state' });
        if (res.data.success) {
          totalNew += res.data.newTenders || 0;
        }
        alert(`Scraping completed! Found ${totalNew} new state tenders.`);
      }
      
      fetchTenders(true);
      fetchTodayTenders(true);
    } catch (error) {
      console.error("Scraping error:", error);
      alert("Failed to trigger scrape.");
    } finally {
      setScraping(false);
      const btnD = document.getElementById("scrape-btn-district");
      if (btnD) btnD.innerText = "Run District Scraper";
      const btnS = document.getElementById("scrape-btn-state");
      if (btnS) btnS.innerText = "Run State Scraper";
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
              </div>
            </div>

            {/* Navigation - Middle */}
            <nav className="flex gap-4 sm:gap-6 overflow-x-auto hide-scrollbar w-full lg:w-auto lg:h-full items-center justify-start lg:justify-center">
              {[
                { id: "district", label: "District Tenders" },
                { id: "state", label: "State Tenders" },
                { id: "today", label: "Today" },
                { id: "this_week", label: "This Week" },
                { id: "bookmarks", label: "Bookmarks" },
                { id: "applied", label: "Applied" }
              ].map((tab) => (
                <Link
                  key={tab.id}
                  href={`/dashboard/${tab.id}`}
                  className={`whitespace-nowrap lg:h-full py-2 lg:py-0 border-b-2 font-medium text-sm transition-colors flex items-center ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>

            {/* Actions - Right (Visible only on desktop) */}
            <div className="hidden lg:flex items-center gap-3 shrink-0 relative">
              <button
                id="scrape-btn-district"
                onClick={() => handleScrape('district')}
                disabled={scraping}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white transition-colors
                  ${scraping ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${scraping ? 'animate-spin' : ''}`} />
                {scraping ? 'Crawling Districts...' : 'Run District Scraper'}
              </button>
              <button
                id="scrape-btn-state"
                onClick={() => handleScrape('state')}
                disabled={scraping}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white transition-colors
                  ${scraping ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${scraping ? 'animate-spin' : ''}`} />
                {scraping ? 'Crawling State...' : 'Run State Scraper'}
              </button>

              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors border border-gray-200"
                >
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="capitalize">{username || "Profile"}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 overflow-hidden">
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                      onClick={() => {
                        setIsSettingsOpen(true);
                        setDropdownOpen(false);
                      }}
                    >
                      <Settings className="w-4 h-4 shrink-0" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                        window.location.href = "/login";
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {(activeTab === "district" || activeTab === "state") && (
          <>
            <DashboardStats 
              total={stats.total} 
              active={stats.active} 
              expiring={stats.expiring} 
              districts={stats.districtsCrawled}
              onFilterClick={setActiveFilter}
              onDistrictsClick={() => setIsDistrictsModalOpen(true)}
              typeLabel={activeTab === 'state' ? 'Organisation' : 'District'}
              pendingQueue={stats.pendingQueue}
            />

            {todayTenders.length > 0 && (
              <div className="mb-8 mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    📅 Today's Tenders
                  </h2>
                </div>
                <TenderTable 
                  tenders={todayTenders}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  activeFilter={activeFilter}
                  setActiveFilter={setActiveFilter}
                  districtFilter={districtFilter}
                  setDistrictFilter={setDistrictFilter}
                  priorityFilter={priorityFilter}
                  setPriorityFilter={setPriorityFilter}
                  highPriorityCount={stats.highPriority}
                  hideControls={false}
                  typeLabel={activeTab === 'state' ? 'Organisation' : 'District'}
                />
              </div>
            )}
          </>
        )}
        
        <div className="mb-6 mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {activeTab === 'district' && 'District Tenders'}
              {activeTab === 'state' && 'State Tenders'}
              {activeTab === 'today' && "Today's Tenders"}
              {activeTab === 'this_week' && "This Week's Tenders"}
              {activeTab === 'bookmarks' && 'Bookmarked Tenders'}
              {activeTab === 'applied' && 'Applied Tenders'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'district' && 'Monitor and track latest tenders across districts.'}
              {activeTab === 'state' && 'State-level tenders from NICGEP portal.'}
              {activeTab === 'today' && 'Tenders published today.'}
              {activeTab === 'this_week' && 'Tenders published within the current week.'}
              {activeTab === 'bookmarks' && 'Your saved tenders for quick access.'}
              {activeTab === 'applied' && 'Tenders you have submitted applications for.'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
            {(activeTab === 'today' || activeTab === 'this_week') && (
              <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
                <button 
                  onClick={() => setViewType('all')} 
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewType === 'all' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setViewType('district')} 
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewType === 'district' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  District
                </button>
                <button 
                  onClick={() => setViewType('state')} 
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewType === 'state' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  State
                </button>
              </div>
            )}

          </div>
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
            highPriorityCount={stats.highPriority}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            page={page}
            totalPages={tableTotalPages}
            onPageChange={setPage}
            onOpenSettings={() => setIsSettingsOpen(true)}
            typeLabel={activeTab === 'state' || viewType === 'state' ? 'Organisation' : 'District'}
            organisations={activeTab === 'state' || viewType === 'state' ? stats.districtsData.map((d: any) => d.district) : undefined}
          />
        )}
      </main>
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={(changed) => {
          setIsSettingsOpen(false);
          if (changed) {
            // Re-fetch tenders and stats to reflect new keywords
            fetchTenders();
          }
        }} 
      />

      {/* Districts Modal */}
      <DistrictsModal
        isOpen={isDistrictsModalOpen}
        onClose={() => setIsDistrictsModalOpen(false)}
        districtsData={stats.districtsData || []}
        onSelectDistrict={(district) => {
          setDistrictFilter(district);
          setIsDistrictsModalOpen(false);
        }}
        typeLabel={activeTab === 'state' ? 'Organisation' : 'District'}
      />
    </div>
  );
}
