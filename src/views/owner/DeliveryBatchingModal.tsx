import React, { useState } from 'react';
import { Order, User } from '../../types';
import { apiService } from '../../services/api';
import { Layers, Bike, Check, X, AlertTriangle } from 'lucide-react';

interface DeliveryBatchingModalProps {
  readyOrders: Order[];
  availablePartners: User[];
  onClose: () => void;
  onSuccess: () => void;
}

export const DeliveryBatchingModal: React.FC<DeliveryBatchingModalProps> = ({
  readyOrders,
  availablePartners,
  onClose,
  onSuccess
}) => {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(
    readyOrders.map((o) => o.id)
  );
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(
    availablePartners[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleOrderSelect = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateBatch = async () => {
    if (selectedOrderIds.length === 0) {
      setErrorMsg('Please select at least one ready order to batch');
      return;
    }
    if (!selectedPartnerId) {
      setErrorMsg('Please select an active delivery partner');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await apiService.createDeliveryBatch(selectedPartnerId, selectedOrderIds);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create batch assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl p-5 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-600" /> Combine Orders for Batch Delivery
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-stone-400 hover:text-stone-700" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-200">
            {errorMsg}
          </div>
        )}

        <div className="overflow-y-auto space-y-4 flex-1">
          {/* Select Orders */}
          <div>
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide mb-2">
              1. Select Ready Orders ({selectedOrderIds.length} chosen)
            </h4>
            <div className="space-y-2">
              {readyOrders.length === 0 ? (
                <p className="text-xs text-stone-500">No ready orders currently awaiting assignment.</p>
              ) : (
                readyOrders.map((ord) => {
                  const isChecked = selectedOrderIds.includes(ord.id);
                  return (
                    <div
                      key={ord.id}
                      onClick={() => toggleOrderSelect(ord.id)}
                      className={`p-3 rounded-xl border cursor-pointer text-xs flex items-center justify-between transition-all ${
                        isChecked
                          ? 'border-red-600 bg-red-50/70 text-red-950 font-semibold'
                          : 'border-stone-200 bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked ? 'bg-red-600 border-red-600 text-white' : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">#{ord.orderNumber}</p>
                          <p className="text-[11px] text-stone-500">{ord.deliveryAddress?.area || 'Counter'} • ₹{ord.grandTotal}</p>
                        </div>
                      </div>
                      <span className="text-[11px] bg-stone-200 px-2 py-0.5 rounded font-bold">
                        {ord.items.length} items
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Select Delivery Partner */}
          <div>
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide mb-2">
              2. Select Available Delivery Partner
            </h4>
            <div className="space-y-2">
              {availablePartners.filter(p => p.partnerStatus === 'ONLINE' || p.status === 'ACTIVE').length === 0 ? (
                <div className="p-3 bg-amber-50 text-amber-900 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" /> No delivery partners currently available.
                </div>
              ) : (
                availablePartners
                  .filter(p => p.partnerStatus === 'ONLINE' || p.status === 'ACTIVE')
                  .map((partner) => {
                  const isSelected = selectedPartnerId === partner.id;
                  return (
                    <div
                      key={partner.id}
                      onClick={() => setSelectedPartnerId(partner.id)}
                      className={`p-3 rounded-xl border cursor-pointer text-xs flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-red-600 bg-red-50/70 font-semibold text-red-950'
                          : 'border-stone-200 bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4 text-stone-500" />
                        <div>
                          <p className="font-bold text-stone-900">{partner.name}</p>
                          <p className="text-[11px] text-stone-500">{partner.vehicleNumber || partner.vehicleType || 'Bike'} ({partner.phone})</p>
                        </div>
                      </div>

                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        {partner.partnerStatus || 'ONLINE'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700"
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting || selectedOrderIds.length === 0 || !selectedPartnerId}
            onClick={handleCreateBatch}
            className="flex-1 py-2.5 rounded-xl bg-red-700 text-white text-xs font-bold shadow-md disabled:opacity-50"
          >
            {isSubmitting ? 'Assigning Batch...' : `Assign ${selectedOrderIds.length} Orders`}
          </button>
        </div>
      </div>
    </div>
  );
};
