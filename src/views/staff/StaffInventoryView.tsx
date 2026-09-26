import React, { useState, useEffect } from 'react';
import { MenuItem, Category } from '../../types';
import { apiService } from '../../services/api';
import {
  Package,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
  X,
  UtensilsCrossed,
  ArrowLeft,
  Loader2
} from 'lucide-react';

interface StaffInventoryViewProps {
  onBack?: () => void;
}

export const StaffInventoryView: React.FC<StaffInventoryViewProps> = ({ onBack }) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [menuData, catData] = await Promise.all([
        apiService.getMenu(),
        apiService.getCategories()
      ]);
      setItems(Array.isArray(menuData) ? menuData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      console.error('Failed to load menu stock data:', err);
      showToast('Failed to load menu data. Please refresh.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const newStatus = !item.isAvailable;
    setUpdatingItemId(item.id);

    // Optimistic UI update
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, isAvailable: newStatus } : it))
    );

    try {
      await apiService.updateItemAvailability(item.id, newStatus);
      showToast(
        newStatus
          ? `"${item.name}" is now IN STOCK & available for ordering.`
          : `"${item.name}" marked as 86'd (Sold Out). Customers cannot order it.`
      );
    } catch (err: any) {
      console.error('Failed to update availability:', err);
      // Rollback on error
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isAvailable: item.isAvailable } : it))
      );
      showToast(err.message || 'Failed to update item status.', 'error');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ALL' || item.categoryId === selectedCategory;

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'AVAILABLE'
        ? item.isAvailable
        : !item.isAvailable;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const availableCount = items.filter((i) => i.isAvailable).length;
  const soldOutCount = items.filter((i) => !i.isAvailable).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between border shadow-md animate-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-stone-400 hover:text-stone-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                Kitchen Inventory Control
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-800 uppercase">
                86-ing System
              </span>
            </div>
            <h3 className="text-base font-black text-stone-900 leading-tight">Live Menu Stock & 86-ing</h3>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              Instantly toggle dishes in or out of stock during kitchen rush hours.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Stock</span>
          </button>
        </div>
      </div>

      {/* Inventory KPI Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-stone-200 p-3.5 sm:p-4 shadow-3xs text-center">
          <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-tight block">
            Total Menu Items
          </span>
          <span className="text-xl sm:text-2xl font-black text-stone-900">{items.length}</span>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-3.5 sm:p-4 shadow-3xs text-center">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-tight block">
            In Stock (Active)
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700">{availableCount}</span>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-3.5 sm:p-4 shadow-3xs text-center">
          <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-tight block">
            86'd (Sold Out)
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-700">{soldOutCount}</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search dish by name or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-stone-200 rounded-xl bg-stone-50/50 focus:bg-white focus:outline-none focus:border-stone-400 transition-all font-medium"
            />
          </div>

          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('AVAILABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              In Stock ({availableCount})
            </button>
            <button
              onClick={() => setStatusFilter('UNAVAILABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'UNAVAILABLE'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-red-50 text-red-800 hover:bg-red-100'
              }`}
            >
              86'd ({soldOutCount})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Items List / Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-stone-400" />
          <p className="text-xs font-bold text-stone-600">Loading menu items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center text-stone-400 text-xs shadow-3xs space-y-2">
          <UtensilsCrossed className="w-10 h-10 text-stone-300 mx-auto" />
          <p className="font-extrabold text-stone-700 text-sm">No Menu Items Found</p>
          <p className="text-stone-400">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((item) => {
            const isUpdating = updatingItemId === item.id;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all flex flex-col justify-between gap-3 ${
                  item.isAvailable
                    ? 'border-stone-200 hover:border-stone-300'
                    : 'border-red-200 bg-red-50/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                      />
                      <h4 className="font-black text-xs text-stone-900 truncate">{item.name}</h4>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-xs font-black text-red-700">₹{item.price}</span>
                      <span className="text-[10px] text-stone-400 font-semibold">
                        Prep: {item.preparationTimeMinutes || 15}m
                      </span>
                    </div>
                  </div>

                  {/* Stock Status Badge */}
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      item.isAvailable
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800 animate-pulse'
                    }`}
                  >
                    {item.isAvailable ? 'In Stock' : "86'd"}
                  </span>
                </div>

                {/* Stock Toggle Action */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-500">
                    {item.isAvailable ? 'Currently ordering' : 'Ordering suspended'}
                  </span>

                  <button
                    onClick={() => handleToggleAvailability(item)}
                    disabled={isUpdating}
                    className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                      item.isAvailable
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                    }`}
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : item.isAvailable ? (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>86 This Item</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Set In Stock</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
