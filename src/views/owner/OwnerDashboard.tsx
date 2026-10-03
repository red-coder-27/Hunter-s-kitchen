import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Order, AnalyticsSummary } from '../../types';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  Users,
  Bike,
  Flame,
  RefreshCw,
  Utensils,
  BarChart3,
  ChevronRight
} from 'lucide-react';

interface OwnerDashboardProps {
  onNavigateTab: (tab: string, filter?: string) => void;
  onSelectOrder: (orderId: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onNavigateTab, onSelectOrder }) => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [analyticsData, ordersData] = await Promise.all([
        apiService.getAnalytics(),
        apiService.getOrders({ role: 'OWNER' })
      ]);
      setAnalytics(analyticsData);
      setRecentOrders(ordersData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const pendingOrders = recentOrders.filter((o) => o.status === 'PLACED');
  const preparingOrders = recentOrders.filter((o) => o.status === 'PREPARING');
  const readyOrders = recentOrders.filter((o) => o.status === 'READY');
  const onTheWayOrders = recentOrders.filter(
    (o) => o.status === 'OUT_FOR_DELIVERY' || o.status === 'PICKED_UP' || o.status === 'ASSIGNED'
  );

  return (
    <div className="pb-28 md:pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* Top Owner Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase text-stone-400 tracking-wider">
            Restaurant Command Center
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">Hunter's Kitchen</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow">
          <p className="text-[10px] sm:text-xs font-extrabold text-stone-400 uppercase tracking-wider">Today's Revenue</p>
          <p className="text-xl sm:text-2xl font-black text-stone-900 mt-1">₹{analytics?.revenueToday || 0}</p>
          <span className="text-[11px] font-bold text-emerald-600 inline-block mt-1">Online &amp; COD</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow">
          <p className="text-[10px] sm:text-xs font-extrabold text-stone-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-xl sm:text-2xl font-black text-stone-900 mt-1">{analytics?.totalOrdersToday || 0}</p>
          <span className="text-[11px] text-stone-500 font-medium inline-block mt-1">Completed: {analytics?.completedOrders || 0}</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow">
          <p className="text-[10px] sm:text-xs font-extrabold text-amber-600 uppercase tracking-wider">Pending New</p>
          <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1">{pendingOrders.length}</p>
          <span className="text-[11px] text-amber-700 font-medium inline-block mt-1">Needs Action</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow">
          <p className="text-[10px] sm:text-xs font-extrabold text-stone-400 uppercase tracking-wider">Avg Rating</p>
          <p className="text-xl sm:text-2xl font-black text-stone-900 mt-1 flex items-center gap-1.5">
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" /> {analytics?.avgRating && analytics.avgRating > 0 ? analytics.avgRating.toFixed(1) : '—'}
          </p>
          <span className="text-[11px] text-stone-500 font-medium inline-block mt-1">
            {analytics?.avgRating && analytics.avgRating > 0 ? 'Customer Feedback' : 'No ratings yet'}
          </span>
        </div>
      </div>

      {/* Urgent Incoming Orders Warning Banner */}
      {pendingOrders.length > 0 && (
        <div
          onClick={() => onNavigateTab('owner_orders', 'PLACED')}
          className="bg-amber-500 text-stone-950 p-4 sm:p-5 rounded-2xl flex items-center justify-between cursor-pointer shadow-md hover:bg-amber-400 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-stone-950 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Flame className="w-6 h-6 fill-amber-400" />
            </div>
            <div>
              <h4 className="font-black text-sm sm:text-base text-stone-950">
                {pendingOrders.length} New Incoming Order{pendingOrders.length > 1 ? 's' : ''}!
              </h4>
              <p className="text-xs text-stone-900 font-medium">Click to review, accept or reject immediately.</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-950 shrink-0" />
        </div>
      )}

      {/* Responsive 2-column or 3-column Layout for Laptop / PC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Operational Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs sm:text-sm text-stone-900 uppercase tracking-wider">
              Live Operational Pipeline
            </h3>
            <button
              onClick={() => onNavigateTab('owner_orders', 'ALL')}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Orders</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
            <div
              onClick={() => onNavigateTab('owner_orders', 'PREPARING')}
              className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 hover:bg-amber-50 border border-amber-200 cursor-pointer transition-all hover:shadow-xs group"
            >
              <p className="text-xs font-extrabold text-amber-900 tracking-wider">PREPARING</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{preparingOrders.length}</p>
              <p className="text-[11px] text-amber-800/80 font-medium mt-1">In kitchen</p>
            </div>

            <div
              onClick={() => onNavigateTab('owner_orders', 'READY')}
              className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200 cursor-pointer transition-all hover:shadow-xs group"
            >
              <p className="text-xs font-extrabold text-emerald-900 tracking-wider">READY</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{readyOrders.length}</p>
              <p className="text-[11px] text-emerald-800/80 font-medium mt-1">Ready for pickup</p>
            </div>

            <div
              onClick={() => onNavigateTab('owner_orders', 'OUT_FOR_DELIVERY')}
              className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 hover:bg-blue-50 border border-blue-200 cursor-pointer transition-all hover:shadow-xs group"
            >
              <p className="text-xs font-extrabold text-blue-900 tracking-wider">ON THE ROAD</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">{onTheWayOrders.length}</p>
              <p className="text-[11px] text-blue-800/80 font-medium mt-1">Out for delivery</p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Navigation Cards */}
        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={() => onNavigateTab('owner_menu')}
            className="w-full p-4 sm:p-5 rounded-2xl bg-blue-50/70 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 text-left shadow-2xs hover:shadow-xs transition-all group flex items-start gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-3xs">
              <Utensils className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <h4 className="font-extrabold text-sm text-blue-950">Manage Menu</h4>
              <p className="text-xs text-blue-700/80 mt-0.5 font-medium">Add dishes, update prices & availability</p>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
          </button>

          <button
            onClick={() => onNavigateTab('owner_analytics')}
            className="w-full p-4 sm:p-5 rounded-2xl bg-blue-50/70 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 text-left shadow-2xs hover:shadow-xs transition-all group flex items-start gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-3xs">
              <BarChart3 className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <h4 className="font-extrabold text-sm text-blue-950">Dish & Revenue Analytics</h4>
              <p className="text-xs text-blue-700/80 mt-0.5 font-medium">Sales trends, peak hours & dish metrics</p>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
          </button>

          <button
            onClick={() => onNavigateTab('owner_staff')}
            className="w-full p-4 sm:p-5 rounded-2xl bg-blue-50/70 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 text-left shadow-2xs hover:shadow-xs transition-all group flex items-start gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-3xs">
              <Users className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-blue-950">Staff &amp; Delivery Fleet</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {analytics?.activeDriverCount || 0} Online
                </span>
              </div>
              <p className="text-xs text-blue-700/80 mt-0.5 font-medium">Manage kitchen crew and delivery drivers</p>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all self-center shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
