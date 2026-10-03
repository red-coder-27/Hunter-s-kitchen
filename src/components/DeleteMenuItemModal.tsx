import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { MenuItem } from '../types';

interface DeleteMenuItemModalProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onConfirm: (itemId: string) => Promise<void>;
}

export const DeleteMenuItemModal: React.FC<DeleteMenuItemModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsDeleting(false);
      setErrorMessage(null);
    }
  }, [isOpen, item]);

  // Handle ESC key to dismiss modal when not deleting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !item) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await onConfirm(item.id);
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete menu item:', err);
      setErrorMessage(err?.message || 'Failed to delete dish. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={!isDeleting ? onClose : undefined}
    >
      <div
        className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-40 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Red Warning Icon */}
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-red-50 border border-red-100 rounded-2xl shrink-0 text-red-600 shadow-3xs">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="pr-6">
            <h3 id="delete-dialog-title" className="font-black text-stone-900 text-base leading-snug">
              Delete Dish from Menu
            </h3>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              Confirm permanent removal from the live menu
            </p>
          </div>
        </div>

        {/* Dish Preview Summary Card */}
        <div className="p-3.5 bg-stone-50 border border-stone-200/90 rounded-2xl flex items-center gap-3.5">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-200 shadow-3xs"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-stone-200 flex items-center justify-center text-stone-400 shrink-0 text-lg">
              🍽️
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 bg-stone-200/90 text-stone-700 font-bold text-[10px] rounded uppercase tracking-wider">
                {item.categoryName || 'Menu Item'}
              </span>
              <span
                className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded uppercase tracking-wider ${
                  item.isVeg
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {item.isVeg ? 'Veg' : 'Non-Veg'}
              </span>
            </div>

            <h4 className="font-extrabold text-stone-900 text-xs mt-1 truncate">
              {item.name}
            </h4>

            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="font-black text-red-600">
                ₹{item.discountPrice || item.price}
              </span>
              <span
                className={`text-[10px] font-bold ${
                  item.isAvailable ? 'text-emerald-700' : 'text-stone-500'
                }`}
              >
                {item.isAvailable ? '● In Stock' : '○ Out of Stock'}
              </span>
            </div>
          </div>
        </div>

        {/* Warning Callout Box */}
        <div className="p-3 bg-red-50/80 border border-red-100/90 rounded-xl flex items-start gap-2.5 text-xs text-red-900">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Are you sure you want to permanently delete <strong className="font-black text-stone-900">{item.name}</strong>?
            This dish will be instantly removed from your customer ordering catalog.
          </p>
        </div>

        {/* Error Message if deletion fails */}
        {errorMessage && (
          <div className="p-2.5 bg-rose-100 text-rose-800 text-xs rounded-xl font-semibold border border-rose-200 animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 active:scale-95 text-stone-700 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-3xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Dish...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
