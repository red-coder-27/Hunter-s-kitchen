import React, { useState, useEffect } from 'react';
import { MenuItem, Category } from '../../types';
import { apiService } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { FoodDetailModal } from './FoodDetailModal';
import { CategoryChipSkeleton, BestsellerCardSkeleton, MenuListSkeleton } from '../../components/Skeletons';
import { Flame, Star, Plus, Minus, ArrowRight, Utensils, Search, Leaf, Store, WifiOff, MapPin, ChevronDown } from 'lucide-react';
import { StarRating } from '../../components/StarRating';

interface CustomerHomeProps {
  currentTab: string;
  onNavigateToCart: () => void;
  onNavigateToSearch: () => void;
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

const TypewriterSearchPlaceholder: React.FC = () => {
  const [currentText, setCurrentText] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = FOOD_SUGGESTIONS[suggestionIndex];

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (currentText.length < fullText.length) {
          setCurrentText(fullText.slice(0, currentText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 1600);
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(fullText.slice(0, currentText.length - 1));
        } else {
          setIsDeleting(false);
          setSuggestionIndex((prev) => (prev + 1) % FOOD_SUGGESTIONS.length);
        }
      }
    }, isDeleting ? 35 : 75);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, suggestionIndex]);

  return (
    <span className="truncate text-stone-200 font-medium flex items-center gap-1">
      Search "{currentText}"
      <span className="inline-block w-1 h-3.5 bg-amber-400 animate-pulse rounded-xs shrink-0" />
    </span>
  );
};

