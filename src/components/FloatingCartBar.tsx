import React from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface FloatingCartBarProps {
  onNavigateToCart: () => void;
  isVisible?: boolean;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({ 
  onNavigateToCart, 
  isVisible = true 
}) => {
  const { totalItemCount, grandTotal, isAddressModalOpen } = useCart();

  if (!isVisible || totalItemCount <= 0 || isAddressModalOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-16 md:bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl z-50 animate-in slide-in-from-bottom-4 duration-200 pointer-events-auto">
      <div
        onClick={onNavigateToCart}
        className="bg-gradient-to-r from-red-800 via-red-700 to-red-800 text-white rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center justify-between cursor-pointer hover:from-red-900 hover:to-red-800 transition-all duration-200 border border-red-500/40 shadow-red-950/20 active:scale-[0.99] group backdrop-blur-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-inner shrink-0 group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
              <span className="text-red-300 text-xs font-bold">•</span>
              <span className="text-sm sm:text-base font-black text-white">
                ₹{grandTotal}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-red-200 font-medium leading-none mt-0.5">
              Hunter's Kitchen • Tap to checkout
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigateToCart();
          }}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold bg-white text-red-900 px-3.5 sm:px-4 py-2 rounded-xl shadow-md hover:bg-amber-50 group-hover:shadow-lg transition-all shrink-0 active:scale-95 cursor-pointer"
        >
          <span>View Cart</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};
