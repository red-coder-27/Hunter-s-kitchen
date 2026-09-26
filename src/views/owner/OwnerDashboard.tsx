import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  Power,
  RefreshCw,
  Utensils,
  BarChart3,
  ChevronRight
} from 'lucide-react';

interface OwnerDashboardProps {
  onNavigateTab: (tab: string) => void;
  onSelectOrder: (orderId: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onNavigateTab, onSelectOrder }) => {
  const { settings, refreshSettings } = useAuth();
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

  const handleToggleStoreOpen = async () => {
    if (!settings) return;
    try {
      await apiService.updateSettings({ isOpen: !settings.isOpen });
      await refreshSettings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePause = async () => {
    if (!settings) return;
    try {
      await apiService.updateSettings({
        temporaryPause: !settings.temporaryPause,
        pauseReason: !settings.temporaryPause ? 'Kitchen busy with rush orders' : ''
      });
      await refreshSettings();
    } catch (err) {
      console.error(err);
    }
  };

  const pendingOrders = recentOrders.filter((o) => o.status === 'PLACED');
  const preparingOrders = recentOrders.filter((o) => o.status === 'PREPARING');
  const readyOrders = recentOrders.filter((o) => o.status === 'READY');

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

      {/* Restaurant Status Controls */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                settings?.isOpen && !settings?.temporaryPause ? 'bg-emerald-500 animate-ping' : 'bg-red-600'
              }`}
            ></span>
            <div>
              <h4 className="font-extrabold text-xs sm:text-sm text-stone-900 uppercase tracking-wide">
                Status:{' '}
                {settings?.isOpen
                  ? settings?.temporaryPause
                    ? 'PAUSED'
                    : 'OPEN FOR ORDERS'
                  : 'CLOSED'}
              </h4>
              <p className="text-xs text-stone-500">
                {settings?.temporaryPause
                  ? 'Orders temporarily paused'
                  : 'Accepting online & COD orders'}
              </p>
            </div>
          </div>

          <div className="flex gap-2.5 self-end sm:self-auto">
            <button
              onClick={handleTogglePause}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                settings?.temporaryPause
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
              }`}
            >
              {settings?.temporaryPause ? 'Resume' : 'Pause'}
            </button>

            <button
              onClick={handleToggleStoreOpen}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                settings?.isOpen
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {settings?.isOpen ? 'Close Store' : 'Open Store'}
            </button>
          </div>
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
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" /> {analytics?.avgRating || 4.8}
          </p>
          <span className="text-[11px] text-stone-500 font-medium inline-block mt-1">Customer Feedback</span>
        </div>
      </div>

      {/* Urgent Incoming Orders Warning Banner */}
      {pendingOrders.length > 0 && (
        <div
          onClick={() => onNavigateTab('owner_orders')}
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
              onClick={() => onNavigateTab('owner_orders')}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All Orders</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
            <div
              onClick={() => onNavigateTab('owner_orders')}
              className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 hover:bg-amber-50 border border-amber-200 cursor-pointer transition-all hover:shadow-xs group"
            >
              <p className="text-xs font-extrabold text-amber-900 tracking-wider">PREPARING</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{preparingOrders.length}</p>
              <p className="text-[11px] text-amber-800/80 font-medium mt-1">In kitchen</p>
            </div>

            <div
              onClick={() => onNavigateTab('owner_orders')}
              className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200 cursor-pointer transition-all hover:shadow-xs group"
            >
              <p className="text-xs font-extrabold text-emerald-900 tracking-wider">READY</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{readyOrders.length}</p>
              <p className="text-[11px] text-emerald-800/80 font-medium mt-1">Ready for pickup</p>
            </div>

            <div
              onClick={() => onNavigateTab('owner_orders')}
              className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 hover:bg-blue-50 border border-blue-200 cursor-pointer transition-all hover:shadow-xs group"
            >
              <p className="text-xs font-extrabold text-blue-900 tracking-wider">FLEET ACTIVE</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">{analytics?.activeDriverCount || 0}</p>
              <p className="text-[11px] text-blue-800/80 font-medium mt-1">Riders on road</p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Navigation Cards */}
        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={() => onNavigateTab('owner_menu')}
            className="w-full p-4 sm:p-5 rounded-2xl bg-stone-900 text-white text-left shadow-sm hover:bg-stone-800 transition-all group flex items-start gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Utensils className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm">Manage Menu</h4>
              <p className="text-xs text-stone-400 mt-0.5">Add dishes, update prices & availability</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('owner_analytics')}
            className="w-full p-4 sm:p-5 rounded-2xl bg-stone-900 text-white text-left shadow-sm hover:bg-stone-800 transition-all group flex items-start gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm">Dish & Revenue Analytics</h4>
              <p className="text-xs text-stone-400 mt-0.5">Sales trends, peak hours & dish metrics</p>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('owner_staff')}
            className="w-full p-4 sm:p-5 rounded-2xl bg-stone-900 text-white text-left shadow-sm hover:bg-stone-800 transition-all group flex items-start gap-3.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm">Staff & Delivery Fleet</h4>
              <p className="text-xs text-stone-400 mt-0.5">Manage kitchen crew and delivery drivers</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
