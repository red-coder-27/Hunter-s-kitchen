import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../types';
import { apiService } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { FoodDetailModal } from './FoodDetailModal';
import { MenuListSkeleton } from '../../components/Skeletons';
import { Search, X, Star, Plus, Minus, ArrowLeft, ArrowRight, Utensils } from 'lucide-react';

interface CustomerSearchProps {
  onBack?: () => void;
  onNavigateToCart?: () => void;
}

const FOOD_SUGGESTIONS = [
  'Chicken Biriyani',
  'Crispy Parotta',
  'Mutton Chukka',
  'Butter Chicken',
  'Paneer Butter Masala',
  'Masala Dosa',
  'Tandoori Chicken',
  'Gobi Manchurian',
  'Chettinad Fish Curry',
];

export const CustomerSearch: React.FC<CustomerSearchProps> = ({ onBack, onNavigateToCart }) => {
  const [query, setQuery] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dietFilter, setDietFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);

  const [placeholderText, setPlaceholderText] = useState('');
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = `Search "${FOOD_SUGGESTIONS[suggestionIdx]}"...`;
    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (placeholderText.length < fullText.length) {
          setPlaceholderText(fullText.slice(0, placeholderText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 1600);
        }
      } else {
        if (placeholderText.length > 0) {
          setPlaceholderText(fullText.slice(0, placeholderText.length - 1));
        } else {
          setIsDeleting(false);
          setSuggestionIdx((prev) => (prev + 1) % FOOD_SUGGESTIONS.length);
        }
      }
    }, isDeleting ? 30 : 70);

    return () => clearTimeout(timer);
  }, [placeholderText, isDeleting, suggestionIdx]);

  const { cartItems, addToCart, updateQuantity, totalItemCount, grandTotal, isAddressModalOpen } = useCart();

  useEffect(() => {
    async function loadMenu() {
      try {
        const items = await apiService.getMenu();
        setMenuItems(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMenu();
  }, []);

  const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];

  const results = safeMenuItems.filter((item) => {
    if (!item.isAvailable) return false;
    if (dietFilter === 'VEG' && !item.isVeg) return false;
    if (dietFilter === 'NON_VEG' && item.isVeg) return false;
    if (!query.trim()) return true;

    const q = query.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.categoryName.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  const getItemQuantityInCart = (itemId: string) => {
    return (cartItems || [])
      .filter((ci) => ci.menuItem.id === itemId)
      .reduce((sum, ci) => sum + ci.quantity, 0);
  };

  const getCartItemId = (itemId: string) => {
    const found = (cartItems || []).find((ci) => ci.menuItem.id === itemId);
    return found ? found.cartItemId : null;
  };

  return (
    <div className="pb-24">
      {/* Header Search Input */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 sticky top-[33px] z-30 shadow-xs">
        <div className="max-w-7xl mx-auto space-y-2.5">
          {/* Top Row: Back button & Search Input */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 hover:bg-stone-200 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                autoFocus
                placeholder={placeholderText || "Search dishes, categories..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 border-2 border-stone-300 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 rounded-xl text-xs focus:outline-none focus:bg-white font-medium shadow-2xs transition-all"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-3 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Diet Preference Segmented Control */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Filter Dishes</span>
            <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDietFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  dietFilter === 'ALL'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDietFilter(dietFilter === 'VEG' ? 'ALL' : 'VEG')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  dietFilter === 'VEG'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-emerald-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dietFilter === 'VEG' ? 'bg-white' : 'bg-emerald-600'}`}></span>
                Veg
              </button>
              <button
                type="button"
                onClick={() => setDietFilter(dietFilter === 'NON_VEG' ? 'ALL' : 'NON_VEG')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  dietFilter === 'NON_VEG'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-red-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dietFilter === 'NON_VEG' ? 'bg-white' : 'bg-red-600'}`}></span>
                Non-Veg
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Suggestions */}
      {!query && (
        <div className="px-4 py-4 max-w-7xl mx-auto">
          <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Popular Searches</h4>
          <div className="flex flex-wrap gap-2">
            {['Biriyani', 'Chicken 65', 'Parotta', 'Dosa', 'Elaneer Payasam', 'Mutton'].map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition-colors cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="px-4 py-3 max-w-7xl mx-auto space-y-3">
        {!isLoading && <p className="text-xs text-stone-500 font-medium">Found {results.length} results</p>}

        {isLoading ? (
          <MenuListSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((item) => {
          const qty = getItemQuantityInCart(item.id);
          const cartItemId = getCartItemId(item.id);

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-stone-200 p-3 flex gap-3 shadow-2xs hover:shadow-sm"
            >
              <div
                onClick={() => setSelectedItemForModal(item)}
                className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0 cursor-pointer"
              >
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div onClick={() => setSelectedItemForModal(item)} className="cursor-pointer">
                  <h4 className="font-bold text-xs text-stone-900 truncate">{item.name}</h4>
                  <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{item.description}</p>
                  <div className="flex items-center text-amber-600 text-[10px] font-bold mt-1">
                    <Star className="w-3 h-3 fill-amber-500 mr-0.5" /> {item.rating}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="font-black text-xs text-stone-900">₹{item.discountPrice || item.price}</span>

                  {qty === 0 ? (
                    <button
                      onClick={() => {
                        if ((!item.customizations || item.customizations.length === 0) && (!item.addons || item.addons.length === 0)) {
                          addToCart(item, 1);
                        } else {
                          setSelectedItemForModal(item);
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-red-50 text-red-700 font-bold text-xs border border-red-200 hover:bg-red-100 active:scale-95 transition-all shadow-2xs"
                    >
                      + ADD
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-red-700 text-white rounded-lg px-2 py-0.5 text-xs font-bold shadow-2xs">
                      <button
                        onClick={() => cartItemId && updateQuantity(cartItemId, qty - 1)}
                        className="hover:text-red-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span>{qty}</span>
                      <button
                        onClick={() => {
                          if ((!item.customizations || item.customizations.length === 0) && (!item.addons || item.addons.length === 0)) {
                            if (cartItemId) {
                              updateQuantity(cartItemId, qty + 1);
                            } else {
                              addToCart(item, 1);
                            }
                          } else {
                            setSelectedItemForModal(item);
                          }
                        }}
                        className="hover:text-red-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}
          </div>
        )}
      </div>

      {selectedItemForModal && (
        <FoodDetailModal
          item={selectedItemForModal}
          onClose={() => setSelectedItemForModal(null)}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
};
