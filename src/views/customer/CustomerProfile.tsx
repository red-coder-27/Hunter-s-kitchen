import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useNotification } from '../../context/NotificationContext';
import { apiService } from '../../services/api';
import { AppNotification, Address } from '../../types';
import { DeleteAddressModal } from '../../components/DeleteAddressModal';
import {
  validateName,
  validatePhone,
  validateEmail,
  validateAddressDetails,
  sanitizeTypingPhone,
  sanitizeTypingName,
  sanitizeTypingPincode
} from '../../utils/validation';
import {
  User,
  MapPin,
  Bell,
  LogOut,
  Phone,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  Crosshair,
  Check,
  X,
  Loader2,
  Navigation
} from 'lucide-react';

export const CustomerProfile: React.FC = () => {
  const { currentUser, updateUserProfile, logout } = useAuth();
  const { savedAddresses, updateAddress, deleteAddress, saveNewAddress } = useCart();
  const { webPushPermission, requestWebPushPermission, isPushAlertsEnabled, togglePushAlerts } = useNotification();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Address Editing & Creation State
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [isAddingAddr, setIsAddingAddr] = useState(false);
  const [addrDoor, setAddrDoor] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrArea, setAddrArea] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrType, setAddrType] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');
  const [addrCoordinates, setAddrCoordinates] = useState('');
  const [isLocatingAddr, setIsLocatingAddr] = useState(false);
  const [isSavingAddr, setIsSavingAddr] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [deletingAddr, setDeletingAddr] = useState<Address | null>(null);

  useEffect(() => {
    if (currentUser) {
      apiService
        .getNotifications(currentUser.id)
        .then((data) => setNotifications(Array.isArray(data) ? data : []))
        .catch(() => setNotifications([]));
    }
  }, [currentUser]);

  const handleStartEditing = () => {
    setEditName(currentUser?.name || '');
    setEditPhone(currentUser?.phone || '');
    setEditEmail(currentUser?.email || '');
    setSaveError(null);
    setSaveSuccessMsg(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Strict client-side validation & formatting
    const nameRes = validateName(editName);
    if (!nameRes.isValid) {
      setSaveError(nameRes.error || 'Please enter a valid full name.');
      return;
    }

    const phoneRes = validatePhone(editPhone);
    if (!phoneRes.isValid) {
      setSaveError(phoneRes.error || 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const emailRes = validateEmail(editEmail);
    if (!emailRes.isValid) {
      setSaveError(emailRes.error || 'Please enter a valid Gmail address.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await updateUserProfile({
        name: nameRes.value,
        phone: phoneRes.value,
        email: emailRes.value
      });
      setIsSaving(false);
      setIsEditing(false);
      setSaveSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setIsSaving(false);
      setSaveError(err.message || 'Failed to update profile. Please try again.');
    }
  };

  // Address Handlers
  const handleStartAddingAddr = () => {
    setEditingAddrId(null);
    setAddrDoor('');
    setAddrStreet('');
    setAddrArea('');
    setAddrCity('Coimbatore');
    setAddrPincode('641001');
    setAddrType('HOME');
    setAddrCoordinates('');
    setAddrError(null);
    setIsAddingAddr(true);
  };

  const handleStartEditingAddr = (addr: any) => {
    setIsAddingAddr(false);
    setEditingAddrId(addr.id);
    setAddrDoor(addr.doorNo || '');
    setAddrStreet(addr.street || '');
    setAddrArea(addr.area || '');
    setAddrCity(addr.city || 'Coimbatore');
    setAddrPincode(addr.pincode || '641001');
    setAddrType(addr.type || 'HOME');
    setAddrCoordinates(addr.coordinates || '');
    setAddrError(null);
  };

  const handleCancelAddr = () => {
    setEditingAddrId(null);
    setIsAddingAddr(false);
    setAddrError(null);
  };

  const handleDetectAddrLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocatingAddr(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coordsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setAddrCoordinates(coordsStr);

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
            setAddrDoor(addr.house_number || addr.building || '');
            setAddrStreet(addr.road || addr.pedestrian || addr.cycleway || addr.footway || addr.path || addr.suburb || addr.neighbourhood || 'Main Road');
            setAddrArea(addr.suburb || addr.neighbourhood || addr.city_district || addr.residential || addr.village || addr.quarter || 'Central District');
            setAddrCity(addr.city || addr.town || addr.village || 'Coimbatore');
            setAddrPincode((addr.postcode || '641001').replace(/\D/g, '').slice(0, 6));
          }
        } catch (err) {
          console.warn('Reverse geocoding failed:', err);
        } finally {
          setIsLocatingAddr(false);
        }
      },
      () => {
        setAddrCoordinates('11.0168, 76.9558');
        setIsLocatingAddr(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSaveAddrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict Address Validation
    const validation = validateAddressDetails({
      street: addrStreet,
      area: addrArea,
      pincode: addrPincode,
      doorNo: addrDoor
    });

    if (!validation.isValid) {
      setAddrError(validation.error || 'Please fill in valid address details.');
      return;
    }

    setAddrError(null);
    setIsSavingAddr(true);
    try {
      const payload = {
        doorNo: addrDoor.trim() || 'N/A',
        street: addrStreet.trim(),
        area: addrArea.trim(),
        city: addrCity.trim() || 'Coimbatore',
        pincode: addrPincode.replace(/\D/g, '').slice(0, 6) || '641001',
        type: addrType,
        coordinates: addrCoordinates.trim() || undefined,
        name: currentUser?.name || 'Customer',
        phone: currentUser?.phone || '+91 99887 76655'
      };

      if (editingAddrId) {
        await updateAddress(editingAddrId, payload);
      } else {
        await saveNewAddress(payload);
      }
      setIsSavingAddr(false);
      setEditingAddrId(null);
      setIsAddingAddr(false);
      setAddrError(null);
    } catch (err: any) {
      console.error('Failed to save address:', err);
      setIsSavingAddr(false);
      setAddrError(err.message || 'Failed to save delivery address.');
    }
  };

  const handleDeleteAddrClick = (addr: Address) => {
    setDeletingAddr(addr);
  };

  return (
    <div className="pb-28 md:pb-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      <h2 className="text-lg font-black text-stone-900">Your Account Profile</h2>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Profile Header Info Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-full bg-red-700 text-white font-extrabold text-xl flex items-center justify-center shrink-0 shadow-2xs">
              {(isEditing ? editName : currentUser?.name) ? (isEditing ? editName : currentUser?.name)?.charAt(0).toUpperCase() : 'C'}
            </div>

            {!isEditing && (
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm text-stone-900 truncate">{currentUser?.name || 'Customer'}</h3>
                <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="truncate">{currentUser?.phone || '+91 99887 76655'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="truncate">{currentUser?.email || 'customer@hunterskitchen.com'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Top Right Action Button */}
          {!isEditing && (
            <button
              type="button"
              onClick={handleStartEditing}
              className="px-3 py-1.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5 text-red-600" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Inline Editing Inputs */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-4 pt-3 border-t border-stone-100 space-y-3">
            {saveError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-extrabold text-stone-600 uppercase tracking-wide block mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value.slice(0, 70))}
                  placeholder="Enter full name"
                  maxLength={70}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white rounded-xl text-xs font-bold text-stone-900 outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-stone-600 uppercase tracking-wide block mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(sanitizeTypingPhone(e.target.value))}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white rounded-xl text-xs font-bold text-stone-900 outline-hidden transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-stone-600 uppercase tracking-wide block mb-1">
                Email Address (Gmail)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 focus:border-red-600 focus:bg-white rounded-xl text-xs font-bold text-stone-900 outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Bottom Form Actions for convenience */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Real-Time Order Push Notification Settings */}
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl transition-colors shrink-0 ${isPushAlertsEnabled ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-500'}`}>
              <Bell className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-xs text-stone-900 uppercase tracking-wide">
                  Real-Time Order Push Alerts
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${
                  isPushAlertsEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-stone-200 text-stone-600 border border-stone-300'
                }`}>
                  {isPushAlertsEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                Notify user in real-time with sound chimes and push alerts when order status changes.
              </p>
            </div>
          </div>

          {/* Interactive Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={isPushAlertsEnabled}
            onClick={() => togglePushAlerts()}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ring-2 ring-stone-900/5 ${
              isPushAlertsEnabled ? 'bg-emerald-600' : 'bg-stone-300'
            }`}
            title={isPushAlertsEnabled ? 'Turn OFF Real-Time Push Alerts' : 'Turn ON Real-Time Push Alerts'}
          >
            <span className="sr-only">Toggle Real-Time Order Push Alerts</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[10px] font-black ${
                isPushAlertsEnabled ? 'translate-x-5 text-emerald-600' : 'translate-x-0 text-stone-400'
              }`}
            >
              {isPushAlertsEnabled ? '✓' : '✕'}
            </span>
          </button>
        </div>

        <div className="pt-2.5 border-t border-amber-200/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-stone-500 text-[11px]">Browser Status:</span>
            {webPushPermission === 'granted' ? (
              <span className="text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Web Push Active
              </span>
            ) : webPushPermission === 'denied' ? (
              <span className="text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" /> Blocked in Browser
              </span>
            ) : (
              <span className="text-stone-600 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-lg text-[11px]">
                Not Enabled Yet
              </span>
            )}
          </div>

          {!isPushAlertsEnabled ? (
            <span className="text-[11px] font-semibold text-stone-500 italic">Alerts muted</span>
          ) : (
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Active & Ready
            </span>
          )}
        </div>
      </div>

      {/* Saved Addresses Section */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wide flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" /> Saved Delivery Addresses ({savedAddresses.length})
          </h3>
          {!isAddingAddr && !editingAddrId && (
            <button
              type="button"
              onClick={handleStartAddingAddr}
              className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-stone-600" />
              <span>Add New</span>
            </button>
          )}
        </div>

        {/* Address Add / Edit Form */}
        {(isAddingAddr || editingAddrId) && (
          <form onSubmit={handleSaveAddrSubmit} className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
              <span className="font-extrabold text-xs text-stone-800">
                {editingAddrId ? 'Edit Address' : 'Add New Address'}
              </span>
              <button
                type="button"
                onClick={handleCancelAddr}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {addrError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{addrError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-extrabold text-stone-600 uppercase block mb-1">Type</label>
                <select
                  value={addrType}
                  onChange={(e) => setAddrType(e.target.value as any)}
                  className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 outline-hidden"
                >
                  <option value="HOME">Home</option>
                  <option value="WORK">Work</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-stone-600 uppercase block mb-1">Flat / House No</label>
                <input
                  type="text"
                  placeholder="e.g. 12-A"
                  value={addrDoor}
                  onChange={(e) => setAddrDoor(e.target.value.slice(0, 50))}
                  maxLength={50}
                  className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-stone-600 uppercase block mb-1">Street / Colony *</label>
              <input
                type="text"
                placeholder="e.g. Avinashi Road"
                value={addrStreet}
                required
                maxLength={120}
                onChange={(e) => setAddrStreet(e.target.value.slice(0, 120))}
                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-extrabold text-stone-600 uppercase block mb-1">Area / Sector *</label>
                <input
                  type="text"
                  placeholder="e.g. Peelamedu"
                  value={addrArea}
                  required
                  maxLength={100}
                  onChange={(e) => setAddrArea(e.target.value.slice(0, 100))}
                  className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 outline-hidden"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-stone-600 uppercase block mb-1">Pincode (6 digits)</label>
                <input
                  type="text"
                  placeholder="e.g. 641004"
                  value={addrPincode}
                  maxLength={6}
                  onChange={(e) => setAddrPincode(sanitizeTypingPincode(e.target.value))}
                  className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-900 outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-stone-600 uppercase flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-red-600" /> GPS Coordinates
                </label>
                <button
                  type="button"
                  onClick={handleDetectAddrLocation}
                  disabled={isLocatingAddr}
                  className="text-[10px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 px-2 py-0.5 rounded flex items-center gap-1 transition-all disabled:opacity-50"
                >
                  {isLocatingAddr ? <Loader2 className="w-3 h-3 animate-spin text-red-600" /> : <Crosshair className="w-3 h-3 text-red-600" />}
                  <span>Get GPS</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="e.g. 11.0168, 76.9558"
                value={addrCoordinates}
                onChange={(e) => setAddrCoordinates(e.target.value)}
                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-mono text-stone-900 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelAddr}
                disabled={isSavingAddr}
                className="px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingAddr}
                className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
              >
                {isSavingAddr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Address</span>
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {(savedAddresses || []).map((addr) => {
            const isBeingEdited = editingAddrId === addr.id;
            if (isBeingEdited) return null; // Form above replaces this item during edit

            return (
              <div key={addr.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                      {addr.type}
                    </span>
                    <span className="font-semibold text-stone-900">{addr.name}</span>
                  </div>

                  {/* Icon-only Action Buttons for each address */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditingAddr(addr)}
                      title="Edit Address"
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/80 transition-all active:scale-95"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-stone-700" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddrClick(addr)}
                      title="Delete Address"
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-100/70 transition-all active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-stone-500 hover:text-red-600" />
                    </button>
                  </div>
                </div>

                <p className="text-stone-600 mt-1 pr-12">
                  {addr?.doorNo ? `${addr.doorNo}, ` : ''}{addr?.street || ''}, {addr?.area || ''}, {addr?.city || ''} - {addr?.pincode || ''}
                </p>
                {addr.coordinates && (
                  <p className="text-[10px] font-mono text-red-700 bg-red-50/80 px-1.5 py-0.5 rounded w-max mt-1 flex items-center gap-1 font-semibold">
                    <Navigation className="w-2.5 h-2.5 text-red-600 shrink-0" />
                    <span>GPS: {addr.coordinates}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Address Confirmation Modal */}
      <DeleteAddressModal
        isOpen={!!deletingAddr}
        address={deletingAddr}
        onClose={() => setDeletingAddr(null)}
        onConfirm={async (id) => {
          await deleteAddress(id);
          setSaveSuccessMsg('Address successfully deleted from your account and database.');
          setTimeout(() => setSaveSuccessMsg(null), 4000);
        }}
      />

      {/* Notifications Section */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-2xs">
        <h3 className="font-extrabold text-stone-900 text-xs uppercase tracking-wide flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-600" /> Notifications History
        </h3>

        {notifications.length === 0 ? (
          <p className="text-xs text-stone-400">No new notifications</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notifications.map((notif) => (
              <div key={notif.id} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <p className="font-bold text-stone-900">{notif.title}</p>
                <p className="text-stone-600 text-[11px] mt-0.5">{notif.message}</p>
                <p className="text-[10px] text-stone-400 mt-1">
                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-2">
        <button
          onClick={logout}
          className="w-full py-3 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>
    </div>
  );
};
