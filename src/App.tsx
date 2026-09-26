import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { MenuItem, Order } from './types';

// Components & Auth
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { FloatingCartBar } from './components/FloatingCartBar';
import { LoginPage } from './components/auth/LoginPage';
import { LoginSuccessAnimation } from './components/auth/LoginSuccessAnimation';
import { Loader2, Flame } from 'lucide-react';

// Customer Views
import { CustomerHome } from './views/customer/CustomerHome';
import { CustomerSearch } from './views/customer/CustomerSearch';
import { FoodDetailModal } from './views/customer/FoodDetailModal';
import { CartView } from './views/customer/CartView';
import { CheckoutView } from './views/customer/CheckoutView';
import { OrderTrackingView } from './views/customer/OrderTrackingView';
import { CustomerOrderHistory } from './views/customer/CustomerOrderHistory';
import { CustomerProfile } from './views/customer/CustomerProfile';

// Owner Views
import { OwnerDashboard } from './views/owner/OwnerDashboard';
import { OwnerOrdersView } from './views/owner/OwnerOrdersView';
import { OwnerMenuView } from './views/owner/OwnerMenuView';
import { OwnerStaffView } from './views/owner/OwnerStaffView';
import { OwnerAnalyticsView } from './views/owner/OwnerAnalyticsView';
import { OwnerSettingsView } from './views/owner/OwnerSettingsView';
import { OwnerProfileView } from './views/owner/OwnerProfileView';

// Staff & Delivery Views
import { StaffDashboard } from './views/staff/StaffDashboard';
import { DeliveryDashboard } from './views/delivery/DeliveryDashboard';
import { DeliveryHistoryView } from './views/delivery/DeliveryHistoryView';
import { DeliveryProfileView } from './views/delivery/DeliveryProfileView';

