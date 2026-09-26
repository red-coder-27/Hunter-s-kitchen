import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import { Address } from '../types';
import { DeleteAddressModal } from './DeleteAddressModal';
import { 
  MapPin, 
  Bell, 
  Search, 
  ChevronDown, 
  Check, 
  Plus, 
  Navigation, 
  Crosshair, 
  Loader2, 
  Trash2, 
  Edit2, 
  LogOut, 
  User as UserIcon,
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Users,
  BarChart3,
  Bike,
  CheckSquare,
  Home,
  ShoppingBag,
  Package
} from 'lucide-react';

interface NavbarProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  onCartClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTab,
  onTabChange,
  onSearchClick, 
  onNotificationsClick, 
  onCartClick 
}) => {
  const { settings, currentRole, currentUser, logout } = useAuth();
  const { 
    selectedAddress, 
    savedAddresses, 
    setSelectedAddress, 
    saveNewAddress, 
    updateAddress, 
    deleteAddress,
    isAddressModalOpen,
    setIsAddressModalOpen,
    totalItemCount
  } = useCart();
  const { unreadCount } = useNotification();
  const showAddressModal = isAddressModalOpen;
  const setShowAddressModal = setIsAddressModalOpen;
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deletingAddrNav, setDeletingAddrNav] = useState<Address | null>(null);

  const [newDoor, setNewDoor] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newCoordinates, setNewCoordinates] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [newType, setNewType] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');

  const handleStartAddNew = () => {
    setEditingAddressId(null);
    setNewDoor('');
    setNewStreet('');
    setNewArea('');
    setNewCoordinates('');
    setNewType('HOME');
    setShowNewAddressForm(true);
  };

  const handleStartAddViaLocation = () => {
    setEditingAddressId(null);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setNewDoor('');
      setNewStreet('Greenways Road, Sector 3');
      setNewArea('Race Course');
      setNewCoordinates('11.0045, 76.9612');
      setNewType('HOME');
      setShowNewAddressForm(true);
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setNewCoordinates(coordsStr);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'HuntersKitchenApp/1.0'
              }
            }
          );
          if (!response.ok) throw new Error('Geocoding error');
          const data = await response.json();
          if (data && data.address) {
            const addr = data.address;
            setNewDoor(addr.house_number || addr.building || '');
            setNewStreet(addr.road || addr.pedestrian || addr.cycleway || addr.footway || addr.path || addr.suburb || addr.neighbourhood || 'Main Road');
            setNewArea(addr.suburb || addr.neighbourhood || addr.city_district || addr.residential || addr.village || addr.quarter || 'Central District');
          } else {
            setNewDoor('');
            setNewStreet('Avinashi Road, Peelamedu');
            setNewArea('Peelamedu');
          }
        } catch (err) {
          console.warn('Reverse geocoding failed, falling back:', err);
          setNewDoor('');
          setNewStreet('Avinashi Road, Peelamedu');
          setNewArea('Peelamedu');
        } finally {
          setNewType('HOME');
          setIsLocating(false);
          setShowNewAddressForm(true);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setNewDoor('');
        setNewStreet('Greenways Road, Sector 3');
        setNewArea('Race Course');
        setNewCoordinates('11.0045, 76.9612');
        setNewType('HOME');
        setIsLocating(false);
        setShowNewAddressForm(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleStartEdit = (addr: any) => {
    setEditingAddressId(addr.id);
    setNewDoor(addr.doorNo || '');
    setNewStreet(addr.street || '');
    setNewArea(addr.area || '');
    setNewCoordinates(addr.coordinates || '');
    setNewType(addr.type || 'HOME');
    setShowNewAddressForm(true);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setNewCoordinates(coordsStr);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'Accept-Language': 'en',
                'User-Agent': 'HuntersKitchenApp/1.0'
              }
            }
          );
          if (!response.ok) throw new Error('Geocoding error');
          const data = await response.json();
          if (data && data.address) {
            const addr = data.address;
            setNewDoor(addr.house_number || addr.building || '');
            setNewStreet(addr.road || addr.pedestrian || addr.cycleway || addr.footway || addr.path || addr.suburb || addr.neighbourhood || 'Main Road');
            setNewArea(addr.suburb || addr.neighbourhood || addr.city_district || addr.residential || addr.village || addr.quarter || 'Central District');
          }
        } catch (err) {
          console.warn('Reverse geocoding failed:', err);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setNewCoordinates('11.0168, 76.9558');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreet || !newArea) return;
    try {
      const payload = {
        doorNo: newDoor || '101',
        street: newStreet,
        area: newArea,
        city: 'Coimbatore',
        pincode: '641018',
        type: newType,
        name: 'Saved Address',
        phone: '+91 98765 00000',
        coordinates: newCoordinates || undefined,
        isDefault: true
      };

      if (editingAddressId) {
        await updateAddress(editingAddressId, payload);
      } else {
        await saveNewAddress(payload);
      }

      setShowNewAddressForm(false);
      setEditingAddressId(null);
      setShowAddressModal(false);
      setNewDoor('');
      setNewStreet('');
      setNewArea('');
      setNewCoordinates('');
    } catch (err) {
      console.error(err);
    }
  };

  // Define desktop tabs based on role
  const desktopTabs: { id: string; label: string; icon: React.ReactNode; badge?: number }[] = [];

  if (currentRole === 'CUSTOMER') {
    desktopTabs.push(
      { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
      ...(settings?.isOpen ? [{ id: 'search', label: 'Menu', icon: <UtensilsCrossed className="w-4 h-4" /> }] : []),
      { id: 'orders', label: 'My Orders', icon: <ClipboardList className="w-4 h-4" /> },
      { id: 'cart', label: 'Cart', icon: <ShoppingBag className="w-4 h-4" />, badge: totalItemCount },
      { id: 'profile', label: 'Profile', icon: <UserIcon className="w-4 h-4" /> }
    );
  } else if (currentRole === 'OWNER') {
    desktopTabs.push(
      { id: 'owner_dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'owner_orders', label: 'Live Orders', icon: <ClipboardList className="w-4 h-4" /> },
      { id: 'owner_menu', label: 'Menu', icon: <UtensilsCrossed className="w-4 h-4" /> },
      { id: 'owner_staff', label: 'Staff & Fleet', icon: <Users className="w-4 h-4" /> },
      { id: 'owner_analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'owner_profile', label: 'Store & Profile', icon: <UserIcon className="w-4 h-4" /> }
    );
  } else if (currentRole === 'STAFF') {
    const staffRole = currentUser?.staffRole || 'GENERAL_MANAGER';
    const isManager = staffRole === 'KITCHEN_MANAGER' || staffRole === 'GENERAL_MANAGER';
    const canAccessOrderDesk = isManager || staffRole === 'ORDER_BILLER' || staffRole === 'FRONT_DESK';
    const canAccessChefStation = isManager || staffRole === 'KITCHEN_CHEF' || staffRole === 'HEAD_CHEF' || staffRole === 'LINE_COOK';
    const canAccessDispatch = isManager || staffRole === 'STORE_DISPATCHER';
    const canAccessInventory = isManager || staffRole === 'KITCHEN_CHEF' || staffRole === 'HEAD_CHEF';

    desktopTabs.push(
      { id: 'staff_dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }
    );

    if (canAccessOrderDesk) {
      desktopTabs.push({ id: 'staff_order_desk', label: 'Order Terminal', icon: <ClipboardList className="w-4 h-4" /> });
    }
    if (canAccessChefStation) {
      desktopTabs.push({ id: 'staff_chef_station', label: 'Chef Station', icon: <UtensilsCrossed className="w-4 h-4" /> });
    }
    if (canAccessDispatch) {
      desktopTabs.push({ id: 'staff_dispatch_hub', label: 'Dispatch Hub', icon: <Bike className="w-4 h-4" /> });
    }
    if (canAccessInventory) {
      desktopTabs.push({ id: 'staff_inventory', label: 'Menu & Stock', icon: <Package className="w-4 h-4" /> });
    }

    desktopTabs.push({ id: 'staff_profile', label: 'Profile', icon: <UserIcon className="w-4 h-4" /> });
  } else if (currentRole === 'DELIVERY_PARTNER') {
    desktopTabs.push(
      { id: 'delivery_dashboard', label: 'Active Deliveries', icon: <Bike className="w-4 h-4" /> },
      { id: 'delivery_history', label: 'History', icon: <CheckSquare className="w-4 h-4" /> },
      { id: 'delivery_profile', label: 'Profile', icon: <UserIcon className="w-4 h-4" /> }
    );
  }

  return (
    <>
      <header className="bg-white border-b border-stone-200 px-4 sm:px-6 lg:px-8 py-2.5 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Logo / Brand Name */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onTabChange && onTabChange(desktopTabs[0]?.id || 'home')}
              className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2 select-none hover:opacity-85 transition-opacity cursor-pointer"
            >
              <span className="text-xl">🍳</span>
              <span className="font-serif font-black text-stone-900">Hunter's Kitchen</span>
            </button>
            {currentUser && (
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                currentUser.role === 'OWNER'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : currentUser.role === 'STAFF'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : currentUser.role === 'DELIVERY_PARTNER'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-stone-100 text-stone-700 border-stone-300'
              }`}>
                {currentUser.role === 'STAFF' && currentUser.staffRole
                  ? currentUser.staffRole.replace(/_/g, ' ')
                  : currentUser.role.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {/* Desktop Navigation Tabs (Professional Segmented Bar) */}
          {desktopTabs.length > 0 && onTabChange && (
            <nav 
              className="hidden md:flex items-center gap-1 p-1 bg-stone-100/90 rounded-xl border border-stone-200/80 shadow-2xs"
              role="tablist"
              aria-label="Main Navigation"
            >
              {desktopTabs.map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onTabChange(tab.id)}
                    className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 select-none cursor-pointer ${
                      isActive
                        ? 'bg-white text-stone-900 font-bold shadow-xs border border-stone-200/90'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                    }`}
                  >
                    <span
                      className={`shrink-0 transition-colors duration-150 ${
                        isActive
                          ? 'text-red-600'
                          : 'text-stone-400 group-hover:text-stone-700'
                      }`}
                    >
                      {tab.icon}
                    </span>
                    <span className="whitespace-nowrap">{tab.label}</span>
                    {tab.badge && tab.badge > 0 ? (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none shadow-2xs">
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Quick Actions & Profile */}
          <div className="flex items-center gap-2.5 shrink-0">
            {onNotificationsClick && (
              <button
                onClick={onNotificationsClick}
                className="w-9 h-9 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center hover:bg-stone-200 transition-colors relative cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {currentUser && (
              <div className="hidden lg:flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                <div className="w-6 h-6 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="font-semibold text-stone-800 max-w-[120px] truncate">
                  {currentUser.name}
                </span>
              </div>
            )}

            {currentUser && (
              <button
                onClick={() => logout()}
                title={`Log out (${currentUser.name})`}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-700 border border-stone-200 hover:border-red-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Address Selection Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" /> Choose Delivery Address
              </h3>
              <button
                onClick={() => {
                  setShowAddressModal(false);
                  setShowNewAddressForm(false);
                }}
                className="text-stone-400 hover:text-stone-600 text-xl font-medium px-2"
              >
                ✕
              </button>
            </div>

            <div className="p-4 pb-28 sm:pb-4 overflow-y-auto space-y-3">
              {!showNewAddressForm ? (
                <>
                  <div className="space-y-2">
                    {(savedAddresses || []).map((addr) => {
                      const isSelected = selectedAddress?.id === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => {
                            setSelectedAddress(addr);
                            setShowAddressModal(false);
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                            isSelected
                              ? 'border-red-600 bg-red-50/50 shadow-xs ring-1 ring-red-600/30'
                              : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                          }`}
                        >
                          <div className="flex-1 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                                {addr.type}
                              </span>
                              <span className="text-sm font-semibold text-stone-900">{addr.name}</span>
                            </div>
                            <p className="text-xs text-stone-600 mt-1">
                              {addr?.doorNo ? `${addr.doorNo}, ` : ''}{addr?.street || ''}, {addr?.area || ''}, {addr?.city || ''} - {addr?.pincode || ''}
                            </p>
                            {addr.landmark && (
                              <p className="text-[11px] text-stone-500 mt-0.5">Landmark: {addr.landmark}</p>
                            )}
                            {addr.coordinates && (
                              <p className="text-[10px] font-mono text-red-700 bg-red-50/80 px-1.5 py-0.5 rounded w-max mt-1 flex items-center gap-1 font-semibold">
                                <Navigation className="w-2.5 h-2.5 text-red-600 shrink-0" />
                                <span>GPS: {addr.coordinates}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isSelected && <Check className="w-4 h-4 text-red-600 shrink-0 mr-1" />}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(addr);
                              }}
                              title="Edit Address"
                              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/80 rounded-lg transition-colors active:scale-95"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingAddrNav(addr);
                              }}
                              title="Delete Address"
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-100/60 rounded-lg transition-colors active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleStartAddViaLocation}
                      disabled={isLocating}
                      className="py-3.5 rounded-xl border border-dashed border-red-300 text-red-700 bg-red-50/30 hover:bg-red-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-55"
                    >
                      {isLocating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-600 shrink-0" />
                      ) : (
                        <Crosshair className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>{isLocating ? 'Locating...' : 'Use My Location'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleStartAddNew}
                      className="py-3.5 rounded-xl border border-dashed border-stone-300 text-stone-700 bg-stone-50/30 hover:bg-stone-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4 shrink-0 text-stone-500" />
                      <span>Enter Manually</span>
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleAddAddress} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                    <span className="text-xs font-bold text-stone-800">
                      {editingAddressId ? 'Edit Address' : 'New Address Details'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewAddressForm(false);
                        setEditingAddressId(null);
                      }}
                      className="text-stone-400 hover:text-stone-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-stone-700">Type</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as any)}
                        className="w-full mt-1 p-2 border border-stone-300 rounded-lg text-xs"
                      >
                        <option value="HOME">Home</option>
                        <option value="WORK">Work</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-stone-700">Flat / House No</label>
                      <input
                        type="text"
                        placeholder="e.g. 12-A"
                        value={newDoor}
                        onChange={(e) => setNewDoor(e.target.value)}
                        className="w-full mt-1 p-2 border border-stone-300 rounded-lg text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700">Street / Colony</label>
                    <input
                      type="text"
                      placeholder="e.g. Avinashi Road"
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      className="w-full mt-1 p-2 border border-stone-300 rounded-lg text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700">Area / Sector</label>
                    <input
                      type="text"
                      placeholder="e.g. Peelamedu"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      className="w-full mt-1 p-2 border border-stone-300 rounded-lg text-xs"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-red-600 shrink-0" />
                        <span>Location Coordinates (GPS)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isLocating}
                        className="text-[10px] font-bold text-red-700 hover:text-red-800 flex items-center gap-1 bg-red-50 hover:bg-red-100 border border-red-200/60 px-2 py-0.5 rounded transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isLocating ? (
                          <Loader2 className="w-3 h-3 animate-spin text-red-600" />
                        ) : (
                          <Crosshair className="w-3 h-3 text-red-600" />
                        )}
                        <span>{isLocating ? 'Locating...' : 'Get GPS'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 11.0168, 76.9558"
                      value={newCoordinates}
                      onChange={(e) => setNewCoordinates(e.target.value)}
                      className="w-full p-2 border border-stone-300 rounded-lg text-xs font-mono bg-stone-50/50 focus:bg-white focus:border-red-600 outline-hidden transition-all"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      Enter latitude &amp; longitude or click &quot;Get GPS&quot; for accurate delivery navigation.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm(false)}
                      className="flex-1 py-2.5 rounded-lg border border-stone-300 text-stone-700 font-semibold text-xs"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-lg bg-red-700 text-white font-semibold text-xs shadow-xs"
                    >
                      Save & Select
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Address Modal in Navbar */}
      <DeleteAddressModal
        isOpen={!!deletingAddrNav}
        address={deletingAddrNav}
        onClose={() => setDeletingAddrNav(null)}
        onConfirm={async (id) => {
          await deleteAddress(id);
        }}
      />
    </>
  );
};
