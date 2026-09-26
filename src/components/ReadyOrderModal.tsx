import React, { useState } from 'react';
import { X, Check, Banknote } from 'lucide-react';
import { Order } from '../types';

interface ReadyOrderModalProps {
  order: Order;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ReadyOrderModal: React.FC<ReadyOrderModalProps> = ({ order, onClose, onConfirm }) => {
  const [itemChecklist, setItemChecklist] = useState<Record<number, boolean>>(
    (order.items || []).reduce((acc, _, idx) => ({ ...acc, [idx]: false }), {})
  );
  const [codChecked, setCodChecked] = useState(order.paymentMethod !== 'COD');
  const [isProcessing, setIsProcessing] = useState(false);

  const allItemsChecked = Object.values(itemChecklist).every(val => val);
  const canMarkReady = allItemsChecked && codChecked;

  const handleConfirm = async () => {
    setIsProcessing(true);
    await onConfirm();
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-sm">Order Readiness Checklist</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-stone-500" /></button>
        </div>

        <div className="space-y-3">
          {(order.items || []).map((item, idx) => (
            <label key={idx} className="flex gap-3 p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
              <input
                type="checkbox"
                checked={itemChecklist[idx]}
                onChange={() => setItemChecklist(prev => ({ ...prev, [idx]: !prev[idx] }))}
                className="mt-1 w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <p className="font-bold text-stone-900">{item.quantity}x {item.name}</p>
                {item.customizations && item.customizations.map((c, i) => (
                    <p key={i} className="text-stone-500">• {c.optionName}: {c.selectedLabel}</p>
                ))}
                {item.specialInstructions && (
                    <p className="text-amber-700 font-medium">Note: {item.specialInstructions}</p>
                )}
              </div>
            </label>
          ))}
          
          {order.paymentMethod === 'COD' && (
            <label className="flex gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer">
              <input
                type="checkbox"
                checked={codChecked}
                onChange={() => setCodChecked(!codChecked)}
                className="mt-1 w-4 h-4 rounded border-amber-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <p className="font-bold text-amber-900 flex items-center gap-1"><Banknote className="w-4 h-4" /> COD Change Carried</p>
                <p className="text-amber-700">Ensure change of ₹{order.codChangeDue || 0} is carried.</p>
              </div>
            </label>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700"
          >
            Cancel
          </button>
          <button
            disabled={!canMarkReady || isProcessing}
            onClick={handleConfirm}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white ${canMarkReady ? 'bg-emerald-700' : 'bg-stone-300 cursor-not-allowed'}`}
          >
            {isProcessing ? 'Processing...' : 'Mark Ready'}
          </button>
        </div>
      </div>
    </div>
  );
};
