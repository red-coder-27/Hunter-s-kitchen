import React, { useState, useEffect, useRef } from 'react';
import { Order, User, StaffSubRole, OrderStatus } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StaffProfileView } from './StaffProfileView';
import { StaffInventoryView } from './StaffInventoryView';
import {
  Utensils,
  Check,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Bike,
  ClipboardList,
  User as UserIcon,
  TrendingUp,
  LogOut,
  AlertTriangle,
  Sparkles,
  ChefHat,
  X,
  ShieldCheck,
  AlertCircle,
  CookingPot,
  Activity,
  Award,
  Volume2,
  VolumeX,
  Package,
  ArrowRight,
  Flame,
  Printer
} from 'lucide-react';

interface StaffDashboardProps {
  activeTab?: string;
  onNavigateTab?: (tab: string) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ activeTab = 'staff_dashboard', onNavigateTab }) => {
  const { currentUser, logout } = useAuth();
  const staffRole: StaffSubRole = currentUser?.staffRole || 'GENERAL_MANAGER';

  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection modal state
  const [rejectionOrderId, setRejectionOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Item out of stock');

  // Chef station category filters
  const [chefCategoryFilter, setChefCategoryFilter] = useState<string>('ALL');

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Audio Alerts Chime
  const [audioEnabled, setAudioEnabled] = useState(true);
  const prevPlacedCount = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const playKitchenChime = () => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Tone 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.18, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.5);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const loadOrders = async () => {
    try {
      const [ordersData, driversData, staffData] = await Promise.all([
        apiService.getOrders({ role: 'STAFF' }),
        apiService.getUsers('DELIVERY_PARTNER'),
        apiService.getUsers('STAFF')
      ]);

      const safeOrders = Array.isArray(ordersData) ? ordersData : [];
      const newPlaced = safeOrders.filter((o: Order) => o.status === 'PLACED').length;
      if (prevPlacedCount.current !== null && newPlaced > prevPlacedCount.current) {
        playKitchenChime();
      }
      prevPlacedCount.current = newPlaced;
      setOrders(safeOrders);

      const safeDrivers = Array.isArray(driversData) ? driversData : [];

      // Include all active delivery partners, prioritizing online ones
      const combined = safeDrivers.filter((u) => u.role === 'DELIVERY_PARTNER' && (u.partnerStatus === 'ONLINE' || u.status === 'ACTIVE'));
      
      // De-duplicate by user ID
      const uniquePartnersMap = new Map<string, User>();
      combined.forEach((p) => uniquePartnersMap.set(p.id, p));
      setDeliveryPartners(Array.from(uniquePartnersMap.values()));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (id: string) => {
    try {
      await apiService.acceptOrder(id, currentUser?.id);
      await loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await apiService.rejectOrder(id, reason, currentUser?.id);
      setRejectionOrderId(null);
      await loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrepare = async (id: string) => {
    try {
      await apiService.markPreparing(id, currentUser?.id);
      await loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReady = async (id: string) => {
    try {
      await apiService.markReady(id, currentUser?.id);
      await loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async (id: string, partnerId: string) => {
    try {
      await apiService.assignDelivery(id, partnerId, currentUser?.id);
      await loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePickup = async (id: string) => {
    try {
      await apiService.markPickup(id, currentUser?.id);
      await loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOutForDelivery = async (id: string) => {
    try {
      await apiService.markOutForDelivery(id, currentUser?.id);
      await loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelivered = async (id: string) => {
    try {
      await apiService.markDelivered(id, currentUser?.id);
      await loadOrders();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter orders based on status
  const placedOrders = orders.filter((o) => o.status === 'PLACED');
  const acceptedOrders = orders.filter((o) => o.status === 'ACCEPTED');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const assignedOrders = orders.filter((o) => o.status === 'ASSIGNED' || o.status === 'PICKED_UP' || o.status === 'OUT_FOR_DELIVERY');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  // Search filtered items
  const filterBySearch = (list: Order[]) => {
    if (!searchQuery) return list;
    return list.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Render the role name beautifully
  const getRoleLabel = (role: StaffSubRole) => {
    switch (role) {
      case 'GENERAL_MANAGER':
        return 'General Manager (All Access & Deliveries)';
      case 'KITCHEN_STAFF':
      case 'STAFF':
      default:
        return 'Kitchen Staff (Order Accept, Reject & Assign)';
    }
  };

  const getRoleIcon = (role: StaffSubRole) => {
    switch (role) {
      case 'KITCHEN_MANAGER':
        return <Award className="w-4 h-4 text-red-600" />;
      case 'GENERAL_MANAGER':
        return <ShieldCheck className="w-4 h-4 text-red-600" />;
      case 'HEAD_CHEF':
      case 'KITCHEN_CHEF':
        return <ChefHat className="w-4 h-4 text-amber-600" />;
      case 'LINE_COOK':
        return <CookingPot className="w-4 h-4 text-amber-600" />;
      case 'ORDER_BILLER':
      case 'FRONT_DESK':
        return <ClipboardList className="w-4 h-4 text-blue-600" />;
      case 'STORE_DISPATCHER':
        return <Bike className="w-4 h-4 text-emerald-600" />;
      default:
        return <Award className="w-4 h-4 text-stone-600" />;
    }
  };

  // ----------------------------------------------------------------------
  // SUB-VIEW 1: STAFF HOME DASHBOARD
  // ----------------------------------------------------------------------
  const renderDashboard = () => {
    const totalActive = placedOrders.length + acceptedOrders.length + preparingOrders.length + readyOrders.length;
    const isManager = staffRole === 'KITCHEN_MANAGER' || staffRole === 'GENERAL_MANAGER';
    const isChef = isManager || staffRole === 'KITCHEN_CHEF' || staffRole === 'HEAD_CHEF' || staffRole === 'LINE_COOK';
    const isBiller = isManager || staffRole === 'ORDER_BILLER' || staffRole === 'FRONT_DESK';
    const isDispatcher = isManager || staffRole === 'STORE_DISPATCHER';
    const isInventory = isManager || staffRole === 'KITCHEN_CHEF' || staffRole === 'HEAD_CHEF';

    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        {/* Welcome & Command Header Banner */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-700 to-amber-600 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
              {currentUser?.name.charAt(0) || 'K'}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                  Terminal Online • {currentUser?.name}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Sync
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                Hunter's Kitchen Operations Center
              </h3>
              <div className="flex items-center gap-1.5 pt-0.5">
                {getRoleIcon(staffRole)}
                <span className="text-xs font-bold text-stone-700">
                  Station: {getRoleLabel(staffRole)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Live Clock */}
            <div className="px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-center font-mono">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-stone-400 block">KITCHEN TIME</span>
              <span className="text-xs font-black text-stone-900">{currentTime}</span>
            </div>

            {/* Audio Chime Toggle */}
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                audioEnabled
                  ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
              }`}
              title={audioEnabled ? 'Kitchen chime is active for new orders' : 'Chime muted'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-amber-700" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{audioEnabled ? 'Chime ON' : 'Muted'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={loadOrders}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Station Quick Jump KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isBiller && (
            <button
              onClick={() => onNavigateTab?.('staff_order_desk')}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-3xs text-left hover:border-blue-500 hover:shadow-2xs transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-center justify-between">
                <ClipboardList className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                {placedOrders.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 animate-pulse">
                    Action Needed
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-stone-900 mt-2">{placedOrders.length}</div>
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-tight mt-0.5 flex items-center justify-between">
                <span>Order Review</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}

          {isChef && (
            <button
              onClick={() => onNavigateTab?.('staff_chef_station')}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-3xs text-left hover:border-amber-500 hover:shadow-2xs transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-center justify-between">
                <CookingPot className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                {preparingOrders.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                    🔥 {preparingOrders.length} Cooking
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-stone-900 mt-2">
                {acceptedOrders.length + preparingOrders.length}
              </div>
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-tight mt-0.5 flex items-center justify-between">
                <span>Kitchen (KDS)</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}

          {isDispatcher && (
            <button
              onClick={() => onNavigateTab?.('staff_dispatch_hub')}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-3xs text-left hover:border-emerald-500 hover:shadow-2xs transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-center justify-between">
                <Bike className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                {readyOrders.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 animate-pulse">
                    Ready to Ship
                  </span>
                )}
              </div>
              <div className="text-2xl font-black text-stone-900 mt-2">{readyOrders.length}</div>
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-tight mt-0.5 flex items-center justify-between">
                <span>Dispatch Hub</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}

          {isInventory && (
            <button
              onClick={() => onNavigateTab?.('staff_inventory')}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-3xs text-left hover:border-red-500 hover:shadow-2xs transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-center justify-between">
                <Package className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800">
                  86-ing
                </span>
              </div>
              <div className="text-2xl font-black text-stone-900 mt-2">Menu & Stock</div>
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-tight mt-0.5 flex items-center justify-between">
                <span>Manage 86 Items</span>
                <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}
        </div>

        {/* Live Kitchen Operations Board (Kanban Action Pipeline) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-red-600" />
              Live Kitchen Pipeline ({totalActive} Active Runs)
            </h4>
            <span className="text-[11px] font-semibold text-stone-400">
              One-click state transitions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Placed / Review */}
            <div className="bg-stone-100/70 rounded-2xl p-3 border border-stone-200 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-xs font-black text-blue-900 uppercase tracking-tight flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                  1. Incoming Review ({placedOrders.length})
                </span>
                {placedOrders.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                )}
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[480px] pr-1">
                {placedOrders.length === 0 ? (
                  <div className="bg-white rounded-xl p-6 text-center border border-dashed border-stone-200 text-stone-400 text-xs">
                    <CheckCircle2 className="w-7 h-7 mx-auto mb-1.5 text-emerald-500 opacity-80" />
                    <p className="font-bold text-stone-700">All Caught Up</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">No pending customer orders to review.</p>
                  </div>
                ) : (
                  placedOrders.map((ord) => (
                    <div key={ord.id} className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-xs text-stone-900">#{ord.orderNumber}</span>
                          <p className="text-[11px] text-stone-600 font-semibold">{ord.customerName}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-red-700">₹{ord.grandTotal}</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded block mt-0.5">
                            {ord.paymentMethod === 'ONLINE' ? 'Paid Online' : 'COD'}
                          </span>
                        </div>
                      </div>

                      {/* Items list */}
                      <div className="text-xs space-y-1 bg-stone-50 p-2 rounded-lg border border-stone-100">
                        {(ord.items || []).map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] font-medium text-stone-800">
                            <span className="font-bold text-stone-900">{it.quantity}x {it.name}</span>
                          </div>
                        ))}
                      </div>

                      {ord.orderNotes && (
                        <div className="p-1.5 bg-amber-50 rounded text-[10px] text-amber-900 font-medium border border-amber-100">
                          <strong>Note:</strong> {ord.orderNotes}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-1 flex gap-1.5">
                        <button
                          onClick={() => setRejectionOrderId(ord.id)}
                          className="flex-1 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAccept(ord.id)}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Cooking Queue */}
            <div className="bg-stone-100/70 rounded-2xl p-3 border border-stone-200 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-xs font-black text-amber-900 uppercase tracking-tight flex items-center gap-1.5">
                  <CookingPot className="w-3.5 h-3.5 text-amber-600" />
                  2. Kitchen Cooking ({acceptedOrders.length + preparingOrders.length})
                </span>
                {preparingOrders.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-200 text-amber-900">
                    🔥 {preparingOrders.length} on stove
                  </span>
                )}
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[480px] pr-1">
                {acceptedOrders.length + preparingOrders.length === 0 ? (
                  <div className="bg-white rounded-xl p-6 text-center border border-dashed border-stone-200 text-stone-400 text-xs">
                    <CookingPot className="w-7 h-7 mx-auto mb-1.5 text-amber-400 opacity-80" />
                    <p className="font-bold text-stone-700">Kitchen Clear</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">No pending recipes in the cooking pipeline.</p>
                  </div>
                ) : (
                  [...acceptedOrders, ...preparingOrders].map((ord) => (
                    <div
                      key={ord.id}
                      className={`bg-white p-3.5 rounded-xl border shadow-2xs space-y-2.5 ${
                        ord.status === 'PREPARING' ? 'border-amber-300 bg-amber-50/20' : 'border-stone-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-stone-900">#{ord.orderNumber}</span>
                            {ord.status === 'PREPARING' && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-900">
                                🔥 Cooking
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400 font-semibold flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> Target: 15m
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-stone-500">{ord.items?.length || 0} items</span>
                      </div>

                      {/* Items */}
                      <div className="text-xs space-y-1 bg-stone-50 p-2 rounded-lg border border-stone-100">
                        {(ord.items || []).map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span className="font-extrabold text-stone-900">{it.quantity}x {it.name}</span>
                          </div>
                        ))}
                      </div>

                      {ord.orderNotes && (
                        <div className="p-1.5 bg-amber-50 rounded text-[10px] text-amber-900 font-medium border border-amber-100 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                          <span>{ord.orderNotes}</span>
                        </div>
                      )}

                      {/* Action */}
                      <div className="pt-1">
                        {ord.status === 'ACCEPTED' ? (
                          <button
                            onClick={() => handlePrepare(ord.id)}
                            className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Flame className="w-3.5 h-3.5" /> Start Cooking
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReady(ord.id)}
                            className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Food Ready
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Ready for Dispatch */}
            <div className="bg-stone-100/70 rounded-2xl p-3 border border-stone-200 space-y-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-tight flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-emerald-600" />
                  3. Ready for Delivery ({readyOrders.length})
                </span>
                {readyOrders.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                )}
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[480px] pr-1">
                {readyOrders.length === 0 ? (
                  <div className="bg-white rounded-xl p-6 text-center border border-dashed border-stone-200 text-stone-400 text-xs">
                    <Bike className="w-7 h-7 mx-auto mb-1.5 text-emerald-500 opacity-80" />
                    <p className="font-bold text-stone-700">Dispatch Queue Clear</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">All prepared orders have been dispatched.</p>
                  </div>
                ) : (
                  readyOrders.map((ord) => (
                    <div key={ord.id} className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-xs text-stone-900">#{ord.orderNumber}</span>
                          <p className="text-[11px] text-stone-700 font-semibold">{ord.customerName}</p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                          Ready & Packed
                        </span>
                      </div>

                      <div className="text-[10px] space-y-0.5 text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-100">
                        <p className="truncate">
                          <strong>Address:</strong> {ord.deliveryAddress ? `${ord.deliveryAddress.doorNo || ''}, ${ord.deliveryAddress.area || ''}` : 'Counter Pickup'}
                        </p>
                        <p className="font-bold text-stone-800">Total: ₹{ord.grandTotal} • {ord.paymentMethod === 'ONLINE' ? 'PAID' : 'COD'}</p>
                      </div>

                      {/* Driver Assignment Dropdown */}
                      <div className="pt-1 space-y-1">
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleAssign(ord.id, e.target.value);
                          }}
                          defaultValue=""
                          className="w-full p-2 border border-stone-200 rounded-lg text-xs font-semibold bg-white text-stone-800 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="" disabled>Assign Delivery Partner...</option>
                          {currentUser?.staffRole === 'GENERAL_MANAGER' && (
                            <option value={currentUser.id}>
                              ⭐ Self-Assign: {currentUser.name} (General Manager)
                            </option>
                          )}
                          {deliveryPartners.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.vehicleNumber || 'Bike'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Personal Delivery Runs (if any) */}
        {orders.filter((o) => o.assignedDeliveryPartnerId === currentUser?.id && o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length > 0 && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 shadow-2xs space-y-3 animate-pulse-slow">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Bike className="w-4 h-4 text-emerald-700" /> My Active Delivery Runs ({orders.filter((o) => o.assignedDeliveryPartnerId === currentUser?.id && o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length})
              </h4>
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase">Staff Run</span>
            </div>

            <div className="space-y-2.5">
              {orders
                .filter((o) => o.assignedDeliveryPartnerId === currentUser?.id && o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
                .map((ord) => (
                  <div key={ord.id} className="bg-white p-3 rounded-xl border border-emerald-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-stone-900">Order #{ord.orderNumber}</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                        {ord.status}
                      </span>
                    </div>
                    <div className="space-y-0.5 text-stone-600 text-[11px]">
                      <p className="font-bold text-stone-800">Customer: {ord.customerName} ({ord.customerPhone})</p>
                      <p className="truncate">
                        Address: {ord.deliveryAddress ? `${ord.deliveryAddress.doorNo || ''}, ${ord.deliveryAddress.street || ''}, ${ord.deliveryAddress.area || ''}` : 'In-Store Pickup'}
                      </p>
                      <p className="font-semibold text-stone-500">Total: ₹{ord.grandTotal} • {ord.paymentMethod === 'ONLINE' ? 'PAID' : 'COD'}</p>
                    </div>

                    <div className="pt-1 flex gap-2">
                      {ord.status === 'READY' || ord.status === 'ASSIGNED' ? (
                        <button
                          onClick={() => handlePickup(ord.id)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors uppercase tracking-wider"
                        >
                          Pick up Order from Kitchen
                        </button>
                      ) : ord.status === 'PICKED_UP' ? (
                        <button
                          onClick={() => handleOutForDelivery(ord.id)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors uppercase tracking-wider"
                        >
                          Start Out For Delivery
                        </button>
                      ) : ord.status === 'OUT_FOR_DELIVERY' ? (
                        <button
                          onClick={() => handleDelivered(ord.id)}
                          className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-colors uppercase tracking-wider"
                        >
                          Mark Delivered & Collect ₹{ord.grandTotal}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Status Activity Gauge */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-stone-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Activity className="w-4 h-4 text-red-600" /> Operational Shift Load
            </h4>
            <span className="text-[10px] font-extrabold text-stone-500 uppercase">
              {totalActive} Active Runs • {deliveredOrders.length} Completed Today
            </span>
          </div>

          <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${placedOrders.length ? (placedOrders.length / (totalActive || 1)) * 100 : 0}%` }}
              className="bg-blue-500 h-full transition-all"
              title="Reviewing"
            />
            <div
              style={{ width: `${(acceptedOrders.length + preparingOrders.length) ? ((acceptedOrders.length + preparingOrders.length) / (totalActive || 1)) * 100 : 0}%` }}
              className="bg-amber-500 h-full transition-all"
              title="In Preparation"
            />
            <div
              style={{ width: `${readyOrders.length ? (readyOrders.length / (totalActive || 1)) * 100 : 0}%` }}
              className="bg-emerald-500 h-full transition-all"
              title="Ready"
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-stone-500 font-bold px-1 pt-1">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Reviewing ({placedOrders.length})
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Cooking ({acceptedOrders.length + preparingOrders.length})
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ready for Delivery ({readyOrders.length})
            </div>
          </div>
        </div>

        {/* Live Broadcast Announcement */}
        <div className="p-4 bg-red-50 text-red-900 rounded-2xl border border-red-100 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <h4 className="font-extrabold">Executive Kitchen Standard Operating Procedure</h4>
            <p className="text-stone-600 leading-relaxed font-medium">
              Keep ticket preparation turn times under 15 minutes during peak service hours. Double-check all allergen customizations and make sure packaging is heat-sealed before delivery partner handover!
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------------------------
  // SUB-VIEW 2: BILLER / ORDER DESK
  // ----------------------------------------------------------------------
  const renderOrderDesk = () => {
    const list = filterBySearch(placedOrders);

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Order Desk terminal</span>
            <h3 className="text-base font-black text-stone-900 leading-tight">Incoming Orders ({placedOrders.length})</h3>
          </div>
          <button onClick={loadOrders} className="p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by order ID or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-stone-200 rounded-xl bg-white shadow-3xs"
          />
        </div>

        {list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-xs shadow-3xs">
            <ClipboardList className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="font-extrabold text-stone-600">No Pending Reviews</p>
            <p className="text-stone-400 mt-1">All incoming customer orders have been successfully routed!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {list.map((ord) => (
              <div key={ord.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
                <div className="flex justify-between items-start pb-2 border-b border-stone-100">
                  <div>
                    <span className="font-extrabold text-xs text-stone-900">#{ord.orderNumber}</span>
                    <p className="text-[11px] text-stone-500 mt-0.5">By {ord.customerName} ({ord.customerPhone})</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-black text-red-700">₹{ord.grandTotal}</span>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded-md mt-1">
                      {ord.paymentMethod === 'ONLINE' ? 'Paid Online' : 'Cash On Delivery'}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1.5 text-xs font-semibold text-stone-800">
                  {(ord.items || []).map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="font-black text-stone-900">{it.quantity}x</span> {it.name}
                        {it.customizations && it.customizations.length > 0 && (
                          <div className="text-[10px] text-stone-500 font-medium pl-4">
                            {it.customizations.map((c) => `${c.optionName}: ${c.selectedLabel}`).join(' • ')}
                          </div>
                        )}
                        {it.addons && it.addons.length > 0 && (
                          <div className="text-[10px] text-stone-500 font-medium pl-4">
                            + {it.addons.map((a) => a.name).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {ord.orderNotes && (
                  <div className="p-2.5 bg-amber-50 rounded-xl text-[11px] text-amber-900 font-medium border border-amber-100">
                    <strong>Note:</strong> {ord.orderNotes}
                  </div>
                )}

                {/* Action buttons */}
                <div className="pt-2 border-t border-stone-100 flex gap-2">
                  <button
                    onClick={() => setRejectionOrderId(ord.id)}
                    className="flex-1 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 active:scale-[0.98] font-bold text-xs transition-all cursor-pointer"
                  >
                    Decline Order
                  </button>
                  <button
                    onClick={() => handleAccept(ord.id)}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-md hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Accept & Print
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ----------------------------------------------------------------------
  // SUB-VIEW 3: KITCHEN CHEF STATION
  // ----------------------------------------------------------------------
  const renderChefStation = () => {
    const list = [...acceptedOrders, ...preparingOrders];
    const filteredList = chefCategoryFilter === 'ALL' ? list : list.filter((o) => o.status === chefCategoryFilter);
    const finalSearchList = filterBySearch(filteredList);

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Chef station board</span>
            <h3 className="text-base font-black text-stone-900 leading-tight">Kitchen Prep Queue ({list.length})</h3>
          </div>
          <button onClick={loadOrders} className="p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filter sub-tabs */}
        <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200 text-xs">
          <button
            onClick={() => setChefCategoryFilter('ALL')}
            className={`flex-1 py-2 font-bold rounded-xl transition-all ${
              chefCategoryFilter === 'ALL' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
            }`}
          >
            All Cooking ({list.length})
          </button>
          <button
            onClick={() => setChefCategoryFilter('ACCEPTED')}
            className={`flex-1 py-2 font-bold rounded-xl transition-all ${
              chefCategoryFilter === 'ACCEPTED' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
            }`}
          >
            To Cook ({acceptedOrders.length})
          </button>
          <button
            onClick={() => setChefCategoryFilter('PREPARING')}
            className={`flex-1 py-2 font-bold rounded-xl transition-all ${
              chefCategoryFilter === 'PREPARING' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
            }`}
          >
            On Stove ({preparingOrders.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search active tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-stone-200 rounded-xl bg-white shadow-3xs"
          />
        </div>

        {finalSearchList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-xs shadow-3xs">
            <CookingPot className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="font-extrabold text-stone-600">Kitchen Queue is Clear</p>
            <p className="text-stone-400 mt-1">No pending recipes waiting for preparation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {finalSearchList.map((ord) => (
              <div
                key={ord.id}
                className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 transition-all ${
                  ord.status === 'PREPARING' ? 'border-amber-300 bg-amber-50/10' : 'border-stone-200'
                }`}
              >
                <div className="flex justify-between items-start pb-2 border-b border-stone-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-stone-900">Ticket #{ord.orderNumber}</span>
                      {ord.status === 'PREPARING' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 animate-pulse">
                          🍳 On Stove
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">Assigned to kitchen crew</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Prep time: 15-20m
                  </span>
                </div>

                {/* Ingredients & Quantities - HIGH CONTRAST LARGE DISPLAY */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block mb-1">Items to Prepare:</span>
                  {(ord.items || []).map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs font-semibold text-stone-950">
                      <div className="flex items-start gap-1.5">
                        <span className="text-emerald-700 font-black px-1.5 bg-emerald-50 rounded-md">{it.quantity}x</span>
                        <div>
                          <p className="font-bold text-stone-900">{it.name}</p>
                          {it.customizations && it.customizations.length > 0 && (
                            <p className="text-[10px] text-stone-500 mt-0.5">
                              {it.customizations.map((c) => `${c.optionName}: ${c.selectedLabel}`).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {ord.orderNotes && (
                  <div className="p-2.5 bg-amber-50 text-amber-950 rounded-xl text-[11px] font-medium border border-amber-100 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block">Allergy/Cooking Preference Notes:</strong>
                      {ord.orderNotes}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-stone-100 flex justify-end">
                  {ord.status === 'ACCEPTED' ? (
                    <button
                      onClick={() => handlePrepare(ord.id)}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CookingPot className="w-4 h-4" /> Start Preparing (On Stove)
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReady(ord.id)}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Cooking Complete (Mark Ready)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ----------------------------------------------------------------------
  // SUB-VIEW 4: STORE DISPATCHER COMMAND HUB
  // ----------------------------------------------------------------------
  const renderDispatchHub = () => {
    const finalSearchList = filterBySearch(readyOrders);

    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Logistical Dispatch hub</span>
            <h3 className="text-base font-black text-stone-900 leading-tight">Prepared & Ready ({readyOrders.length})</h3>
          </div>
          <button onClick={loadOrders} className="p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search prepared orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-stone-200 rounded-xl bg-white shadow-3xs"
          />
        </div>

        {finalSearchList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400 text-xs shadow-3xs">
            <Bike className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <p className="font-extrabold text-stone-600">Dispatch Queue Clear</p>
            <p className="text-stone-400 mt-1">All prepared orders have been successfully handed over to drivers!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {finalSearchList.map((ord) => (
              <div key={ord.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
                <div className="flex justify-between items-start pb-2 border-b border-stone-100">
                  <div>
                    <span className="font-extrabold text-xs text-stone-900">Order #{ord.orderNumber}</span>
                    <p className="text-[11px] text-stone-500 mt-0.5">Ready for Delivery Partner assignment</p>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    Prepared
                  </span>
                </div>

                {/* Order Summary & Destination details */}
                <div className="text-xs space-y-1 bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <p className="font-bold text-stone-900">Customer: {ord.customerName}</p>
                  <p className="text-stone-500 truncate">
                    Address: {ord.deliveryAddress ? `${ord.deliveryAddress.doorNo || ''}, ${ord.deliveryAddress.street || ''}, ${ord.deliveryAddress.area || ''}` : 'Store Pickup / Counter'}
                  </p>
                  <p className="text-[10px] font-bold text-red-700 mt-1">
                    Value: ₹{ord.grandTotal} • {ord.paymentMethod === 'ONLINE' ? 'PAID' : 'COD'}
                  </p>
                </div>

                {/* Handover Assignment Dropdown */}
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                    Select Available Rider:
                  </label>
                  {deliveryPartners.length === 0 ? (
                    <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600">
                      ⚠️ No delivery partner
                    </div>
                  ) : (
                    <select
                      onChange={(e) => handleAssign(ord.id, e.target.value)}
                      defaultValue=""
                      className="w-full p-2.5 border border-stone-200 rounded-xl text-xs font-semibold bg-white text-stone-800 focus:outline-none focus:border-emerald-500 shadow-3xs"
                    >
                      <option value="" disabled>
                        Choose active driver...
                      </option>
                      {(deliveryPartners || []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.vehicleNumber || 'Bike'} • {p.phone})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Courier fleet status summary */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
          <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider">Fleet Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
              <span className="text-xs font-bold text-stone-400 block uppercase">Active Drivers</span>
              <span className="text-xl font-black text-emerald-600">{deliveryPartners.length}</span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
              <span className="text-xs font-bold text-stone-400 block uppercase">Transit Runs</span>
              <span className="text-xl font-black text-rose-600">{assignedOrders.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------------------------
  // SUB-VIEW 5: STAFF PROFILE VIEW
  // ----------------------------------------------------------------------
  const renderProfile = () => {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-black text-3xl mx-auto border-4 border-white shadow-md">
            {currentUser?.name.charAt(0) || 'K'}
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-stone-900">{currentUser?.name}</h3>
            <p className="text-xs text-stone-500 font-semibold">{currentUser?.email} • {currentUser?.phone}</p>
            <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
              {getRoleIcon(staffRole)}
              <span className="text-[10px] font-black uppercase tracking-wider">{getRoleLabel(staffRole)}</span>
            </div>
          </div>
        </div>

        {/* Terminal performance scorecard */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
          <h4 className="font-black text-xs text-stone-900 uppercase tracking-wider">Shift Stats</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
              <span className="text-[10px] font-bold text-stone-400 block uppercase">Total Dispatches</span>
              <span className="text-lg font-black text-stone-900">{deliveredOrders.length}</span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-center">
              <span className="text-[10px] font-bold text-stone-400 block uppercase">Fulfillment rating</span>
              <span className="text-lg font-black text-stone-900">100%</span>
            </div>
          </div>
        </div>

        {/* Action Logout button */}
        <button
          onClick={logout}
          className="w-full py-3 px-4 rounded-2xl border border-red-200 hover:bg-red-50 text-red-700 active:scale-[0.98] font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
        >
          <LogOut className="w-4 h-4" /> Sign Out of Terminal
        </button>
      </div>
    );
  };

  // ----------------------------------------------------------------------
  // ROUTER FOR SELECTED TAB VIEW
  // ----------------------------------------------------------------------
  const renderSelectedTab = () => {
    switch (activeTab) {
      case 'staff_order_desk':
        return renderOrderDesk();
      case 'staff_chef_station':
        return renderChefStation();
      case 'staff_dispatch_hub':
        return renderDispatchHub();
      case 'staff_inventory':
        return <StaffInventoryView onBack={() => onNavigateTab?.('staff_dashboard')} />;
      case 'staff_profile':
        return <StaffProfileView />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="pb-28 md:pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {renderSelectedTab()}

      {/* Decline Order Reason Modal */}
      {rejectionOrderId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-2 border-stone-100">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 text-red-600">
                <AlertCircle className="w-4 h-4" /> Decline Order Reasons
              </h3>
              <button onClick={() => setRejectionOrderId(null)}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="font-bold text-stone-700 block">Select Rejection Reason:</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 border border-stone-200 rounded-xl bg-white font-semibold text-stone-800 focus:outline-none"
              >
                <option value="Kitchen item out of stock">Kitchen item out of stock</option>
                <option value="Restaurant is closing soon">Restaurant is closing soon</option>
                <option value="Kitchen overcapacity / busy">Kitchen overcapacity / busy</option>
                <option value="Delivery outside service area">Delivery outside service area</option>
                <option value="Other / Custom Reason">Other / Custom Reason</option>
              </select>

              {rejectionReason === 'Other / Custom Reason' && (
                <input
                  type="text"
                  placeholder="Enter custom rejection reason..."
                  className="w-full p-2 border border-stone-200 rounded-xl"
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectionOrderId(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-700 text-xs hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectionOrderId, rejectionReason)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs shadow-md hover:bg-red-700 transition-colors"
              >
                Decline & Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
