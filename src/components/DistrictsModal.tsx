import { X, MapPin } from "lucide-react";

interface DistrictsModalProps {
  isOpen: boolean;
  onClose: () => void;
  districtsData: { district: string; _count: { _all: number } }[];
  onSelectDistrict: (district: string) => void;
}

export function DistrictsModal({ isOpen, onClose, districtsData, onSelectDistrict }: DistrictsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-4xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Districts Crawled</h2>
              <p className="text-sm text-gray-500 font-medium">Click on any district to filter the dashboard</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {districtsData && districtsData.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {districtsData.map((d) => (
                <button
                  key={d.district}
                  onClick={() => onSelectDistrict(d.district)}
                  className="inline-flex items-center justify-between gap-4 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-200 hover:bg-purple-50 transition-all duration-200 group w-max"
                >
                  <span className="font-semibold text-gray-700 group-hover:text-purple-700 capitalize">
                    {d.district}
                  </span>
                  <span className="flex items-center justify-center min-w-[28px] h-7 px-2.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-lg group-hover:bg-purple-100 group-hover:text-purple-700 transition-colors">
                    {d._count._all}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No districts data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
