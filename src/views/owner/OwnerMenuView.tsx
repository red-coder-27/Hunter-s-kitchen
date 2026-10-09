import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, Category } from '../../types';
import { apiService } from '../../services/api';
import { OwnerMenuItemSkeleton } from '../../components/Skeletons';
import { DeleteMenuItemModal } from '../../components/DeleteMenuItemModal';
import { useNotification } from '../../context/NotificationContext';
import { Plus, Edit2, Trash2, Search, Flame, ToggleLeft, ToggleRight, Check, X } from 'lucide-react';

export const OwnerMenuView: React.FC = () => {
  const { addNotification } = useNotification();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // In-App Delete Confirmation Modal State
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<number>(200);
  const [discountPrice, setDiscountPrice] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isVeg, setIsVeg] = useState(false);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(20);
  const [isBestseller, setIsBestseller] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);

    // Validate type: png or jpeg (jpg)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setImageError('Invalid format. Only PNG or JPEG formats are allowed.');
      addNotification({
        title: 'Invalid Image Format',
        message: 'Only PNG and JPEG formats are allowed.',
        type: 'INFO'
      });
      return;
    }

    // Validate size: 5 MB max
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageError('File is too large. Maximum size is 5 MB.');
      addNotification({
        title: 'File Too Large',
        message: 'Maximum allowed image size is 5 MB.',
        type: 'INFO'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImageUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const loadMenu = async () => {
    try {
      const [cats, items] = await Promise.all([apiService.getCategories(), apiService.getMenu()]);
      setCategories(cats);
      setMenuItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setImageError(null);
    setName('');
    setCategoryId(categories[0]?.id || 'cat_biriyani');
    setPrice(200);
    setDiscountPrice(undefined);
    setDescription('');
    setImageUrl('https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80');
    setIsVeg(false);
    setPrepTimeMinutes(20);
    setIsBestseller(false);
    setShowItemModal(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setImageError(null);
    setName(item.name);
    setCategoryId(item.categoryId);
    setPrice(item.price);
    setDiscountPrice(item.discountPrice);
    setDescription(item.description);
    setImageUrl(item.imageUrl);
    setIsVeg(item.isVeg);
    setPrepTimeMinutes(item.prepTimeMinutes);
    setIsBestseller(!!item.isBestseller);
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const selectedCat = categories.find((c) => c.id === categoryId);
      const payload: Partial<MenuItem> = {
        name,
        categoryId,
        categoryName: selectedCat?.name || 'Main Menu',
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : undefined,
        description,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
        isVeg,
        isAvailable: true,
        prepTimeMinutes: Number(prepTimeMinutes),
        isBestseller
      };

      if (editingItem) {
        await apiService.updateMenuItem(editingItem.id, payload);
      } else {
        await apiService.createMenuItem(payload);
      }

      setShowItemModal(false);
      await loadMenu();
      addNotification({
        title: editingItem ? 'Dish Updated' : 'Dish Added',
        message: `"${name}" was successfully ${editingItem ? 'updated' : 'added to the menu'}.`,
        type: 'SUCCESS'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const nextAvailable = !item.isAvailable;
      await apiService.updateItemAvailability(item.id, nextAvailable);
      await loadMenu();
      addNotification({
        title: nextAvailable ? 'Dish In Stock' : 'Dish Out of Stock',
        message: `"${item.name}" marked as ${nextAvailable ? 'in stock' : 'out of stock'}.`,
        type: 'INFO'
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      const dishNameToDelete = deletingItem?.name || 'Dish';
      await apiService.deleteMenuItem(id);
      setDeletingItem(null);
      await loadMenu();
      addNotification({
        title: 'Dish Deleted',
        message: `"${dishNameToDelete}" was permanently removed from the menu.`,
        type: 'SUCCESS'
      });
    } catch (err: any) {
      console.error('Failed to delete item:', err);
      throw err;
    }
  };

  // Compute count of dishes per category in real time
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of menuItems) {
      counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
    }
    return counts;
  }, [menuItems]);

  const filteredItems = menuItems.filter((i) => {
    if (selectedCategory !== 'ALL' && i.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      return i.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="pb-28 md:pb-10 w-full max-w-7xl mx-auto px-0 py-3 sm:py-5 space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-stone-900">Menu Management</h2>
          <p className="text-xs text-stone-500">Edit prices, availability, & new dishes</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-3.5 py-2 rounded-xl bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-red-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Dish
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search menu items by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      {/* Categories Horizontal */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
              : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50'
          }`}
        >
          <span>All</span>
          <span
            className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full min-w-5 transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-white/20 text-white'
                : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200 group-hover:text-stone-900'
            }`}
          >
            {menuItems.length}
          </span>
        </button>
        {categories.map((cat) => {
          const count = categoryCounts[cat.id] || 0;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full min-w-5 transition-colors ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200 group-hover:text-stone-900'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {isLoading ? (
          <>
            <OwnerMenuItemSkeleton />
            <OwnerMenuItemSkeleton />
            <OwnerMenuItemSkeleton />
            <OwnerMenuItemSkeleton />
          </>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-stone-200">
            <p className="text-xs text-stone-500 font-medium">No dishes found matching your search.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl border p-3 flex gap-3 shadow-2xs transition-all ${
              item.isAvailable ? 'border-stone-200' : 'border-stone-200 opacity-60 bg-stone-50'
            }`}
          >
            <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />

            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-stone-900 truncate">{item.name}</h4>
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      item.isAvailable
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {item.isAvailable ? 'IN STOCK' : 'OUT OF STOCK'}
                  </button>
                </div>

                <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{item.description}</p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100">
                <span className="font-black text-xs text-stone-900">₹{item.discountPrice || item.price}</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="p-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingItem(item)}
                    className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                    title={`Delete ${item.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )))}
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-stone-900 text-sm">
                {editingItem ? 'Edit Dish Details' : 'Add New Menu Item'}
              </h3>
              <button onClick={() => setShowItemModal(false)}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700">Dish Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Special Chicken Biriyani"
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700">Price (₹)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Dish Image</label>
                <div className="flex gap-3 items-center bg-stone-50 p-2.5 rounded-xl border border-stone-150">
                  {imageUrl ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-stone-200 shrink-0 shadow-3xs">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-white rounded-xl"
                      >
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl border-2 border-dashed border-stone-300 bg-white flex items-center justify-center text-stone-400 shrink-0">
                      🖼️
                    </div>
                  )}

                  <div className="flex-1">
                    <label
                      htmlFor="dish-image-upload"
                      className="inline-flex items-center px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-extrabold text-[11px] cursor-pointer shadow-3xs transition-colors"
                    >
                      Choose Photo
                    </label>
                    <input
                      id="dish-image-upload"
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="text-[10px] text-stone-500 mt-0.5 leading-normal font-medium">
                      PNG or JPEG format only • Max 5 MB • Resolution: 900x900 pixels
                    </p>
                    {imageError && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1">
                        ⚠️ {imageError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-2">
                  <span className="text-[10px] font-bold text-stone-400 block">Or Paste Image URL</span>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full mt-1 p-2 border border-stone-300 rounded-xl bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-stone-50 rounded-xl">
                <span className="font-bold text-stone-700">Vegetarian?</span>
                <input
                  type="checkbox"
                  checked={isVeg}
                  onChange={(e) => setIsVeg(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-stone-50 rounded-xl">
                <span className="font-bold text-stone-700">Mark as Bestseller?</span>
                <input
                  type="checkbox"
                  checked={isBestseller}
                  onChange={(e) => setIsBestseller(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-red-700 text-white font-bold shadow-md"
                >
                  {isSaving ? 'Saving...' : 'Save Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      <DeleteMenuItemModal
        isOpen={!!deletingItem}
        item={deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