export default function App() {
  const {
    currentUser,
    currentRole,
    isAuthenticated,
    isLoading,
    settings,
    loginSuccessUser,
    setLoginSuccessUser
  } = useAuth();
  const { addToCart, isAddressModalOpen } = useCart();

  // Navigation State
  const [currentTab, setCurrentTab] = useState('home');
  const [selectedFoodItem, setSelectedFoodItem] = useState<MenuItem | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [isCheckoutFlow, setIsCheckoutFlow] = useState(false);
  const [isAddressSelection, setIsAddressSelection] = useState(false);

  // Route automatically to role home tab upon authenticating or role switch
  useEffect(() => {
    setTrackingOrderId(null);
    setSelectedFoodItem(null);
    if (!currentUser) return;

    if (currentUser.role === 'OWNER' || currentUser.role === 'ADMIN') {
      setCurrentTab('owner_dashboard');
    } else if (currentUser.role === 'STAFF') {
      setCurrentTab('staff_dashboard');
    } else if (currentUser.role === 'DELIVERY_PARTNER') {
      setCurrentTab('delivery_dashboard');
    } else {
      setCurrentTab('home');
    }
  }, [currentUser?.id, currentUser?.role]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-stone-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 shadow-md shadow-red-500/20 mb-4 animate-pulse">
          <Flame className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold font-serif text-stone-900">Hunter's Kitchen</h2>
        <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
          <span>Verifying session security...</span>
        </p>
      </div>
    );
  }

  // Unauthenticated -> Show Production Login Page
  if (!isAuthenticated || !currentUser) {
    return <LoginPage />;
  }

  // Post-Login Success Transition (2.4s crisp professional transition)
  if (loginSuccessUser) {
    return (
      <LoginSuccessAnimation
        user={loginSuccessUser}
        onComplete={() => setLoginSuccessUser(null)}
        durationMs={2400}
      />
    );
  }

  const renderContent = () => {
    // ----------------------------------------------------------------------
    // CUSTOMER ROLE VIEWS
    // ----------------------------------------------------------------------
    if (currentRole === 'CUSTOMER') {
      if (trackingOrderId) {
        return (
          <OrderTrackingView
            orderId={trackingOrderId}
            onBack={() => setTrackingOrderId(null)}
          />
        );
      }

      switch (currentTab) {
        case 'home':
          return (
            <CustomerHome
              currentTab={currentTab}
              onNavigateToCart={() => setCurrentTab('cart')}
              onNavigateToSearch={() => setCurrentTab('search')}
            />
          );
        case 'search':
          if (settings && !settings.isOpen) {
            return (
              <CustomerHome
                currentTab={currentTab}
                onNavigateToCart={() => setCurrentTab('cart')}
                onNavigateToSearch={() => setCurrentTab('search')}
              />
            );
          }
          return (
            <CustomerSearch
              onBack={() => setCurrentTab('home')}
              onNavigateToCart={() => setCurrentTab('cart')}
            />
          );
        case 'cart':
          return (
            <CartView
              onProceedToCheckout={() => setCurrentTab('checkout')}
              onBrowseMenu={() => setCurrentTab('home')}
            />
          );
        case 'checkout':
          return (
            <CheckoutView
              onBackToCart={() => {
                setIsCheckoutFlow(false);
                setCurrentTab('cart');
              }}
              onOrderSuccess={(order: Order) => {
                setIsCheckoutFlow(false);
                setTrackingOrderId(order.id);
                setCurrentTab('orders');
              }}
              onCheckoutFlowChange={(isFlow: boolean) => setIsCheckoutFlow(isFlow)}
              onAddressSelectionChange={(isAddress: boolean) => setIsAddressSelection(isAddress)}
            />
          );
        case 'orders':
          return (
            <CustomerOrderHistory
              onSelectOrderToTrack={(orderId) => setTrackingOrderId(orderId)}
              onNavigateToCart={() => setCurrentTab('cart')}
            />
          );
        case 'profile':
          return <CustomerProfile />;
        default:
          return (
            <CustomerHome
              onNavigateToCart={() => setCurrentTab('cart')}
              onNavigateToSearch={() => setCurrentTab('search')}
            />
          );
      }
    }

    // ----------------------------------------------------------------------
    // OWNER & ADMIN ROLE VIEWS
    // ----------------------------------------------------------------------
    if (currentRole === 'OWNER' || currentRole === 'ADMIN') {
      switch (currentTab) {
        case 'owner_dashboard':
          return (
            <OwnerDashboard
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onSelectOrder={(orderId) => setCurrentTab('owner_orders')}
            />
          );
        case 'owner_orders':
          return <OwnerOrdersView />;
        case 'owner_menu':
          return <OwnerMenuView />;
        case 'owner_staff':
          return <OwnerStaffView />;
        case 'owner_analytics':
          return <OwnerAnalyticsView />;
        case 'owner_profile':
        case 'owner_settings':
          return <OwnerProfileView />;
        default:
          return (
            <OwnerDashboard
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onSelectOrder={(orderId) => setCurrentTab('owner_orders')}
            />
          );
      }
    }

    // ----------------------------------------------------------------------
    // STAFF ROLE VIEWS
    // ----------------------------------------------------------------------
    if (currentRole === 'STAFF') {
      return (
        <StaffDashboard
          activeTab={currentTab}
          onNavigateTab={(tab) => setCurrentTab(tab)}
        />
      );
    }

    // ----------------------------------------------------------------------
    // DELIVERY PARTNER ROLE VIEWS
    // ----------------------------------------------------------------------
    if (currentRole === 'DELIVERY_PARTNER') {
      switch (currentTab) {
        case 'delivery_dashboard':
          return <DeliveryDashboard />;
        case 'delivery_history':
          return <DeliveryHistoryView />;
        case 'delivery_profile':
          return <DeliveryProfileView />;
        default:
          return <DeliveryDashboard />;
      }
    }

    return (
      <CustomerHome
        onNavigateToCart={() => setCurrentTab('cart')}
        onNavigateToSearch={() => setCurrentTab('search')}
      />
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 antialiased selection:bg-red-700 selection:text-white">
      {/* Top Navbar */}
      {!(currentRole === 'CUSTOMER' && (isAddressSelection || isCheckoutFlow || trackingOrderId)) && (
        <Navbar 
          currentTab={currentTab}
          onTabChange={(tab) => {
            setTrackingOrderId(null);
            setCurrentTab(tab);
          }}
          onCartClick={() => { 
            setTrackingOrderId(null); 
            setCurrentTab('cart'); 
          }} 
        />
      )}

      {/* Main View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-20 md:pb-8">
        {renderContent()}
      </main>

      {/* Food Customization Modal for Customer */}
      {selectedFoodItem && (
        <FoodDetailModal
          item={selectedFoodItem}
          onClose={() => setSelectedFoodItem(null)}
          onAddToCart={(item, qty, customizations, addons, instructions) => {
            addToCart(item, qty, customizations, addons, instructions);
            setSelectedFoodItem(null);
          }}
        />
      )}

      {/* Customer Floating Bottom Cart Bar */}
      {currentRole === 'CUSTOMER' &&
        currentTab !== 'cart' &&
        currentTab !== 'checkout' &&
        !trackingOrderId &&
        !isCheckoutFlow &&
        !isAddressSelection &&
        !isAddressModalOpen && (
          <FloatingCartBar onNavigateToCart={() => setCurrentTab('cart')} />
        )}

      {/* Mobile Bottom Navigation */}
      {!(currentRole === 'CUSTOMER' && (isAddressSelection || isCheckoutFlow || trackingOrderId)) && (
        <BottomNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            setTrackingOrderId(null);
            setCurrentTab(tab);
          }}
        />
      )}
    </div>
  );
}
