import React, { useState, useEffect } from 'react';
import { Order, Review } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Bike,
  MapPin,
  Phone,
  CheckCircle2,
  Navigation,
  RefreshCw,
  DollarSign,
  PackageCheck,
  Power,
  X
} from 'lucide-react';

export const DeliveryDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [isOnline, setIsOnline] = useState(currentUser?.partnerStatus === 'ONLINE');
  const [showSuccessTick, setShowSuccessTick] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    orderId: string;
    orderNumber: string;
    type: 'PICKUP' | 'DELIVERY';
    paymentMethod: string;
    grandTotal: number;
  } | null>(null);

  const toggleStatus = async () => {
    // Prevent going offline if they have any active assigned orders
    if (isOnline) {
      const activeCount = assignedOrders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;
      if (activeCount > 0) {
        alert("🛑 Status Blocked: You have active assigned deliveries. You cannot go offline until all assigned orders are completed!");
        return;
      }
    }
    const nextStatus = isOnline ? 'OFFLINE' : 'ONLINE';
    setIsOnline(!isOnline);
    if (currentUser) {
      await apiService.updateDeliveryPartnerStatus(currentUser.id, nextStatus);
    }
  };
  const [isLoading, setIsLoading] = useState(true);

  const loadDeliveries = async () => {
    if (!currentUser) return;
    try {
      const orders = await apiService.getOrders({ role: 'DELIVERY_PARTNER', userId: currentUser.id });
      setAssignedOrders(Array.isArray(orders) ? orders : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
    const interval = setInterval(loadDeliveries, 4000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleStatusUpdate = async (orderId: string, nextStatus: 'OUT_FOR_DELIVERY' | 'DELIVERED') => {
    try {
      if (nextStatus === 'OUT_FOR_DELIVERY') {
        await apiService.markOutForDelivery(orderId, currentUser?.id);
      } else {
        await apiService.markDelivered(orderId, currentUser?.id);
      }
      await loadDeliveries();
    } catch (err) {
      console.error(err);
    }
  };

  const activeDeliveries = assignedOrders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const completedDeliveries = assignedOrders.filter((o) => o.status === 'DELIVERED');
  const totalEarningsToday = completedDeliveries.reduce((sum, o) => sum + (o.deliveryFee || 35), 0);

  return (
    <div className="pb-28 md:pb-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Header & Status Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase text-stone-400 tracking-wider">
            Delivery Executive App
          </span>
          <h2 className="text-lg font-black text-stone-900">{currentUser?.name || 'Delivery Partner'}</h2>
        </div>

        <button
          onClick={toggleStatus}
          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all ${
            isOnline ? 'bg-emerald-600 text-white shadow-xs' : 'bg-stone-200 text-stone-700'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </button>
      </div>

      {/* Driver Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="bg-gradient-to-br from-stone-900 to-stone-950 text-white p-3.5 rounded-2xl shadow-2xs">
          <p className="text-[10px] font-extrabold text-stone-400 uppercase">Today's Earnings</p>
          <p className="text-xl font-black text-emerald-400 mt-0.5">₹{totalEarningsToday}</p>
          <p className="text-[10px] text-stone-400 mt-0.5">{completedDeliveries.length} Completed Runs</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
          <p className="text-[10px] font-extrabold text-stone-400 uppercase">Active Orders</p>
          <p className="text-xl font-black text-stone-900 mt-0.5">{activeDeliveries.length}</p>
          <p className="text-[10px] text-amber-600 font-bold mt-0.5">In Progress</p>
        </div>
      </div>

      {/* Active Deliveries List Only */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-[10px] text-stone-400 uppercase tracking-wider">
          Assigned Active Runs ({activeDeliveries.length})
        </h3>

        {activeDeliveries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center animate-fade-in">
            <Bike className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-xs text-stone-500 font-medium">No active delivery assignments right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeDeliveries.map((ord) => (
              <div key={ord.id} className="bg-white rounded-2xl border border-red-200/80 p-4 shadow-xs space-y-3 animate-fade-in">
              {/* Order Banner */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div>
                  <span className="font-black text-sm text-stone-900">#{ord.orderNumber}</span>
                  <p className="text-xs text-stone-600 font-bold mt-0.5">{ord.customerName}</p>
                </div>

                <a
                  href={`tel:${ord.customerPhone}`}
                  className="p-2 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700"
                  title="Call Customer"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>

              {/* Delivery Address */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-stone-900">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-red-600" /> Delivery Location
                  </span>
                  {ord.deliveryAddress && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${ord.deliveryAddress.doorNo || ''}, ${ord.deliveryAddress.street || ''}, ${ord.deliveryAddress.area || ''}, ${ord.deliveryAddress.city || ''}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-blue-700 font-extrabold flex items-center gap-0.5"
                    >
                      <Navigation className="w-3 h-3" /> Maps Direction
                    </a>
                  )}
                </div>
                <p className="text-stone-700 pl-5">
                  {ord.deliveryAddress
                    ? `${ord.deliveryAddress.doorNo ? `${ord.deliveryAddress.doorNo}, ` : ''}${ord.deliveryAddress.street || ''}, ${ord.deliveryAddress.area || ''}, ${ord.deliveryAddress.city || ''} - ${ord.deliveryAddress.pincode || ''}`
                    : 'Customer Pickup at Counter'}
                </p>
              </div>

              {/* Items Summary */}
              <div className="text-xs text-stone-700 space-y-0.5">
                <p className="font-bold text-stone-900">Items to deliver:</p>
                {(ord.items || []).map((it, idx) => (
                  <p key={idx} className="pl-2">
                    • {it.quantity}x {it.name}
                  </p>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t flex justify-end gap-2">
                {ord.status === 'ASSIGNED' || ord.status === 'READY' ? (
                  <button
                    onClick={() => setConfirmState({
                      isOpen: true,
                      orderId: ord.id,
                      orderNumber: ord.orderNumber,
                      type: 'PICKUP',
                      paymentMethod: ord.paymentMethod,
                      grandTotal: ord.grandTotal
                    })}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs"
                  >
                    Confirm Pickup & Start Delivery
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmState({
                      isOpen: true,
                      orderId: ord.id,
                      orderNumber: ord.orderNumber,
                      type: 'DELIVERY',
                      paymentMethod: ord.paymentMethod,
                      grandTotal: ord.grandTotal
                    })}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Complete Delivery & Collect Payment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Accidental Touch Protection: Confirm & Cancel Popups */}
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-stone-200 text-stone-900">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                confirmState.type === 'PICKUP' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {confirmState.type === 'PICKUP' ? (
                  <PackageCheck className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <h4 className="font-extrabold text-base text-stone-900">
                {confirmState.type === 'PICKUP' ? 'Confirm Order Pickup' : 'Confirm Delivery & Payment'}
              </h4>
            </div>

            <div className="space-y-2.5 text-xs text-stone-600 leading-relaxed mb-4">
              {confirmState.type === 'PICKUP' ? (
                <p>
                  Are you sure you want to <strong className="text-stone-900 font-extrabold">Confirm Pickup</strong> for order <strong className="text-stone-900 font-extrabold">#{confirmState.orderNumber}</strong>? This will notify the kitchen and customer that you are starting delivery.
                </p>
              ) : (
                <>
                  <p>
                    Please verify delivery completion and payment details before proceeding:
                  </p>
                  <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-500 font-medium">Order Number:</span>
                      <span className="font-extrabold text-stone-900">#{confirmState.orderNumber}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-500 font-medium">Payment Mode:</span>
                      <span className="font-extrabold text-stone-900 uppercase">{confirmState.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-500 font-medium">Amount to Collect:</span>
                      <span className="font-black text-emerald-600 text-sm">₹{confirmState.grandTotal}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-amber-600 font-bold mt-1">
                    ⚠️ Ensure payment is fully collected before selecting Confirm.
                  </p>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-extrabold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetOrderId = confirmState.orderId;
                  const targetType = confirmState.type;
                  setConfirmState(null);
                  if (targetType === 'PICKUP') {
                    await handleStatusUpdate(targetOrderId, 'OUT_FOR_DELIVERY');
                  } else {
                    await handleStatusUpdate(targetOrderId, 'DELIVERED');
                    setShowSuccessTick(true);
                    setTimeout(() => {
                      setShowSuccessTick(false);
                    }, 3000);
                  }
                }}
                className={`w-full py-2.5 rounded-xl text-white font-extrabold text-xs shadow-3xs transition-colors ${
                  confirmState.type === 'PICKUP' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY COMPLETED SUCCESS TICK ANIMATION OVERLAY - 20% Extra Size Swiggy style */}
      {showSuccessTick && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-white animate-in fade-in duration-300">
          <style>{`
            @keyframes swiggy-circle-partner {
              0% { stroke-dashoffset: 166; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes swiggy-pop-partner {
              0% { transform: scale(0.85); opacity: 0; }
              60% { transform: scale(1.08); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes swiggy-tick-partner {
              0% { stroke-dashoffset: 48; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes swiggy-pulse-partner {
              0%, 100% { transform: scale(1); opacity: 0.15; }
              50% { transform: scale(1.1); opacity: 0.25; }
            }
            @keyframes swiggy-fade-up-partner {
              0% { opacity: 0; transform: translateY(12px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            .swiggy-anim-circle-partner {
              stroke-dasharray: 166;
              stroke-dashoffset: 166;
              animation: swiggy-circle-partner 0.65s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
            .swiggy-anim-fill-partner {
              transform-origin: 26px 26px;
              animation: swiggy-pop-partner 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.55s both;
            }
            .swiggy-anim-tick-partner {
              stroke-dasharray: 48;
              stroke-dashoffset: 48;
              animation: swiggy-tick-partner 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.85s forwards;
            }
            .swiggy-anim-fade-partner {
              animation: swiggy-fade-up-partner 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
            }
          `}</style>

          <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm w-full">
            {/* Animated Swiggy Circle and Tick Wrapper - 20% Extra Size */}
            <div className="relative w-44 h-44 flex items-center justify-center mb-8">
              {/* Outer pulsing shadow ring */}
              <div className="absolute inset-2 rounded-full bg-emerald-500/20" style={{ animation: 'swiggy-pulse-partner 1.8s infinite ease-in-out' }} />
              
              <svg className="w-28 h-28 relative z-10" viewBox="0 0 52 52" style={{ filter: 'drop-shadow(0 4px 10px rgba(16,185,129,0.35))' }}>
                {/* 1. SVG Outer Thin Border Circle */}
                <circle
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="swiggy-anim-circle-partner"
                />
                {/* 2. SVG Inner Solid Filled Green Circle */}
                <circle
                  cx="26"
                  cy="26"
                  r="18"
                  fill="#10b981"
                  className="swiggy-anim-fill-partner"
                />
                {/* 3. White Path-Drawn Checkmark centered inside the inner green circle */}
                <path
                  d="M19 26.2l4.5 4.5 9.5 -9.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="swiggy-anim-tick-partner"
                />
              </svg>
            </div>

            {/* "Delivery Success" Bold Title */}
            <h2 
              className="text-3xl font-black text-stone-900 tracking-tight swiggy-anim-fade-partner uppercase"
              style={{ animationDelay: '1s' }}
            >
              Delivery completed
            </h2>

            {/* Reassurance message */}
            <p 
              className="text-xs text-stone-400 mt-1 font-medium swiggy-anim-fade-partner"
              style={{ animationDelay: '1.1s' }}
            >
              Payout credited to your driver wallet. Excellent job!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