export const CustomerHome: React.FC<CustomerHomeProps> = ({ currentTab, onNavigateToCart, onNavigateToSearch }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [dietFilter, setDietFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const { cartItems, addToCart, updateQuantity, totalItemCount, grandTotal, isAddressModalOpen, selectedAddress, setIsAddressModalOpen } = useCart();
  const { settings } = useAuth();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, items] = await Promise.all([apiService.getCategories(), apiService.getMenu()]);
        setCategories(Array.isArray(cats) ? cats : []);
        setMenuItems(Array.isArray(items) ? items : []);
        setIsOffline(!navigator.onLine);
      } catch (err) {
        console.error('Error loading menu:', err);
        // Fallback checks for localStorage categories and menu loaded inside apiService
        try {
          const cachedCats = localStorage.getItem('cached_categories');
          const cachedMenu = localStorage.getItem('cached_menu');
          if (cachedCats) {
            const parsedCats = JSON.parse(cachedCats);
            setCategories(Array.isArray(parsedCats) ? parsedCats : []);
          }
          if (cachedMenu) {
            const parsedMenu = JSON.parse(cachedMenu);
            setMenuItems(Array.isArray(parsedMenu) ? parsedMenu : []);
          }
        } catch (cacheErr) {
          console.error('Failed to parse cached menu data:', cacheErr);
        }
        setIsOffline(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter menu
  const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  const filteredItems = safeMenuItems.filter((item) => {
    // if (!item.isAvailable) return false; // Show unavailable items
    if (dietFilter === 'VEG' && !item.isVeg) return false;
    if (dietFilter === 'NON_VEG' && item.isVeg) return false;
    if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) return false;
    return true;
  });

  const bestsellers = safeMenuItems.filter(
    (i) =>
      i.isBestseller &&
      i.isAvailable && // Still exclude from bestsellers/recommendations if unavailable
      (dietFilter === 'ALL' || (dietFilter === 'VEG' ? i.isVeg : !i.isVeg))
  );

  // Helper to find quantity in cart for simple items
  const getItemQuantityInCart = (itemId: string) => {
    return (cartItems || [])
      .filter((ci) => ci?.menuItem?.id === itemId)
      .reduce((sum, ci) => sum + ci.quantity, 0);
  };

  const getCartItemId = (itemId: string) => {
    const found = cartItems.find((ci) => ci.menuItem.id === itemId);
    return found ? found.cartItemId : null;
  };

  const handleOrderFreshClick = () => {
    const biriyaniCat = categories.find(
      (c) =>
        c.name.toLowerCase().includes('biriyani') ||
        c.name.toLowerCase().includes('biryani') ||
        c.name.toLowerCase().includes('special')
    );
    if (biriyaniCat) {
      setSelectedCategory(biriyaniCat.id);
    } else {
      setSelectedCategory('ALL');
    }
    const el = document.getElementById('explore-menu-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="pb-28">
      {isOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-amber-600 text-[11px] flex items-center justify-center gap-2 font-bold animate-pulse">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-500" />
          <span>Offline Mode: Displaying last loaded menu from local cache</span>
        </div>
      )}
      {settings && !settings.isOpen ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
            <Store className="w-10 h-10 text-stone-400" />
          </div>
          <h2 className="text-2xl font-black text-stone-900 mb-2">Shop is closed 🏚️</h2>
          <p className="text-stone-500">Please check back later when we're open.</p>
        </div>
      ) : (
        <>
          {/* Active Delivery Address Card */}
          <div className="bg-white border-b border-stone-200 px-4 py-2.5 shadow-2xs">
            <div className="max-w-7xl mx-auto">
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="w-full flex items-center justify-between text-left group gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-red-50 text-red-700 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-extrabold text-[11px] text-stone-900 tracking-wide uppercase">
                        Delivering to: {selectedAddress?.type || 'Select Location'}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-900" />
                    </div>
                    <p className="text-[11px] text-stone-500 truncate font-normal mt-0.5">
                      {selectedAddress
                        ? `${selectedAddress.doorNo ? `${selectedAddress.doorNo}, ` : ''}${selectedAddress.street || ''}, ${selectedAddress.area || ''}`
                        : 'Tap to choose delivery address'}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Search Header Banner (Brand Red & Amber) */}
          <div className="px-4 py-3 bg-gradient-to-r from-red-900 via-red-800 to-red-900 text-white shadow-md shadow-red-950/15 border-b border-red-800/40">
            <div className="max-w-7xl mx-auto space-y-2.5">
              {/* Full-width Search Bar */}
              <div
                onClick={onNavigateToSearch}
                className="w-full bg-red-950/40 hover:bg-red-950/60 transition-all duration-200 rounded-xl py-2.5 px-4 flex items-center justify-between text-stone-100 text-xs cursor-pointer border-2 border-red-500/40 hover:border-amber-400 shadow-inner group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Search className="w-4 h-4 text-amber-300 shrink-0 group-hover:scale-110 transition-transform" />
                  <TypewriterSearchPlaceholder />
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-amber-200 bg-red-950/60 px-2.5 py-0.5 rounded-lg border border-red-500/30 group-hover:text-amber-100 transition-colors">
                  <span>Explore Menu</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>
          {/* Diet Preference Segmented Control */}
          <div className="flex items-center justify-between gap-2 px-4 max-w-7xl mx-auto pt-3">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Diet Preference</span>
            <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDietFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  dietFilter === 'ALL'
                    ? 'bg-red-700 text-white shadow-xs'
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
                    : 'text-stone-400 hover:text-emerald-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dietFilter === 'VEG' ? 'bg-white' : 'bg-emerald-400'}`}></span>
                Veg
              </button>
              <button
                type="button"
                onClick={() => setDietFilter(dietFilter === 'NON_VEG' ? 'ALL' : 'NON_VEG')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  dietFilter === 'NON_VEG'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-red-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dietFilter === 'NON_VEG' ? 'bg-white' : 'bg-red-400'}`}></span>
                Non-Veg
              </button>
            </div>
          </div>
          
          {/* Hero Banner */}
          <div className="px-4 pt-3 max-w-7xl mx-auto">
            <div
              onClick={handleOrderFreshClick}
              className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-red-900 via-red-800 to-amber-900 text-white p-5 shadow-md cursor-pointer group hover:shadow-lg transition-all"
            >
              <div className="relative z-10 max-w-[70%]">
                <span className="bg-amber-400 text-stone-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mb-1">
                  🔥 Signature Taste
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">Hunter's Kitchen Specials</h1>
                <p className="text-xs sm:text-sm text-red-100 mt-1 line-clamp-2">
                  Authentic Seeraga Samba Dum Biriyani &amp; Crispy Parottas cooked with fresh house masalas!
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOrderFreshClick();
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold bg-white text-red-900 px-3.5 py-1.5 rounded-xl shadow-xs hover:bg-amber-50 active:scale-95 transition-all group-hover:scale-105"
                >
                  Order Fresh Now <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <img
                src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80"
                alt="Biriyani"
                className="absolute -right-6 -bottom-6 w-44 h-44 sm:w-56 sm:h-56 object-cover rounded-full border-4 border-white/10 opacity-90 shadow-2xl group-hover:scale-105 transition-transform"
              />
            </div>
          </div>

          {/* Category Chips Horizontal Scroll */}
          <div id="explore-menu-section" className="mt-4 px-4 max-w-7xl mx-auto">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">Explore Categories</h3>
            {isLoading ? (
              <CategoryChipSkeleton />
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    selectedCategory === 'ALL'
                      ? 'bg-red-700 text-white border-red-700 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span>All Items</span>
                  <span
                    className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full min-w-5 leading-none transition-colors ${
                      selectedCategory === 'ALL'
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {menuItems.length}
                  </span>
                </button>
                {safeCategories.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const count = menuItems.filter((i) => i.categoryId === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                        isSelected
                          ? 'bg-red-700 text-white border-red-700 shadow-sm'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span>{cat.icon || '🍱'}</span>
                      <span>{cat.name}</span>
                      <span
                        className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full min-w-5 leading-none transition-colors ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bestseller Highlights Section */}
          {isLoading ? (
            <div className="mt-5 px-4 max-w-7xl mx-auto">
              <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5 mb-2.5">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" /> Most Popular Bestsellers
              </h3>
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                {[1, 2, 3].map((i) => (
                  <BestsellerCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : selectedCategory === 'ALL' && bestsellers.length > 0 ? (
            <div className="mt-5 px-4 max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" /> Most Popular Bestsellers
                </h3>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                {bestsellers.map((item) => {
                  const qty = getItemQuantityInCart(item.id);
                  const cartItemId = getCartItemId(item.id);

                  return (
                    <div
                      key={item.id}
                      className="w-48 bg-white rounded-2xl border border-stone-200 p-2.5 shrink-0 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div
                        onClick={() => setSelectedItemForModal(item)}
                        className="cursor-pointer"
                      >
                        <div className="relative h-28 rounded-xl overflow-hidden bg-stone-100 mb-2">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          <span
                            className={`absolute top-2 left-2 w-2.5 h-2.5 rounded-full border ${
                              item.isVeg ? 'bg-emerald-500 border-emerald-200' : 'bg-red-600 border-red-200'
                            }`}
                          ></span>
                        </div>
                        <h4 className="font-bold text-xs text-stone-900 line-clamp-1">{item.name}</h4>
                        <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{item.description}</p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <span className="font-black text-sm text-stone-900">₹{item.discountPrice || item.price}</span>
                          {item.discountPrice && (
                            <span className="text-[10px] text-stone-400 line-through ml-1">₹{item.price}</span>
                          )}
                        </div>

                        {qty === 0 ? (
                          <button
                            onClick={() => {
                              if ((!item.customizations || item.customizations.length === 0) && (!item.addons || item.addons.length === 0)) {
                                addToCart(item, 1);
                              } else {
                                setSelectedItemForModal(item);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-extrabold text-xs border border-red-200 shadow-2xs active:scale-95 transition-transform"
                          >
                            + ADD
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-red-700 text-white rounded-lg px-2 py-1 text-xs font-bold shadow-2xs">
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
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Main Menu List Grid */}
          <div className="mt-5 px-4 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-stone-900">
                {selectedCategory === 'ALL'
                  ? 'Full Menu'
                  : categories.find((c) => c.id === selectedCategory)?.name || 'Menu'}
                {!isLoading && <span className="text-xs text-stone-500 font-normal ml-2">({filteredItems.length} items)</span>}
              </h3>
            </div>

            {isLoading ? (
              <MenuListSkeleton count={5} />
            ) : filteredItems.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-stone-200 my-4">
                <Utensils className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <h4 className="font-bold text-stone-800 text-sm">No items found</h4>
                <p className="text-xs text-stone-500 mt-1">Try resetting your diet filter or selecting another category.</p>
                <button
                  onClick={() => {
                    setDietFilter('ALL');
                    setSelectedCategory('ALL');
                  }}
                  className="mt-3 px-4 py-2 bg-stone-900 text-white font-bold text-xs rounded-xl"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredItems.map((item) => {
                  const qty = getItemQuantityInCart(item.id);
                  const cartItemId = getCartItemId(item.id);

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-stone-200/80 p-3 flex gap-3 shadow-2xs hover:shadow-sm transition-shadow relative overflow-hidden"
                    >
                      <div
                        onClick={() => setSelectedItemForModal(item)}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-stone-100 shrink-0 relative cursor-pointer"
                      >
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        <span
                          className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border ${
                            item.isVeg ? 'bg-emerald-500 border-emerald-200' : 'bg-red-600 border-red-200'
                          }`}
                        ></span>
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div onClick={() => setSelectedItemForModal(item)} className="cursor-pointer">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-xs sm:text-sm text-stone-900 line-clamp-1">{item.name}</h4>
                            {item.isBestseller && item.isAvailable && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">
                                Bestseller
                              </span>
                            )}
                            {!item.isAvailable && (
                              <span className="bg-stone-100 text-stone-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0">
                                Out of Stock
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-snug">{item.description}</p>

                          <div className="flex items-center gap-1.5 mt-1.5">
                            <StarRating rating={item.rating} size="sm" />
                            <span className="text-stone-600 text-[11px] font-bold">({item.ratingCount})</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100">
                          <div>
                            <span className="font-black text-sm text-stone-900">₹{item.discountPrice || item.price}</span>
                            {item.discountPrice && (
                              <span className="text-[10px] text-stone-400 line-through ml-1">₹{item.price}</span>
                            )}
                          </div>

                          {item.isAvailable ? (
                            qty === 0 ? (
                              <button
                                onClick={() => {
                                  if ((!item.customizations || item.customizations.length === 0) && (!item.addons || item.addons.length === 0)) {
                                    addToCart(item, 1);
                                  } else {
                                    setSelectedItemForModal(item);
                                  }
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-extrabold text-xs border border-red-200 shadow-2xs active:scale-95 transition-transform"
                              >
                                + ADD
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 bg-red-700 text-white rounded-xl px-2.5 py-1 text-xs font-bold shadow-2xs">
                                <button
                                  onClick={() => cartItemId && updateQuantity(cartItemId, qty - 1)}
                                  className="hover:text-red-200"
                                >
                                  <Minus className="w-3.5 h-3.5" />
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
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )
                          ) : (
                            <button
                              disabled
                              className="px-3.5 py-1.5 rounded-xl bg-stone-100 text-stone-500 font-extrabold text-xs border border-stone-200 cursor-not-allowed"
                            >
                              Unavailable
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Modal View */}
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
