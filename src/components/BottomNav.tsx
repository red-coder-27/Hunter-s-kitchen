import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  Home,
  Search,
  ShoppingBag,
  User,
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  BarChart3,
  Bike,
  ClipboardList,
  CheckSquare,
  Package
} from 'lucide-react';

interface BottomNavProps {
  currentTab?: string;
  activeTab?: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, activeTab, onTabChange }) => {
  const { currentUser, currentRole, settings } = useAuth();
  const { totalItemCount } = useCart();

  const selectedTab = activeTab || currentTab || 'home';

  // Define tabs based on role
  let tabs: { id: string; label: string; icon: React.ReactNode; badge?: number }[] = [];

  if (currentRole === 'CUSTOMER') {
    tabs = [
      { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
      ...(settings?.isOpen ? [{ id: 'search', label: 'Search', icon: <Search className="w-5 h-5" /> }] : []),
      { id: 'cart', label: 'Cart', icon: <ShoppingBag className="w-5 h-5" />, badge: totalItemCount },
      { id: 'orders', label: 'Orders', icon: <ClipboardList className="w-5 h-5" /> },
      { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> }
    ];
  } else if (currentRole === 'OWNER') {
    tabs = [
      { id: 'owner_dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { id: 'owner_orders', label: 'Orders', icon: <ClipboardList className="w-5 h-5" /> },
      { id: 'owner_menu', label: 'Menu', icon: <UtensilsCrossed className="w-5 h-5" /> },
      { id: 'owner_staff', label: 'Staff', icon: <Users className="w-5 h-5" /> },
      { id: 'owner_analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
      { id: 'owner_profile', label: 'Profile', icon: <User className="w-5 h-5" /> }
    ];
  } else if (currentRole === 'STAFF') {
    const staffRole = currentUser?.staffRole || 'GENERAL_MANAGER';
    const isManager = staffRole === 'KITCHEN_MANAGER' || staffRole === 'GENERAL_MANAGER';
    const canAccessOrderDesk = isManager || staffRole === 'ORDER_BILLER' || staffRole === 'FRONT_DESK';
    const canAccessChefStation = isManager || staffRole === 'KITCHEN_CHEF' || staffRole === 'HEAD_CHEF' || staffRole === 'LINE_COOK';
    const canAccessDispatch = isManager || staffRole === 'STORE_DISPATCHER';
    const canAccessInventory = isManager || staffRole === 'KITCHEN_CHEF' || staffRole === 'HEAD_CHEF';

    tabs = [
      { id: 'staff_dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> }
    ];

    if (canAccessOrderDesk) {
      tabs.push({ id: 'staff_order_desk', label: 'Orders', icon: <ClipboardList className="w-5 h-5" /> });
    }
    if (canAccessChefStation) {
      tabs.push({ id: 'staff_chef_station', label: 'Kitchen', icon: <UtensilsCrossed className="w-5 h-5" /> });
    }
    if (canAccessDispatch) {
      tabs.push({ id: 'staff_dispatch_hub', label: 'Dispatch', icon: <Bike className="w-5 h-5" /> });
    }
    if (canAccessInventory) {
      tabs.push({ id: 'staff_inventory', label: 'Stock', icon: <Package className="w-5 h-5" /> });
    }

    tabs.push({ id: 'staff_profile', label: 'Profile', icon: <User className="w-5 h-5" /> });
  } else if (currentRole === 'DELIVERY_PARTNER') {
    tabs = [
      { id: 'delivery_dashboard', label: 'Active Runs', icon: <Bike className="w-5 h-5" /> },
      { id: 'delivery_history', label: 'Completed', icon: <CheckSquare className="w-5 h-5" /> },
      { id: 'delivery_profile', label: 'Profile', icon: <User className="w-5 h-5" /> }
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50 shadow-lg md:hidden">
      <div className="flex items-center justify-around max-w-2xl mx-auto h-14 px-2">
        {tabs.map((tab) => {
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative ${
                isActive ? 'text-red-700 font-bold' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">{tab.label}</span>
              {isActive && <div className="w-1 h-1 rounded-full bg-red-600 mt-0.5"></div>}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
