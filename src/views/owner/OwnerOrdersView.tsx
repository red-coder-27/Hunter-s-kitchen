import React, { useState, useEffect } from 'react';
import { Order, User, OrderStatus } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DeliveryBatchingModal } from './DeliveryBatchingModal';
import { ReadyOrderModal } from '../../components/ReadyOrderModal';
import {
  Check,
  X,
  Flame,
  Layers,
  Bike,
  Utensils,
  Phone,
  Clock,
  RefreshCw,
  Search,
  CheckCircle2,
  Banknote
} from 'lucide-react';

export const OwnerOrdersView: React.FC = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Reject Modal State
  const [rejectOrderId, setRejectOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Kitchen busy with high order volume');
  const [isRejecting, setIsRejecting] = useState(false);

  // Batching Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  // Ready Modal State
  const [readyOrderId, setReadyOrderId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [ordersData, driversData, staffData] = await Promise.all([
        apiService.getOrders({ role: 'OWNER' }),
        apiService.getUsers('DELIVERY_PARTNER'),
        apiService.getUsers('STAFF')
      ]);

      const safeOrders = Array.isArray(ordersData) ? ordersData : [];
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

  const getPartnerInfo = (ord: Order) => {
    if (ord.assignedDeliveryPartnerName && ord.assignedDeliveryPartnerName.trim() !== '') {
      return {
        name: ord.assignedDeliveryPartnerName,
        phone: ord.assignedDeliveryPartnerPhone,
        vehicle: ord.assignedDeliveryPartnerVehicle
      };
    }
    if (ord.assignedDeliveryPartnerId) {
      const match = deliveryPartners.find((d) => d.id === ord.assignedDeliveryPartnerId);
      if (match) {
        return {
          name: match.name,
          phone: match.phone,
          vehicle: match.vehicleNumber || match.vehicleType
        };
      }
    }
    if (['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(ord.status)) {
      const defaultPartner = deliveryPartners[0];
      return {
        name: defaultPartner?.name || 'Arun Kumar (Rider)',
        phone: defaultPartner?.phone || '+91 91234 56789',
        vehicle: defaultPartner?.vehicleNumber || 'Bike'
      };
    }
    return null;
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (orderId: string) => {
    try {
      await apiService.acceptOrder(orderId, currentUser?.id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectOrderId) return;
    setIsRejecting(true);
    try {
      await apiService.rejectOrder(rejectOrderId, rejectReason, currentUser?.id);
      setRejectOrderId(null);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRejecting(false);
    }
  };

  const handlePrepare = async (orderId: string) => {
    try {
      await apiService.markPreparing(orderId, currentUser?.id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReady = async (orderId: string) => {
    try {
      await apiService.markReady(orderId, currentUser?.id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSingleAssign = async (orderId: string, partnerId: string) => {
    if (!partnerId) return;
    try {
      await apiService.assignDelivery(orderId, partnerId, currentUser?.id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q)
      );
    }
    return true;
  });

  const readyOrders = orders.filter((o) => o.status === 'READY');

  return (
    <div className="pb-28 md:pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-stone-900">Live Order Dispatch Board</h2>
        <button
          onClick={loadData}
          className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Batching CTA Banner */}
      {readyOrders.length > 1 && (
        <div className="bg-red-900 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-amber-400" />
            <div>
              <p className="font-extrabold text-xs">{readyOrders.length} Ready Orders Awaiting Delivery!</p>
              <p className="text-[11px] text-red-200">Batch proximate orders into a single delivery run</p>
            </div>
          </div>

          <button
            onClick={() => setShowBatchModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-400 text-stone-950 font-black text-xs shadow-xs hover:bg-amber-300"
          >
            Create Batch
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search by Order #, Customer Name, Phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      {/* Status Filter Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {['ALL', 'PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map(
          (st) => {
            const isSelected = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            );
          }
        )}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="py-8 text-center text-stone-400 text-xs">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center my-4">
          <p className="text-xs text-stone-500 font-medium">No orders matching this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 transition-all ${
                ord.status === 'PLACED'
                  ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-400/30'
                  : 'border-stone-200'
              }`}
            >
              {/* Order Header */}
              <div className="flex items-start justify-between pb-2 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-stone-900">#{ord.orderNumber}</span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        ord.paymentMethod === 'ONLINE' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {ord.paymentMethod}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-stone-700 mt-0.5">
                    {ord.customerName} • {ord.customerPhone}
                  </p>
                  {(() => {
                    const partner = getPartnerInfo(ord);
                    if (!partner || !['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(ord.status)) return null;
                    return (
                      <div className="mt-1 inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-blue-200/80 shadow-3xs">
                        <span className="flex items-center gap-1 text-blue-950">🛵 Partner: {partner.name}</span>
                        {partner.phone && (
                          <a 
                            href={`tel:${partner.phone}`}
                            className="p-0.5 bg-emerald-100 text-emerald-800 rounded-full hover:bg-emerald-200 transition-colors flex items-center justify-center ml-0.5"
                            title={`Call Partner ${partner.name}`}
                          >
                            <Phone className="w-2.5 h-2.5 stroke-[3]" />
                          </a>
                        )}
                      </div>
                    );
                  })()}
                  <p className="text-[11px] text-stone-500">
                    {ord.deliveryAddress
                      ? `${ord.deliveryAddress.doorNo ? `${ord.deliveryAddress.doorNo}, ` : ''}${ord.deliveryAddress.street || ''}, ${ord.deliveryAddress.area || ''}`
                      : 'Store Pickup / Counter'}
                  </p>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      ord.status === 'PLACED'
                        ? 'bg-amber-500 text-stone-950 font-black animate-pulse'
                        : ord.status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ord.status === 'CANCELLED' || ord.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    {ord.status.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-stone-900 mt-1 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/80 shadow-3xs">
                    <Clock className="w-3 h-3 text-stone-700" />
                    <span>
                      {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 text-xs text-stone-800">
                {(ord.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-stone-900">
                        {item.quantity}x {item.name}
                      </span>
                      {item.customizations && item.customizations.map((c, i) => (
                        <span key={i} className="text-[11px] text-stone-500 block">
                          • {c.optionName}: {c.selectedLabel}
                        </span>
                      ))}
                      {item.addons && item.addons.map((a, i) => (
                        <span key={i} className="text-[11px] text-stone-500 block">
                          + {a.name}
                        </span>
                      ))}
                    </div>
                    <span className="font-bold text-stone-900">₹{item.totalPrice}</span>
                  </div>
                ))}
              </div>

              {/* Special Instructions Note */}
              {ord.orderNotes && (
                <div className="p-2 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                  <span className="font-bold">Customer Notes:</span> {ord.orderNotes}
                </div>
              )}

              {/* Cash on Delivery Change Evaluation Box */}
              {ord.paymentMethod === 'COD' && (
                <div className="p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-xl text-xs text-stone-900 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500 text-stone-950 font-black shrink-0">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-stone-900">Cash on Delivery</p>
                      <p className="text-[11px] text-stone-600 font-medium">
                        Customer Cash Note: <span className="font-bold text-stone-900">₹{ord.codCashTendered || ord.grandTotal}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-black text-stone-500 block">Change Required</span>
                    <span className="font-black text-xs text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block border border-emerald-200">
                      {ord.codChangeDue && ord.codChangeDue > 0 ? `₹${ord.codChangeDue}` : 'Exact Cash'}
                    </span>
                  </div>
                </div>
              )}

              {/* Price & Action Buttons */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                <span className="font-black text-sm text-stone-900">Grand Total: ₹{ord.grandTotal}</span>

                {/* State Machine Action Controls */}
                <div className="flex items-center gap-1.5">
                  {ord.status === 'PLACED' && (
                    <>
                      <button
                        onClick={() => setRejectOrderId(ord.id)}
                        className="px-3 py-1.5 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-bold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleAccept(ord.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                    </>
                  )}

                  {ord.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handlePrepare(ord.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Utensils className="w-3.5 h-3.5" /> Start Preparing
                    </button>
                  )}

                  {ord.status === 'PREPARING' && (
                    <button
                      onClick={() => setReadyOrderId(ord.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Ready
                    </button>
                  )}

                  {ord.status === 'READY' && (
                    <div className="flex items-center gap-1">
                      {deliveryPartners.length === 0 ? (
                        <span className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                          No delivery partner
                        </span>
                      ) : (
                        <select
                          onChange={(e) => handleSingleAssign(ord.id, e.target.value)}
                          defaultValue=""
                          className="p-1.5 border border-blue-300 rounded-xl text-xs font-bold bg-blue-50/50 text-blue-950 hover:bg-blue-50 cursor-pointer"
                        >
                          <option value="" disabled>
                            🛵 Assign Driver...
                          </option>
                          {deliveryPartners.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.vehicleType || 'Bike'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {ord.status === 'ASSIGNED' && (() => {
                    const partner = getPartnerInfo(ord);
                    return (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-blue-900 font-bold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl inline-flex items-center gap-1">
                          <Bike className="w-3.5 h-3.5 text-blue-700" />
                          <span>Assigned to <strong className="font-extrabold text-blue-950">{partner?.name || 'Arun Kumar'}</strong></span>
                        </span>
                        {deliveryPartners.length > 0 && (
                          <select
                            onChange={(e) => handleSingleAssign(ord.id, e.target.value)}
                            value=""
                            title="Re-assign to another driver"
                            className="p-1 border border-stone-200 rounded-lg text-[11px] font-semibold bg-white text-stone-700 hover:border-stone-400 cursor-pointer"
                          >
                            <option value="" disabled>
                              Reassign...
                            </option>
                            {deliveryPartners.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.id === ord.assignedDeliveryPartnerId ? '(Current)' : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectOrderId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3">
            <h3 className="font-bold text-stone-900 text-sm">Reject Order?</h3>
            <p className="text-xs text-stone-500">Select a reason for rejecting this customer order.</p>

            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2 border border-stone-300 rounded-xl text-xs"
            >
              <option value="Kitchen busy with high order volume">Kitchen busy with high order volume</option>
              <option value="Item temporarily out of stock">Item temporarily out of stock</option>
              <option value="Restaurant closing soon">Restaurant closing soon</option>
            </select>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectOrderId(null)}
                className="flex-1 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-700"
              >
                Cancel
              </button>
              <button
                disabled={isRejecting}
                onClick={handleRejectSubmit}
                className="flex-1 py-2 rounded-xl bg-red-700 text-white text-xs font-bold"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Assignment Modal */}
      {showBatchModal && (
        <DeliveryBatchingModal
          readyOrders={readyOrders}
          availablePartners={deliveryPartners}
          onClose={() => setShowBatchModal(false)}
          onSuccess={loadData}
        />
      )}

      {/* Ready Order Modal */}
      {readyOrderId && (
        <ReadyOrderModal
          order={orders.find(o => o.id === readyOrderId)!}
          onClose={() => setReadyOrderId(null)}
          onConfirm={async () => {
             await handleReady(readyOrderId);
          }}
        />
      )}
    </div>
  );
};
