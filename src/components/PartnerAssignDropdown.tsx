import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import {
  Bike,
  ChevronDown,
  Check,
  RotateCcw,
  Loader2,
  ArrowRightLeft,
  UserCheck
} from 'lucide-react';

interface PartnerAssignDropdownProps {
  orderId: string;
  currentPartnerId?: string;
  deliveryPartners: User[];
  isAssigning: boolean;
  onSelect: (orderId: string, partnerId: string) => void;
  variant?: 'assign' | 'reassign';
}

export const PartnerAssignDropdown: React.FC<PartnerAssignDropdownProps> = ({
  orderId,
  currentPartnerId,
  deliveryPartners,
  isAssigning,
  onSelect,
  variant = 'reassign'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectPartner = (partnerId: string) => {
    setIsOpen(false);
    onSelect(orderId, partnerId);
  };

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Trigger Button */}
      {variant === 'reassign' ? (
        <button
          type="button"
          disabled={isAssigning}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer select-none ${
            isOpen
              ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-stone-200 text-stone-700 hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-900 shadow-3xs'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Re-assign to another delivery driver"
        >
          {isAssigning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
              <span>Reassigning...</span>
            </>
          ) : (
            <>
              <ArrowRightLeft className="w-3 h-3 text-stone-400 shrink-0" />
              <span>Reassign</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 shrink-0 ${
                  isOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          disabled={isAssigning}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
            isOpen
              ? 'bg-blue-700 text-white border-blue-700 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-3xs'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title="Assign delivery partner"
        >
          {isAssigning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white shrink-0" />
              <span>Assigning...</span>
            </>
          ) : (
            <>
              <Bike className="w-3.5 h-3.5 text-blue-100 shrink-0" />
              <span>Assign Driver</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-blue-200 transition-transform duration-200 shrink-0 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </>
          )}
        </button>
      )}

      {/* Floating Menu Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-stone-200/90 shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-stone-50/80 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-black text-stone-700 uppercase tracking-wider">
              <Bike className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{variant === 'reassign' ? 'Reassign Driver' : 'Select Driver'}</span>
            </div>
            <span className="text-[10px] font-bold text-stone-500 bg-stone-200/70 px-2 py-0.5 rounded-full">
              {deliveryPartners.length} Active
            </span>
          </div>

          {/* Drivers List */}
          <div className="py-1 max-h-56 overflow-y-auto no-scrollbar divide-y divide-stone-50">
            {deliveryPartners.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500 font-medium">
                No active delivery partners online.
              </div>
            ) : (
              deliveryPartners.map((partner) => {
                const isCurrent = partner.id === currentPartnerId;
                const initials = partner.name
                  ? partner.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'DP';

                return (
                  <button
                    key={partner.id}
                    type="button"
                    disabled={isCurrent || isAssigning}
                    onClick={() => handleSelectPartner(partner.id)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2.5 transition-colors ${
                      isCurrent
                        ? 'bg-blue-50/60 cursor-default'
                        : 'hover:bg-blue-50/50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 border ${
                          isCurrent
                            ? 'bg-blue-600 text-white border-blue-600 shadow-3xs'
                            : 'bg-stone-100 text-stone-700 border-stone-200/80'
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`text-xs truncate ${
                            isCurrent ? 'font-extrabold text-blue-950' : 'font-bold text-stone-900'
                          }`}
                        >
                          {partner.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-medium">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>{partner.vehicleType || 'Bike'}</span>
                          {partner.phone && (
                            <span className="text-stone-400 truncate">• {partner.phone}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="shrink-0 px-2 py-0.5 text-[9px] font-black bg-blue-100 text-blue-800 rounded-full border border-blue-200 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5 stroke-[3]" /> Current
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100 transition-colors">
                        Assign
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Unassign / Return to Ready Action (for reassign mode) */}
          {variant === 'reassign' && (
            <div className="p-1.5 border-t border-stone-100 bg-stone-50/50">
              <button
                type="button"
                disabled={isAssigning}
                onClick={() => handleSelectPartner('__UNASSIGN__')}
                className="w-full px-2.5 py-1.5 rounded-xl text-left flex items-center gap-2 text-xs font-bold text-amber-700 hover:bg-amber-50 hover:text-amber-900 transition-colors cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-100/90 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-200 group-hover:text-amber-900 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-extrabold block text-[11px] leading-tight">
                    Return to Ready (Unassign)
                  </span>
                  <span className="text-[9px] text-stone-500 block leading-tight font-medium">
                    Move back to kitchen ready queue
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
