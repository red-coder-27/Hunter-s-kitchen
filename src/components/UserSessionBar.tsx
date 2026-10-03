import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Utensils, Bike, User, LogOut, Server } from 'lucide-react';
import { InfraStatusModal } from './auth/InfraStatusModal';

export const UserSessionBar: React.FC = () => {
  const { currentUser, currentRole, logout, isLoading } = useAuth();
  const [isInfraOpen, setIsInfraOpen] = useState(false);

  if (!currentUser) {
    return null;
  }

  const getRoleBadge = () => {
    switch (currentRole) {
      case 'ADMIN':
      case 'OWNER':
        return {
          label: 'Admin',
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
          color: 'bg-amber-100 text-amber-800 border-amber-300'
        };
      case 'STAFF':
        return {
          label: 'Staff',
          icon: <Utensils className="w-3.5 h-3.5" />,
          color: 'bg-blue-100 text-blue-800 border-blue-300'
        };
      case 'DELIVERY_PARTNER':
        return {
          label: 'Delivery Partner',
          icon: <Bike className="w-3.5 h-3.5" />,
          color: 'bg-orange-100 text-orange-800 border-orange-300'
        };
      case 'CUSTOMER':
      default:
        return {
          label: 'Customer',
          icon: <User className="w-3.5 h-3.5" />,
          color: 'bg-emerald-100 text-emerald-800 border-emerald-300'
        };
    }
  };

  const badge = getRoleBadge();

  return (
    <>
      <div className="bg-white/95 backdrop-blur-xs text-stone-800 text-xs py-1.5 px-3 flex items-center justify-between border-b border-stone-200 sticky top-0 z-50 shadow-2xs">
        {/* Identity & Status */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">Authenticated</span>
          </span>
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-stone-500 hidden sm:inline">Signed in as:</span>
            <span className="font-semibold text-stone-900 truncate">{currentUser.name}</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}
            >
              {badge.icon}
              <span className="truncate max-w-[140px]">{badge.label}</span>
            </span>
          </div>
        </div>

        {/* Infra & Logout Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsInfraOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200 cursor-pointer"
            title="Inspect Rate Limiting, Redis, Load Balancer & Security"
          >
            <Server className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden md:inline">Infra & Security</span>
          </button>
          <button
            onClick={() => logout()}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 transition-colors border border-red-200 cursor-pointer"
            title="Sign out of server session"
          >
            <LogOut className="w-3.5 h-3.5 text-red-600" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <InfraStatusModal isOpen={isInfraOpen} onClose={() => setIsInfraOpen(false)} />
    </>
  );
};
