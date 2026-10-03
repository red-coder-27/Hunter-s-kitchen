import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus } from '../types';
import { Bike, Utensils, ChevronRight, Sparkles } from 'lucide-react';

interface FloatingLiveOrderBarProps {
  onOpenTracking: (orderId: string) => void;
  isTrackingOpen: boolean;
}

export const FloatingLiveOrderBar: React.FC<FloatingLiveOrderBarProps> = ({
  onOpenTracking,
  isTrackingOpen
}) => {
  const { currentUser, currentRole } = useAuth();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const fetchActiveOrder = async () => {
    if (!currentUser || currentRole !== 'CUSTOMER') {
      setActiveOrder(null);
      return;
    }

    try {
      // 1. Check saved tracking order ID first
      const savedTrackingId = localStorage.getItem('hk_active_tracking_order_id');
      if (savedTrackingId) {
        const order = await apiService.getOrderById(savedTrackingId);
        if (order && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'REJECTED') {
          setActiveOrder(order);
          return;
        } else {
          localStorage.removeItem('hk_active_tracking_order_id');
        }
      }

      // 2. Otherwise find most recent active order
      const orders = await apiService.getOrders({ role: 'CUSTOMER', userId: currentUser.id });
      if (Array.isArray(orders)) {
        const found = orders.find(
          (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'REJECTED'
        );
        if (found) {
          setActiveOrder(found);
          localStorage.setItem('hk_active_tracking_order_id', found.id);
          return;
        }
      }

      setActiveOrder(null);
    } catch (e) {
      // silent background check error
    }
  };

  useEffect(() => {
    fetchActiveOrder();
    const interval = setInterval(fetchActiveOrder, 5000);
    return () => clearInterval(interval);
  }, [currentUser?.id, currentRole]);

  if (!activeOrder || isTrackingOpen) {
    return null;
  }

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'PLACED':
        return 'Order Received by Kitchen';
      case 'ACCEPTED':
        return 'Order Accepted by Kitchen';
      case 'PREPARING':
        return 'Chefs Preparing Your Meal';
      case 'READY':
        return 'Food Ready & Packed';
      case 'ASSIGNED':
      case 'PICKED_UP':
      case 'OUT_FOR_DELIVERY':
        return 'Valet on the Way to You';
      default:
        return 'Order in Progress';
    }
  };

  return (
    <div className="w-full pointer-events-auto animate-in slide-in-from-bottom-3 duration-200">
      <div
        onClick={() => onOpenTracking(activeOrder.id)}
        className="bg-gradient-to-r from-stone-900 via-stone-850 to-red-950 text-white rounded-2xl p-3 sm:p-3.5 shadow-xl flex items-center justify-between cursor-pointer transition-all duration-200 border border-red-500/30 shadow-black/25 group active:scale-[0.99] hover:border-red-500/50"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-red-700/90 text-white flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition-transform">
              {activeOrder.status === 'OUT_FOR_DELIVERY' || activeOrder.status === 'PICKED_UP' ? (
                <Bike className="w-5 h-5 text-white" />
              ) : (
                <Utensils className="w-5 h-5 text-white" />
              )}
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-stone-900 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-stone-900 rounded-full" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-400 tracking-wide">
                ORDER #{activeOrder.orderNumber}
              </span>
              <span className="text-stone-500 text-xs">•</span>
              <span className="text-[11px] font-bold text-red-200 bg-red-950/70 px-2 py-0.5 rounded-md border border-red-800/80 uppercase">
                {activeOrder.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-stone-300 font-medium truncate mt-0.5">
              {getStatusLabel(activeOrder.status)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTracking(activeOrder.id);
          }}
          className="flex items-center gap-1 text-xs font-extrabold bg-red-700 hover:bg-red-800 text-white px-3.5 py-2 rounded-xl shadow-md transition-all shrink-0 ml-2 group-hover:shadow-red-700/30 active:scale-95 cursor-pointer"
        >
          <span>Track Live</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};
