import React from 'react';

/**
 * Shimmering Skeleton components matching the exact layout dimensions
 * of menu items, bestsellers, category chips, and review cards.
 */

export const CategoryChipSkeleton: React.FC = () => (
  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div
        key={i}
        className="h-8 w-24 bg-stone-200/80 animate-pulse rounded-xl shrink-0"
      />
    ))}
  </div>
);

export const BestsellerCardSkeleton: React.FC = () => (
  <div className="w-48 bg-white rounded-2xl border border-stone-200/80 p-2.5 shrink-0 shadow-2xs space-y-2.5 animate-pulse">
    {/* Image placeholder */}
    <div className="h-28 rounded-xl bg-stone-200/80 w-full relative overflow-hidden">
      <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-stone-300" />
    </div>
    
    {/* Title & description lines */}
    <div className="space-y-1.5">
      <div className="h-3.5 bg-stone-200/90 rounded-md w-3/4" />
      <div className="h-2.5 bg-stone-200/60 rounded-md w-full" />
    </div>

    {/* Footer price & button */}
    <div className="pt-2 flex items-center justify-between border-t border-stone-100">
      <div className="h-4 bg-stone-200/90 rounded-md w-12" />
      <div className="h-7 w-14 bg-stone-200/90 rounded-lg" />
    </div>
  </div>
);

export const MenuItemCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-stone-200/80 p-3 flex gap-3 shadow-2xs animate-pulse">
    {/* Image Thumbnail Skeleton */}
    <div className="w-24 h-24 rounded-xl bg-stone-200/80 shrink-0 relative overflow-hidden">
      <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-stone-300/80" />
    </div>

    {/* Details Skeleton */}
    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-2">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-stone-200/90 rounded-md w-3/5" />
          <div className="h-3 bg-amber-200/60 rounded-full w-10" />
        </div>
        <div className="h-3 bg-stone-200/60 rounded-md w-full" />
        <div className="h-2.5 bg-stone-200/50 rounded-md w-4/5" />
      </div>

      {/* Price & Add button */}
      <div className="flex items-center justify-between pt-1">
        <div className="h-5 bg-stone-200/90 rounded-md w-14" />
        <div className="h-7 w-16 bg-red-100/80 rounded-lg" />
      </div>
    </div>
  </div>
);

export const MenuListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, idx) => (
      <MenuItemCardSkeleton key={idx} />
    ))}
  </div>
);

export const ReviewCardSkeleton: React.FC = () => (
  <div className="bg-stone-50 border border-stone-200/70 rounded-2xl p-3.5 space-y-2.5 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-stone-200/80 shrink-0" />
        <div className="space-y-1">
          <div className="h-3 bg-stone-200/90 rounded-md w-24" />
          <div className="h-2 bg-stone-200/60 rounded-md w-16" />
        </div>
      </div>
      <div className="h-5 bg-amber-100 rounded-md w-10" />
    </div>
    <div className="h-10 bg-white rounded-xl border border-stone-200/50 p-2 space-y-1">
      <div className="h-2 bg-stone-200/70 rounded-md w-full" />
      <div className="h-2 bg-stone-200/50 rounded-md w-2/3" />
    </div>
  </div>
);

export const OwnerMenuItemSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-stone-200/80 p-3 flex gap-3 shadow-2xs animate-pulse">
    <div className="w-20 h-20 rounded-xl bg-stone-200/80 shrink-0" />
    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-2">
      <div className="space-y-1.5">
        <div className="h-4 bg-stone-200/90 rounded-md w-1/2" />
        <div className="h-3 bg-stone-200/60 rounded-md w-3/4" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-4 bg-stone-200/90 rounded-md w-16" />
        <div className="flex gap-1.5">
          <div className="w-7 h-7 bg-stone-200 rounded-lg" />
          <div className="w-7 h-7 bg-stone-200 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

export const OrderCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-2xs space-y-3 animate-pulse">
    <div className="flex items-center justify-between pb-2 border-b border-stone-100">
      <div className="space-y-1">
        <div className="h-4 bg-stone-200/90 rounded-md w-24" />
        <div className="h-2.5 bg-stone-200/60 rounded-md w-32" />
      </div>
      <div className="h-6 w-20 bg-stone-200/80 rounded-full" />
    </div>

    <div className="space-y-2">
      <div className="h-3 bg-stone-200/70 rounded-md w-3/4" />
      <div className="h-3 bg-stone-200/50 rounded-md w-1/2" />
    </div>

    <div className="pt-2 flex items-center justify-between border-t border-stone-100">
      <div className="h-4 bg-stone-200/90 rounded-md w-16" />
      <div className="h-8 w-24 bg-stone-200/80 rounded-xl" />
    </div>
  </div>
);

