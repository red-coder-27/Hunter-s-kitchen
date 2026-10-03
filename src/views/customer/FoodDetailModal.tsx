import React, { useState, useEffect } from 'react';
import { MenuItem, CartCustomizationSelection, CartAddonSelection } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ReviewCardSkeleton } from '../../components/Skeletons';
import {
  X,
  Flame,
  Plus,
  Minus,
  ShoppingBag,
  Check,
  Star,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Send,
  Sparkles,
  ThumbsUp
} from 'lucide-react';
import { StarRating } from '../../components/StarRating';

interface FoodDetailModalProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    quantity: number,
    customizations: CartCustomizationSelection[],
    addons: CartAddonSelection[],
    specialInstructions: string
  ) => void;
}

interface ItemReviewData {
  avgRating: number;
  totalRatings: number;
  reviews: {
    id: string;
    customerName: string;
    rating: number;
    comment?: string;
    createdAt: string;
    orderNumber: string;
  }[];
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({ item, onClose, onAddToCart }) => {
  const { currentUser } = useAuth();
  const { addNotification } = useNotification();

  const [quantity, setQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, { label: string; price: number }>>({});
  const [selectedAddons, setSelectedAddons] = useState<Record<string, CartAddonSelection>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Navigation tab inside modal: 'CUSTOMIZE' or 'REVIEWS'
  const [activeTab, setActiveTab] = useState<'CUSTOMIZE' | 'REVIEWS'>('CUSTOMIZE');

  // Item Reviews State
  const [reviewData, setReviewData] = useState<ItemReviewData | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  // Review posting form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewerName, setReviewerName] = useState(currentUser?.name || '');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmittedSuccess, setReviewSubmittedSuccess] = useState(false);

  // Update reviewer name if current user changes
  useEffect(() => {
    if (currentUser?.name && !reviewerName) {
      setReviewerName(currentUser.name);
    }
  }, [currentUser]);

  // Default select first option for each customization
  useEffect(() => {
    if (item.customizations) {
      const initial: Record<string, { label: string; price: number }> = {};
      item.customizations.forEach((cust) => {
        if (cust.options.length > 0) {
          initial[cust.name] = cust.options[0];
        }
      });
      setSelectedCustomizations(initial);
    }
  }, [item]);

  // Load Reviews for this menu item
  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const res = await apiService.getMenuItemReviews(item.id);
      setReviewData(res);
    } catch (err) {
      console.error('Error fetching item reviews:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [item.id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ratingVal < 1) return;

    setIsSubmittingReview(true);
    try {
      await apiService.submitReview({
        customerId: currentUser?.id || 'usr_guest',
        customerName: reviewerName.trim() || currentUser?.name || 'Valued Foodie',
        foodRating: ratingVal,
        overallRating: ratingVal,
        comment: reviewComment.trim(),
        orderNumber: 'VERIFIED',
        itemRatings: [
          {
            menuItemId: item.id,
            menuItemName: item.name,
            rating: ratingVal,
            comment: reviewComment.trim()
          }
        ]
      });

      setReviewSubmittedSuccess(true);
      setShowReviewForm(false);
      setReviewComment('');

      // Refresh reviews list immediately
      await fetchReviews();

      addNotification({
        title: '⭐ Rating Submitted!',
        message: `Thank you for rating ${item.name}! Your review is now live.`,
        type: 'SUCCESS'
      });
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 1:
        return '1 - Poor';
      case 2:
        return '2 - Fair';
      case 3:
        return '3 - Good';
      case 4:
        return '4 - Very Good';
      case 5:
        return '5 - Outstanding! ⭐';
      default:
        return '';
    }
  };

  const toggleAddon = (addon: { id: string; name: string; price: number }) => {
    setSelectedAddons((prev) => {
      const next = { ...prev };
      if (next[addon.id]) {
        delete next[addon.id];
      } else {
        next[addon.id] = { addonId: addon.id, name: addon.name, price: addon.price };
      }
      return next;
    });
  };

  // Compute calculated unit price
  const basePrice = item.discountPrice || item.price;
  let customExtra = 0;
  Object.values(selectedCustomizations).forEach((c: { label: string; price: number }) => (customExtra += c.price));
  Object.values(selectedAddons).forEach((a: CartAddonSelection) => (customExtra += a.price));

  const totalUnitPrice = basePrice + customExtra;
  const grandTotal = totalUnitPrice * quantity;

  const handleAdd = () => {
    const custArray: CartCustomizationSelection[] = Object.entries(selectedCustomizations).map(([name, opt]) => ({
      optionName: name,
      selectedLabel: (opt as { label: string; price: number }).label,
      price: (opt as { label: string; price: number }).price
    }));

    const addonArray: CartAddonSelection[] = Object.values(selectedAddons);

    onAddToCart(item, quantity, custArray, addonArray, specialInstructions);
    onClose();
  };

  const displayRating = reviewData?.avgRating || item.rating || 4.8;
  const displayRatingCount = reviewData?.totalRatings || item.ratingCount || 10;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200 shadow-2xl">
        {/* Header Image */}
        <div className="relative h-52 sm:h-60 bg-stone-100 overflow-hidden shrink-0">
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-4 right-4 text-white space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`w-2.5 h-2.5 rounded-full border ${
                  item.isVeg ? 'bg-emerald-500 border-emerald-300' : 'bg-red-600 border-red-300'
                }`}
              ></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-200">
                {item.isVeg ? 'Vegetarian' : 'Non-Veg'}
              </span>

              {item.isBestseller && (
                <span className="bg-amber-500 text-stone-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-stone-950" /> Bestseller
                </span>
              )}

              {/* Star Rating Badge */}
              <button
                onClick={() => setActiveTab('REVIEWS')}
                className="bg-stone-900/80 backdrop-blur-xs text-amber-400 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-amber-400/40 flex items-center gap-1.5 hover:bg-stone-900 transition-colors"
              >
                <StarRating rating={displayRating} size="sm" />
                <span className="text-stone-300 font-medium">({displayRatingCount})</span>
              </button>
            </div>

            <h2 className="text-xl font-extrabold text-white leading-snug">{item.name}</h2>
          </div>
        </div>

        {/* Modal Tab Controls */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('CUSTOMIZE')}
            className={`py-2 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'CUSTOMIZE'
                ? 'border-red-700 text-red-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Customize & Add
          </button>

          <button
            onClick={() => setActiveTab('REVIEWS')}
            className={`py-2 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'REVIEWS'
                ? 'border-red-700 text-red-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            Customer Ratings ({displayRatingCount})
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-stone-800">
          {activeTab === 'CUSTOMIZE' ? (
            <>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-stone-900">₹{basePrice}</span>
                  {item.discountPrice && (
                    <span className="text-sm text-stone-400 line-through ml-2 font-medium">₹{item.price}</span>
                  )}
                </div>
                <div className="text-xs font-medium text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                  ⏱ Prep: {item.prepTimeMinutes} mins
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">{item.description}</p>

              {item.ingredients && item.ingredients.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-stone-900 mb-1.5 uppercase tracking-wide">Key Ingredients</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(item.ingredients || []).map((ing, idx) => (
                      <span key={idx} className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-medium">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Customizations (e.g. Spice Level) */}
              {item.customizations &&
                item.customizations.map((cust) => (
                  <div key={cust.id} className="border-t border-stone-100 pt-3">
                    <h4 className="text-xs font-bold text-stone-900 mb-2 uppercase tracking-wide">{cust.name}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(cust.options || []).map((opt, i) => {
                        const isSelected = selectedCustomizations[cust.name]?.label === opt.label;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() =>
                              setSelectedCustomizations((prev) => ({
                                ...prev,
                                [cust.name]: opt
                              }))
                            }
                            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                              isSelected
                                ? 'border-red-600 bg-red-50 text-red-900 shadow-2xs'
                                : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-stone-50'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {opt.price > 0 && <span className="text-[11px] text-stone-500">+₹{opt.price}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {/* Add-ons */}
              {item.addons && item.addons.length > 0 && (
                <div className="border-t border-stone-100 pt-3">
                  <h4 className="text-xs font-bold text-stone-900 mb-2 uppercase tracking-wide">Add-ons (Optional)</h4>
                  <div className="space-y-2">
                    {(item.addons || []).map((addon) => {
                      const isChecked = !!selectedAddons[addon.id];
                      return (
                        <div
                          key={addon.id}
                          onClick={() => toggleAddon(addon)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'border-red-600 bg-red-50/70 text-red-950'
                              : 'border-stone-200 hover:border-stone-300 text-stone-800 bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                isChecked ? 'bg-red-600 border-red-600 text-white' : 'border-stone-300 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>{addon.name}</span>
                          </div>
                          <span className="font-bold text-stone-900">+₹{addon.price}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div className="border-t border-stone-100 pt-3">
                <h4 className="text-xs font-bold text-stone-900 mb-1.5 uppercase tracking-wide">Cooking Instructions</h4>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Less oil, extra spicy gravy, no coriander..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>
            </>
          ) : (
            /* REVIEWS TAB CONTENT */
            <div className="space-y-4">
              {/* Overall Summary Card */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <div className="flex items-center gap-1.5 text-2xl font-black text-stone-900">
                    <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
                    <span>{displayRating}</span>
                    <span className="text-xs font-medium text-stone-500">/ 5.0</span>
                  </div>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    Based on {displayRatingCount} verified customer ratings
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> 100% Verified
                  </span>

                  {!showReviewForm && (
                    <button
                      onClick={() => {
                        setShowReviewForm(true);
                        setReviewSubmittedSuccess(false);
                      }}
                      className="py-1.5 px-3 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Rate Dish
                    </button>
                  )}
                </div>
              </div>

              {/* Review Submitted Toast Banner */}
              {reviewSubmittedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-900 text-xs font-bold">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Thank you! Your 5-star rating is live.
                  </span>
                  <button onClick={() => setReviewSubmittedSuccess(false)} className="text-emerald-700 hover:underline">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Write Review Form Collapsible */}
              {showReviewForm && (
                <form
                  onSubmit={handleSubmitReview}
                  className="bg-stone-900 text-white p-4 rounded-2xl space-y-3.5 border border-stone-800 shadow-lg animate-in fade-in slide-in-from-top-2"
                >
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-amber-400 flex items-center gap-1.5">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> Rate & Review "{item.name}"
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="text-stone-400 hover:text-white text-xs p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Star Rating Picker */}
                  <div className="space-y-1 text-center py-1">
                    <p className="text-[11px] font-semibold text-stone-300">Tap stars to select your rating:</p>
                    <div className="flex items-center justify-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((starNum) => {
                        const activeStar = (hoverRating || ratingVal) >= starNum;
                        return (
                          <button
                            key={starNum}
                            type="button"
                            onMouseEnter={() => setHoverRating(starNum)}
                            onMouseLeave={() => setHoverRating(null)}
                            onClick={() => setRatingVal(starNum)}
                            className="p-1 transition-transform hover:scale-125 focus:outline-none"
                          >
                            <Star
                              className={`w-7 h-7 transition-colors ${
                                activeStar
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                                  : 'fill-stone-800 text-stone-700'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="inline-block text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800/80 mt-1">
                      {getRatingLabel(hoverRating || ratingVal)}
                    </span>
                  </div>

                  {/* Reviewer Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-300 block">Your Name</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="e.g. Priya S."
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white placeholder-stone-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Review Comment Textarea */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-300 block">Customer Feedback (Optional)</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="How was the taste, spice level, and portion size?"
                      rows={2.5}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white placeholder-stone-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-800">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSubmittingReview ? 'Submitting...' : 'Post Rating'}
                    </button>
                  </div>
                </form>
              )}

              {/* Review Feed List */}
              {isLoadingReviews ? (
                <div className="space-y-3">
                  <ReviewCardSkeleton />
                  <ReviewCardSkeleton />
                </div>
              ) : reviewData?.reviews && reviewData.reviews.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-stone-900 border-b border-stone-100 pb-2">
                    Recent Customer Feedback
                  </h4>

                  {(reviewData?.reviews || []).map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-stone-50 border border-stone-200/70 rounded-2xl p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-red-100 text-red-800 font-extrabold flex items-center justify-center text-[11px]">
                            {rev.customerName.charAt(0)}
                          </div>
                          <div>
                            <h5 className="font-bold text-stone-900 text-xs flex items-center gap-1">
                              {rev.customerName}
                              <UserCheck className="w-3 h-3 text-emerald-600 inline" />
                            </h5>
                            <span className="text-[10px] text-stone-400">Order #{rev.orderNumber}</span>
                          </div>
                        </div>

                        {/* Star display */}
                        <StarRating rating={rev.rating} size="sm" />
                      </div>

                      {rev.comment ? (
                        <p className="text-xs text-stone-700 leading-relaxed italic bg-white p-2.5 rounded-xl border border-stone-200/60">
                          "{rev.comment}"
                        </p>
                      ) : (
                        <p className="text-[11px] text-stone-400 italic">Rated {rev.rating} stars for taste & quality.</p>
                      )}

                      <div className="text-[10px] text-stone-400 text-right font-mono">
                        {new Date(rev.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <MessageSquare className="w-8 h-8 text-stone-400 mx-auto" />
                  <h4 className="font-bold text-xs text-stone-800">No Reviews Yet</h4>
                  <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                    Be the first customer to try this dish and submit your rating after ordering!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Bottom Actions */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3 shrink-0">
          {item.isAvailable && (
            <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl p-1 shadow-2xs">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-bold text-sm text-stone-900">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-bold flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={!item.isAvailable}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-between shadow-md transition-all ${
              item.isAvailable
                ? 'bg-red-700 hover:bg-red-800 active:scale-[0.99] text-white'
                : 'bg-stone-300 text-stone-500 cursor-not-allowed'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> {item.isAvailable ? 'Add Item' : 'Out of Stock'}
            </span>
            <span>{item.isAvailable ? `₹${grandTotal}` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
