import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { Address } from '../types';

interface DeleteAddressModalProps {
  isOpen: boolean;
  address: Address | null;
  onClose: () => void;
  onConfirm: (addressId: string) => Promise<void>;
}

export const DeleteAddressModal: React.FC<DeleteAddressModalProps> = ({
  isOpen,
  address,
  onClose,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !address) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(address.id);
      setIsDeleting(false);
      onClose();
    } catch (err) {
      console.error('Failed to delete address:', err);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-3.5 right-3.5 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-3">
          <div className="p-3 bg-red-50 border border-red-100 rounded-2xl shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="pr-6">
            <h3 className="font-extrabold text-stone-900 text-sm">Delete Saved Address</h3>
            <p className="text-[11px] text-stone-500 font-medium mt-0.5">
              Confirm permanent removal from database
            </p>
          </div>
        </div>

        {/* Address Card Summary */}
        <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl text-xs space-y-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="px-1.5 py-0.5 bg-stone-200 text-stone-800 font-extrabold text-[9px] rounded uppercase tracking-wider">
              {address?.type || 'Address'}
            </span>
            <span className="font-bold text-stone-900 text-xs">{address?.name || ''}</span>
          </div>
          <p className="text-stone-600 text-[11px] leading-relaxed">
            {address?.doorNo ? `${address.doorNo}, ` : ''}{address?.street || ''}, {address?.area || ''}, {address?.city || ''} - {address?.pincode || ''}
          </p>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Are you sure you want to delete this address? It will be immediately removed from your account and database records.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl border border-stone-200 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-xs transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
