import { FileText, CheckCircle, Clock, MapPin } from "lucide-react";

interface StatsProps {
  total: number;
  active: number;
  expiring: number;
  districts: number;
  onFilterClick?: (filter: string) => void;
  onDistrictsClick?: () => void;
}

export function DashboardStats({ total, active, expiring, districts, onFilterClick, onDistrictsClick }: StatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard 
        title="Total Tenders" 
        value={total} 
        icon={<FileText className="w-6 h-6 text-blue-500" />} 
        bgColor="bg-blue-50" 
        onClick={() => onFilterClick && onFilterClick('all')}
      />
      <StatCard 
        title="Active Tenders" 
        value={active} 
        icon={<CheckCircle className="w-6 h-6 text-emerald-500" />} 
        bgColor="bg-emerald-50" 
        onClick={() => onFilterClick && onFilterClick('active')}
      />
      <StatCard 
        title="Expiring Soon (7d)" 
        value={expiring} 
        icon={<Clock className="w-6 h-6 text-amber-500" />} 
        bgColor="bg-amber-50" 
        onClick={() => onFilterClick && onFilterClick('expiring')}
      />
      <StatCard 
        title="Districts Crawled" 
        value={districts} 
        icon={<MapPin className="w-6 h-6 text-purple-500" />} 
        bgColor="bg-purple-50" 
        onClick={onDistrictsClick}
      />
    </div>
  );
}

function StatCard({ title, value, icon, bgColor, onClick }: { title: string; value: number; icon: React.ReactNode; bgColor: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:border-blue-200' : ''}`}
    >
      <div className={`p-4 rounded-full ${bgColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
