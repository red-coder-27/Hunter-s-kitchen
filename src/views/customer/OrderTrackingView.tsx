import React, { useState, useEffect, useRef } from 'react';
import { Order, OrderStatus } from '../../types';
import { apiService } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle2,
  Clock,
  Bike,
  Phone,
  XCircle,
  MapPin,
  Utensils,
  ChevronLeft,
  RefreshCw,
  AlertCircle,
  Bell,
  Sparkles
} from 'lucide-react';

interface OrderTrackingViewProps {
  orderId: string;
  onBack: () => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({ orderId, onBack }) => {
  const { triggerOrderStatusNotification } = useNotification();
  const { currentUser } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered by mistake');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showDeliveredOverlay, setShowDeliveredOverlay] = useState(false);

  useEffect(() => {
    if (order && order.status === 'DELIVERED' && !localStorage.getItem(`delivered_dismissed_${order.id}`)) {
      setShowDeliveredOverlay(true);
    }
  }, [order?.status, order?.id]);

  const prevStatusRef = useRef<OrderStatus | null>(null);
  const [statusAlertBanner, setStatusAlertBanner] = useState<{
    title: string;
    message: string;
    timestamp: string;
    status: OrderStatus;
  } | null>(null);

  const fetchOrder = async () => {
    try {
      const data = await apiService.getOrderById(orderId);
      if (data) {
        // Detect real-time status change
        if (prevStatusRef.current && prevStatusRef.current !== data.status) {
          triggerOrderStatusNotification(
            data.orderNumber,
            prevStatusRef.current,
            data.status,
            data.id
          );

          setStatusAlertBanner({
            title: `Real-time Update: ${data.status.replace(/_/g, ' ')}`,
            message: `Order #${data.orderNumber} status changed from ${prevStatusRef.current.replace(/_/g, ' ')} to ${data.status.replace(/_/g, ' ')}.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: data.status
          });
        }
        prevStatusRef.current = data.status;
        setOrder(data);
      }
    } catch (err) {
      console.error('Error fetching order tracking:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for status updates every 3 seconds for fast real-time feedback
  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await apiService.cancelOrder(orderId, cancelReason);
      await fetchOrder();
      setShowCancelModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading || !order) {
    return (
      <div className="p-8 text-center text-stone-500 font-medium">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-600 mb-2" />
        Loading order tracking live...
      </div>
    );
  }

  // All order status steps
  const steps = [
    { key: 'PLACED', title: 'Order Placed', desc: 'Order received by restaurant' },
    { key: 'ACCEPTED', title: 'Order Accepted', desc: 'Kitchen accepted your order' },
    { key: 'PREPARING', title: 'Food Preparing', desc: 'Chefs preparing your food' },
    { key: 'READY', title: 'Food Ready', desc: 'Packed & awaiting pickup' },
    { key: 'ASSIGNED', title: 'Partner Assigned', desc: 'Delivery agent assigned' },
    { key: 'OUT_FOR_DELIVERY', title: 'Out for Delivery', desc: 'Partner on the way' },
    { key: 'DELIVERED', title: 'Delivered', desc: 'Enjoy your meal!' }
  ];

  const getStepIndex = (st: string) => {
    const idx = steps.findIndex((s) => s.key === st);
    if (idx !== -1) return idx;
    if (st === 'PICKED_UP') return 4;
    return 0;
  };

  const currentStepIdx = getStepIndex(order.status);
  const isCancelledOrRejected = order.status === 'CANCELLED' || order.status === 'REJECTED';

  return (
    <div className="pb-28 md:pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-xl hover:bg-stone-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Orders
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrder}
            className="text-stone-500 hover:text-stone-800 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time Status Alert Banner (Shown when status changes live) */}
      {statusAlertBanner && (
        <div className="bg-amber-500/15 border-2 border-amber-500/80 rounded-2xl p-4 shadow-md flex items-start justify-between gap-3 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-stone-950 rounded-xl font-bold shrink-0 mt-0.5">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                  ⚡ Real-Time Notification
                </span>
                <span className="text-[10px] text-stone-500 font-mono">{statusAlertBanner.timestamp}</span>
              </div>
              <h4 className="font-black text-stone-900 text-sm mt-1">{statusAlertBanner.title}</h4>
              <p className="text-xs text-stone-700 mt-0.5">{statusAlertBanner.message}</p>
            </div>
          </div>

          <button
            onClick={() => setStatusAlertBanner(null)}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Status Header Card */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-red-950 text-white rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-red-300">
                Order #{order.orderNumber}
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-0.5">
              {isCancelledOrRejected
                ? order.status === 'CANCELLED'
                  ? 'Order Cancelled'
                  : 'Order Rejected'
                : order.status === 'DELIVERED'
                ? 'Order Delivered!'
                : 'Tracking Order Live'}
            </h2>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase shadow-md ${
              order.status === 'DELIVERED'
                ? 'bg-emerald-500 text-white'
                : isCancelledOrRejected
                ? 'bg-red-600 text-white'
                : 'bg-amber-500 text-stone-950 animate-pulse'
            }`}
          >
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-stone-800 text-xs text-stone-300">
          <p>
            Placed on{' '}
            {(() => {
              try {
                const d = new Date(order.createdAt);
                const datePart = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                return `${datePart}, ${timePart}`;
              } catch (e) {
                return order.createdAt;
              }
            })()}{' '}
            • {order.paymentMethod} ({order.paymentStatus})
          </p>
        </div>
      </div>

      {/* Cancelled or Rejected Banner */}
      {isCancelledOrRejected && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 text-red-900">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-extrabold">
              {order.status === 'CANCELLED' ? 'Order Was Cancelled' : 'Order Was Rejected by Restaurant'}
            </h4>
            <p className="mt-1 text-red-700">
              Reason: {order.cancellationReason || order.rejectionReason || 'Kitchen busy or order modified.'}
            </p>
          </div>
        </div>
      )}

      {/* Driver Assignment Card */}
      {order.assignedDeliveryPartnerName && !isCancelledOrRejected && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center font-bold">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wide">Delivery Partner</p>
              <h4 className="font-bold text-sm text-stone-900">{order.assignedDeliveryPartnerName}</h4>
              <p className="text-[11px] text-stone-500">
                {order.assignedDeliveryPartnerVehicle || 'Bike Delivery'}
              </p>
            </div>
          </div>

          <a
            href={`tel:${order.assignedDeliveryPartnerPhone}`}
            className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md hover:bg-emerald-700 transition-colors"
          >
            <Phone className="w-5 h-5" />
          </a>
        </div>
      )}

      {/* Vertical Dynamic Step Timeline */}
      {!isCancelledOrRejected && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wide">
              Order Status Journey
            </h3>
            <span className="text-[11px] text-stone-500 font-medium">Auto-refreshing live</span>
          </div>

          <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
            {steps.map((step, idx) => {
              const isCompleted = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              const eventMatch = order.events.find((e) => e.status === step.key);

              return (
                <div key={step.key} className="relative flex items-start justify-between gap-3">
                  {/* Step Dot */}
                  <div
                    className={`absolute -left-[27px] top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold z-10 transition-all ${
                      isCurrent
                        ? 'bg-red-700 border-red-700 text-white shadow-md ring-4 ring-red-100 animate-pulse'
                        : isCompleted
                        ? 'bg-red-700 border-red-700 text-white shadow-2xs'
                        : 'bg-white border-stone-300 text-stone-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>

                  <div className="min-w-0">
                    <h4
                      className={`text-xs font-extrabold ${
                        isCurrent ? 'text-red-700 text-sm' : isCompleted ? 'text-stone-900' : 'text-stone-400'
                      }`}
                    >
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">{step.desc}</p>
                  </div>

                  {eventMatch && (
                    <span className="text-xs font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/80 shrink-0">
                      {new Date(eventMatch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Items & Address Summary */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs space-y-3">
        <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wide border-b border-stone-100 pb-2">
          Order Items
        </h4>

        <div className="divide-y divide-stone-100">
          {(order.items || []).map((item, idx) => (
            <div key={idx} className="py-2 flex items-start justify-between text-xs">
              <div>
                <span className="font-bold text-stone-900">
                  {item.quantity}x {item.name}
                </span>
                {item.customizations && item.customizations.map((c, i) => (
                  <p key={i} className="text-[11px] text-stone-500">
                    • {c.optionName}: {c.selectedLabel}
                  </p>
                ))}
                {item.addons && item.addons.map((a, i) => (
                  <p key={i} className="text-[11px] text-stone-500">
                    + {a.name}
                  </p>
                ))}
              </div>
              <span className="font-bold text-stone-900">₹{item.totalPrice}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-stone-100 flex justify-between font-black text-sm text-stone-900">
          <span>Total {order.paymentMethod === 'ONLINE' ? 'Paid (Online)' : 'Payable (COD)'}</span>
          <span className="text-red-700">₹{order.grandTotal}</span>
        </div>

        {order.paymentMethod === 'COD' && order.codCashTendered && (
          <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs space-y-1 text-stone-800">
            <div className="flex justify-between font-bold">
              <span>Cash Note Handover:</span>
              <span className="text-amber-900">₹{order.codCashTendered}</span>
            </div>
            <div className="flex justify-between font-extrabold text-emerald-800">
              <span>Delivery Change Return:</span>
              <span>
                {order.codChangeDue && order.codChangeDue > 0
                  ? `₹${order.codChangeDue}`
                  : 'Exact Cash (₹0)'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Action if allowed */}
      {order.status === 'PLACED' && (
        <button
          onClick={() => setShowCancelModal(true)}
          className="w-full py-3 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <XCircle className="w-4 h-4" /> Cancel Order
        </button>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3">
            <h3 className="font-bold text-stone-900 text-sm">Cancel Order?</h3>
            <p className="text-xs text-stone-500">Please provide a reason for cancelling this order.</p>

            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-2 border border-stone-300 rounded-xl text-xs font-medium"
            >
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Delivery time too long">Delivery time too long</option>
              <option value="Change of mind">Change of mind</option>
            </select>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold"
              >
                Back
              </button>
              <button
                disabled={isCancelling}
                onClick={handleCancel}
                className="flex-1 py-2 rounded-xl bg-red-700 text-white text-xs font-bold"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY COMPLETED TICK ANIMATION OVERLAY - 20% Extra Size Swiggy Tick */}
      {showDeliveredOverlay && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-white animate-in fade-in duration-300">
          <style>{`
            @keyframes swiggy-circle-del {
              0% { stroke-dashoffset: 166; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes swiggy-pop-del {
              0% { transform: scale(0.85); opacity: 0; }
              60% { transform: scale(1.08); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes swiggy-tick-del {
              0% { stroke-dashoffset: 48; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes swiggy-pulse-del {
              0%, 100% { transform: scale(1); opacity: 0.15; }
              50% { transform: scale(1.1); opacity: 0.25; }
            }
            @keyframes swiggy-fade-up-del {
              0% { opacity: 0; transform: translateY(12px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            .swiggy-anim-circle-del {
              stroke-dasharray: 166;
              stroke-dashoffset: 166;
              animation: swiggy-circle-del 0.65s cubic-bezier(0.65, 0, 0.45, 1) forwards;
            }
            .swiggy-anim-fill-del {
              transform-origin: 26px 26px;
              animation: swiggy-pop-del 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.55s both;
            }
            .swiggy-anim-tick-del {
              stroke-dasharray: 48;
              stroke-dashoffset: 48;
              animation: swiggy-tick-del 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.85s forwards;
            }
            .swiggy-anim-fade-del {
              animation: swiggy-fade-up-del 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
            }
          `}</style>

          <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm w-full">
            {/* Animated Swiggy Circle and Tick Wrapper - 20% Extra Size */}
            <div className="relative w-44 h-44 flex items-center justify-center mb-8">
              {/* Outer pulsing shadow ring */}
              <div className="absolute inset-2 rounded-full bg-emerald-500/20" style={{ animation: 'swiggy-pulse-del 1.8s infinite ease-in-out' }} />
              
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
                  className="swiggy-anim-circle-del"
                />
                {/* 2. SVG Inner Solid Filled Green Circle */}
                <circle
                  cx="26"
                  cy="26"
                  r="18"
                  fill="#10b981"
                  className="swiggy-anim-fill-del"
                />
                {/* 3. White Path-Drawn Checkmark centered inside the inner green circle */}
                <path
                  d="M19 26.2l4.5 4.5 9.5 -9.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="swiggy-anim-tick-del"
                />
              </svg>
            </div>

            {/* "Delivery Completed" Bold Success Title */}
            <h2 
              className="text-3xl font-black text-stone-900 tracking-tight swiggy-anim-fade-del uppercase"
              style={{ animationDelay: '1s' }}
            >
              Order Delivered!
            </h2>

            {/* Delighted reassurance message */}
            <p 
              className="text-xs text-stone-400 mt-1 font-medium swiggy-anim-fade-del"
              style={{ animationDelay: '1.1s' }}
            >
              Your hot and fresh meal has been safely handed over. Enjoy!
            </p>

            {/* Divider line */}
            <div 
              className="w-12 h-0.5 bg-stone-200 my-5 rounded-full swiggy-anim-fade-del"
              style={{ animationDelay: '1.2s' }}
            />

            {/* Action Button to close overlay and let them view order details */}
            <button
              onClick={() => {
                localStorage.setItem(`delivered_dismissed_${order.id}`, 'true');
                setShowDeliveredOverlay(false);
              }}
              style={{ animationDelay: '1.3s' }}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs shadow-lg uppercase tracking-wider transition-all swiggy-anim-fade-del cursor-pointer"
            >
              Enjoy Your Meal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
