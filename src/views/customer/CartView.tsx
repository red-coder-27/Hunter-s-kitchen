import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Plus, Minus, ArrowRight, MapPin, ShoppingBag, Info, X, ShieldCheck, Utensils, ChevronRight } from 'lucide-react';

interface CartViewProps {
  onProceedToCheckout: () => void;
  onBrowseMenu: () => void;
}

export const CartView: React.FC<CartViewProps> = ({ onProceedToCheckout, onBrowseMenu }) => {
  const [showTaxInfo, setShowTaxInfo] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    subtotal,
    deliveryFee,
    tax,
    grandTotal,
    selectedAddress,
    orderNotes,
    setOrderNotes,
    setIsAddressModalOpen
  } = useCart();

  const { settings } = useAuth();

  const cgst = (subtotal * 0.025).toFixed(2);
  const sgst = (subtotal * 0.025).toFixed(2);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-stone-100 text-stone-300 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">Your Cart is Empty</h3>
        <p className="text-xs text-stone-500 mt-1 max-w-xs leading-relaxed">
          Explore Hunter's Kitchen delicious biriyanis, parottas and star starters to begin!
        </p>
        <button
          onClick={onBrowseMenu}
          className="mt-5 px-6 py-3 rounded-xl bg-red-700 text-white font-bold text-xs shadow-md hover:bg-red-800 transition-all"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="pb-28 md:pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Cart Items List */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs space-y-3">
        <h3 className="font-extrabold text-sm text-stone-900 pb-2 border-b border-stone-100">
          Your Selected Dishes ({cartItems.length})
        </h3>

        <div className="divide-y divide-stone-100">
          {(cartItems || []).map((item) => (
            <div key={item.cartItemId} className="py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full border shrink-0 ${
                      item.menuItem?.isVeg ? 'bg-emerald-500 border-emerald-300' : 'bg-red-600 border-red-300'
                    }`}
                  ></span>
                  <h4 className="font-bold text-xs text-stone-900 truncate">{item.menuItem?.name || 'Dish'}</h4>
                </div>

                {/* Options summary */}
                {((item.customizations && item.customizations.length > 0) || (item.addons && item.addons.length > 0)) && (
                  <div className="text-[11px] text-stone-500 mt-1 space-y-0.5 pl-4">
                    {(item.customizations || []).map((c, i) => (
                      <div key={i}>• {c.optionName}: {c.selectedLabel}</div>
                    ))}
                    {(item.addons || []).map((a, i) => (
                      <div key={i}>+ {a.name} (₹{a.price})</div>
                    ))}
                  </div>
                )}

                <p className="text-xs font-bold text-stone-900 mt-1 pl-4">₹{item.itemTotalPrice}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 rounded-xl px-2 py-1 text-xs font-bold">
                  <button
                    onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                    className="hover:text-red-700"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-4 text-center font-extrabold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                    className="hover:text-red-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.cartItemId)}
                  className="p-1.5 text-stone-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onBrowseMenu}
          className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-xl border border-dashed border-stone-300 text-stone-600 hover:bg-stone-50 hover:text-stone-900 text-xs font-bold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add More Items
        </button>
      </div>

      {/* Special Order Notes */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs">
        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide mb-1.5">Delivery & Cooking Notes</h4>
        <textarea
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="e.g. Please make chicken biriyani extra spicy and pack separately..."
          rows={2}
          className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
        />
      </div>

      {/* Delivery Address Preview */}
      <button
        onClick={() => setIsAddressModalOpen(true)}
        className="w-full text-left bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs flex items-center justify-between hover:border-red-500 hover:bg-red-50/5 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-stone-900 uppercase">
              Delivering To: {selectedAddress?.type || 'Home'}
            </p>
            <p className="text-xs text-stone-500 truncate mt-0.5">
              {selectedAddress
                ? `${selectedAddress.doorNo ? `${selectedAddress.doorNo}, ` : ''}${selectedAddress.street || ''}, ${selectedAddress.area || ''}`
                : 'Please select delivery address'}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 shrink-0 ml-2" />
      </button>

      {/* Bill Details */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs space-y-2 text-xs">
        <h4 className="font-extrabold text-stone-900 text-xs uppercase tracking-wide pb-2 border-b border-stone-100">
          Bill Details
        </h4>

        <div className="flex justify-between text-stone-600">
          <span>Item Subtotal</span>
          <span className="font-semibold text-stone-900">₹{subtotal}</span>
        </div>

        <div className="flex justify-between text-stone-600">
          <span>Delivery Fee</span>
          {deliveryFee === 0 ? (
            <span className="font-bold text-emerald-600 uppercase">FREE</span>
          ) : (
            <span className="font-semibold text-stone-900">₹{deliveryFee}</span>
          )}
        </div>

        <div className="flex justify-between text-stone-600">
          <span className="flex items-center gap-1.5">
            Taxes & Govt Charges (5%)
            <button
              type="button"
              onClick={() => setShowTaxInfo(true)}
              className="text-stone-400 hover:text-red-600 p-0.5 rounded-full transition-colors cursor-pointer inline-flex items-center"
              title="Click for tax breakdown"
            >
              <Info className="w-3.5 h-3.5 text-stone-400 hover:text-red-600" />
            </button>
          </span>
          <span className="font-semibold text-stone-900">₹{tax}</span>
        </div>

        {/* Tax Breakdown Pop Up Tab Modal */}
        {showTaxInfo && (
          <div className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl border border-stone-100 scale-100 animate-in zoom-in-95 duration-200 relative">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-stone-900 text-sm">Tax & Levy Breakdown</h3>
                    <p className="text-[10px] text-stone-400 font-medium">Govt. Mandated 5% GST Split</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTaxInfo(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tax Details Cards */}
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-900">Central GST (CGST)</p>
                    <p className="text-[10px] text-stone-500">2.5% on food subtotal</p>
                  </div>
                  <span className="font-black text-stone-900 text-sm">₹{cgst}</span>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-stone-900">State GST (SGST)</p>
                    <p className="text-[10px] text-stone-500">2.5% on food subtotal</p>
                  </div>
                  <span className="font-black text-stone-900 text-sm">₹{sgst}</span>
                </div>

                <div className="p-3.5 bg-red-50/80 rounded-2xl border border-red-200/80 flex items-center justify-between text-red-900">
                  <div>
                    <p className="font-black text-xs">Total Taxes (5%)</p>
                    <p className="text-[10px] text-red-700">Calculated on ₹{subtotal}</p>
                  </div>
                  <span className="font-black text-base text-red-700">₹{tax}</span>
                </div>
              </div>

              {/* Notice */}
              <p className="text-[10px] text-stone-400 text-center leading-relaxed">
                As per Govt. regulations, a total of 5% GST is applicable on food items (2.5% CGST + 2.5% SGST).
              </p>

              {/* Action Button */}
              <button
                onClick={() => setShowTaxInfo(false)}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-stone-100 flex justify-between items-baseline font-black text-sm text-stone-900">
          <span>Grand Total</span>
          <span className="text-base text-red-700">₹{grandTotal}</span>
        </div>
      </div>

      {/* Fixed Sticky Proceed Button */}
      <div className="fixed bottom-16 md:bottom-6 left-4 right-4 z-30 max-w-4xl mx-auto">
        <button
          onClick={() => {
            setIsCheckoutLoading(true);
            setTimeout(() => {
              setIsCheckoutLoading(false);
              onProceedToCheckout();
            }, 2000);
          }}
          className="w-full py-3.5 px-5 rounded-2xl bg-red-700 hover:bg-red-800 active:scale-[0.99] text-white font-extrabold text-sm shadow-xl flex items-center justify-between transition-all cursor-pointer"
        >
          <span>Pay ₹{grandTotal}</span>
          <span className="flex items-center gap-1.5">
            Proceed to Checkout <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </div>

      {/* Checkout transition loader overlay */}
      {isCheckoutLoading && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-stone-900/45 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-xs text-center border border-stone-100/85 animate-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-stone-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-red-700 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-red-700">
                <Utensils className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-black text-stone-900 tracking-tight">Verifying Cart Details</h3>
            <p className="text-[11px] text-stone-500 mt-2 font-medium leading-relaxed">
              Prepping your billing summary & delivery options...
            </p>
            {/* Visual tiny step bar */}
            <div className="w-full bg-stone-100 h-1.5 rounded-full mt-5 overflow-hidden">
              <div className="bg-red-700 h-full rounded-full animate-[loading-bar_2s_ease-out_forwards]" style={{ width: '0%' }} />
            </div>
          </div>
          <style>{`
            @keyframes loading-bar {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
