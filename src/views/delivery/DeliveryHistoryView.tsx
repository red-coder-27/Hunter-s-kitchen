import React, { useState, useEffect } from 'react';
import { Order, Review } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CheckSquare, Clock, Star, PackageCheck, MapPin } from 'lucide-react';

export const DeliveryHistoryView: React.FC = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const [ordersData, reviewsData] = await Promise.all([
        apiService.getOrders({ role: 'DELIVERY_PARTNER', userId: currentUser.id }),
        apiService.getReviews()
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll every 4 seconds for real-time dynamic data flow
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const completedOrders = orders.filter((o) => o.status === 'DELIVERED');

  const formatDeliveryTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="pb-28 md:pb-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      <div className="flex items-center gap-2.5">
        <CheckSquare className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-black text-stone-900 uppercase tracking-tight">Completed Runs</h2>
      </div>

      {isLoading && orders.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : completedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center animate-fade-in">
          <CheckSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-xs text-stone-500 font-medium">No completed deliveries for this shift yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {completedOrders.map((ord) => (
            <div key={ord.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3.5 animate-fade-in">
              {/* Card Header with Order Number & Green Badge */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div>
                  <span className="font-black text-sm text-stone-900">#{ord.orderNumber}</span>
                  <p className="text-xs text-stone-600 font-bold mt-0.5">{ord.customerName}</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[10px] uppercase tracking-wide">
                  ✓ Delivered
                </div>
              </div>

              {/* Delivery Details */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-stone-600">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-stone-400" /> Delivered At:
                  </span>
                  <span className="font-black text-stone-900">{formatDeliveryTime(ord.deliveredAt)}</span>
                </div>
                <div className="flex justify-between items-center text-stone-600">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" /> Location:
                  </span>
                  <span className="font-bold text-stone-900">
                    {ord.deliveryAddress
                      ? `${ord.deliveryAddress.area || ''}, ${ord.deliveryAddress.city || ''}`
                      : 'Store Pickup'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-stone-600">
                  <span className="font-medium">Fee Earned:</span>
                  <span className="font-black text-emerald-600">₹{ord.deliveryFee || 35}</span>
                </div>
              </div>

              {/* Items Delivered Properly */}
              <div className="text-xs text-stone-700 space-y-1">
                <div className="flex items-center gap-1 font-extrabold text-stone-400 uppercase text-[10px] tracking-wider">
                  <PackageCheck className="w-3.5 h-3.5 text-stone-400" /> Delivered Items
                </div>
                <div className="pl-1 space-y-1">
                  {(ord.items || []).map((it, idx) => (
                    <div key={idx} className="flex justify-between font-medium pl-2 border-l-2 border-emerald-500">
                      <span className="text-stone-700">{it.name}</span>
                      <span className="font-black text-stone-900">Qty: {it.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Feedback for Delivery */}
              <div className="pt-2 border-t border-stone-100 space-y-1.5">
                <p className="font-extrabold text-stone-400 uppercase text-[10px] tracking-wider">Customer Feedback</p>
                {(() => {
                  const r = reviews.find((rev) => rev.orderId === ord.id);
                  if (r) {
                    const ratingValue = r.deliveryRating || r.overallRating || 5;
                    return (
                      <div className="bg-amber-50/50 rounded-xl p-2.5 border border-amber-100 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-stone-700">Delivery Rating:</span>
                          <div className="flex gap-0.5 text-amber-500">
                            {Array.from({ length: 5 }).map((_, idxStar) => (
                              <Star
                                key={idxStar}
                                className={`w-3.5 h-3.5 ${
                                  idxStar < ratingValue
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-stone-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-black text-amber-700">
                            ({ratingValue}/5)
                          </span>
                        </div>
                        {r.comment ? (
                          <p className="text-xs text-stone-600 italic font-medium">"{r.comment}"</p>
                        ) : (
                          <p className="text-xs text-stone-400 italic">No comment provided.</p>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="text-stone-400 italic text-[11px] pl-1">
                      No feedback submitted yet for this run.
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
