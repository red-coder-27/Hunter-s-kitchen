import React, { useState } from 'react';
import { Order, Review } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Star, Check, Sparkles, MessageSquare, Utensils, Bike, X, ThumbsUp } from 'lucide-react';

interface ReviewComponentProps {
  order: Order;
  onSuccess?: (review: Review) => void;
  onCancel?: () => void;
}

interface ItemRatingState {
  menuItemId: string;
  menuItemName: string;
  rating: number;
  comment: string;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor 😞',
  2: 'Fair 😐',
  3: 'Good 🙂',
  4: 'Very Good 😄',
  5: 'Excellent! 🌟'
};

export const StarRatingPicker: React.FC<{
  value: number;
  onChange: (val: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}> = ({ value, onChange, size = 'md', showLabel = true }) => {
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const activeVal = hoverVal !== null ? hoverVal : value;

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeVal;
          return (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverVal(star)}
              onMouseLeave={() => setHoverVal(null)}
              onClick={() => onChange(star)}
              className="p-0.5 text-amber-400 hover:scale-125 transition-transform focus:outline-none"
            >
              <Star
                className={`${starSizes[size]} ${
                  isFilled ? 'fill-amber-400 text-amber-500 drop-shadow-2xs' : 'text-stone-300 fill-stone-100'
                } transition-colors`}
              />
            </button>
          );
        })}
      </div>
      {showLabel && activeVal > 0 && (
        <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
          {RATING_LABELS[activeVal]}
        </span>
      )}
    </div>
  );
};

export const ReviewComponent: React.FC<ReviewComponentProps> = ({ order, onSuccess, onCancel }) => {
  const { currentUser } = useAuth();

  const [foodRating, setFoodRating] = useState<number>(5);
  const [deliveryRating, setDeliveryRating] = useState<number>(5);
  const [overallComment, setOverallComment] = useState<string>('');

  // Itemized ratings map
  const [itemRatings, setItemRatings] = useState<Record<string, ItemRatingState>>(() => {
    const initial: Record<string, ItemRatingState> = {};
    (order?.items || []).forEach((item) => {
      initial[item.menuItemId] = {
        menuItemId: item.menuItemId,
        menuItemName: item.name,
        rating: 5,
        comment: ''
      };
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleItemRatingChange = (menuItemId: string, rating: number) => {
    setItemRatings((prev) => ({
      ...prev,
      [menuItemId]: {
        ...prev[menuItemId],
        rating
      }
    }));
  };

  const handleItemCommentChange = (menuItemId: string, comment: string) => {
    setItemRatings((prev) => ({
      ...prev,
      [menuItemId]: {
        ...prev[menuItemId],
        comment
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSubmitting(true);

    try {
      // Calculate itemized ratings array
      const itemRatingsArray = (Object.values(itemRatings) as ItemRatingState[]).map((ir) => ({
        menuItemId: ir.menuItemId,
        menuItemName: ir.menuItemName,
        rating: ir.rating,
        comment: ir.comment.trim() || undefined
      }));

      // Calculate overall rating from items average and food rating
      const avgItemRating =
        itemRatingsArray.length > 0
          ? Math.round(itemRatingsArray.reduce((acc, curr) => acc + curr.rating, 0) / itemRatingsArray.length)
          : foodRating;

      const calculatedOverall = Math.round((avgItemRating + deliveryRating) / 2);

      const reviewPayload: Partial<Review> = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: currentUser.id,
        customerName: currentUser.name,
        foodRating: avgItemRating,
        deliveryRating,
        overallRating: calculatedOverall,
        comment: overallComment.trim() || undefined,
        itemRatings: itemRatingsArray
      };

      const createdReview = await apiService.submitReview(reviewPayload);

      setIsSuccess(true);
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(createdReview);
        }
      }, 1400);
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-3xl text-center space-y-4 max-w-lg mx-auto shadow-xl animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>
        <h3 className="text-xl font-black text-stone-900">Thank You for Your Feedback!</h3>
        <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
          Your item ratings and comments have been published to help fellow food lovers and guide our kitchen team!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xl overflow-hidden max-w-xl mx-auto">
      {/* Modal Header */}
      <div className="bg-stone-900 text-white p-5 flex items-center justify-between border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              Order #{order.orderNumber}
            </span>
            <h3 className="text-base font-black text-white">Rate Dishes & Order Experience</h3>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="text-stone-400 hover:text-white p-1.5 rounded-xl hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
        {/* Itemized Food Ratings Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
            <Utensils className="w-4 h-4 text-red-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-900">
              Rate Individual Dishes
            </h4>
          </div>

          <div className="space-y-4">
            {(order?.items || []).map((item) => {
              const itemState = itemRatings[item.menuItemId] || {
                rating: 5,
                comment: ''
              };

              return (
                <div
                  key={item.menuItemId}
                  className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-4 space-y-3 transition-all hover:border-amber-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="font-extrabold text-stone-900 text-sm">{item.name}</h5>
                      <span className="text-[11px] font-medium text-stone-500">
                        Qty: {item.quantity} • ₹{item.unitPrice} each
                      </span>
                    </div>

                    {/* Star Picker for Item */}
                    <StarRatingPicker
                      value={itemState.rating}
                      onChange={(r) => handleItemRatingChange(item.menuItemId, r)}
                      size="md"
                    />
                  </div>

                  {/* Optional Dish Feedback */}
                  <textarea
                    value={itemState.comment}
                    onChange={(e) => handleItemCommentChange(item.menuItemId, e.target.value)}
                    placeholder={`How was the ${item.name}? (e.g. Perfectly spiced, portion size...)`}
                    rows={2}
                    className="w-full p-2.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:ring-2 focus:ring-red-600 focus:outline-none transition-shadow"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery & Service Experience */}
        <div className="space-y-4 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
            <Bike className="w-4 h-4 text-sky-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-900">
              Delivery & Overall Service
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Food Temperature & Packaging</label>
              <StarRatingPicker value={foodRating} onChange={setFoodRating} size="sm" />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Delivery Speed & Partner</label>
              <StarRatingPicker value={deliveryRating} onChange={setDeliveryRating} size="sm" />
            </div>
          </div>

          {/* Overall Experience Comment */}
          <div>
            <label className="text-xs font-bold text-stone-800 block mb-1.5">Overall Order Feedback</label>
            <textarea
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              placeholder="Any additional feedback for the restaurant or delivery driver?"
              rows={3}
              className="w-full p-3 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-red-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Form Footer */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 active:scale-95 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all"
          >
            {isSubmitting ? (
              'Publishing Review...'
            ) : (
              <>
                <ThumbsUp className="w-4 h-4" /> Submit Dish Ratings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
