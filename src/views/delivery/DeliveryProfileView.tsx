import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { apiService } from '../../services/api';
import {
  validateName,
  validatePhone,
  validateEmail,
  sanitizeTypingPhone,
  sanitizeTypingName
} from '../../utils/validation';
import {
  User,
  Phone,
  Mail,
  Bike,
  Star,
  CheckCircle2,
  LogOut,
  Save,
  Check,
  Edit2,
  X,
  Bell,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  Shield,
  Clock,
  Navigation
} from 'lucide-react';

export const DeliveryProfileView: React.FC = () => {
  const { currentUser, updateUserProfile, logout } = useAuth();
  const { webPushPermission, requestWebPushPermission, isPushAlertsEnabled, togglePushAlerts } = useNotification();

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [vehicleNumber, setVehicleNumber] = useState(currentUser?.vehicleNumber || 'TN-37-AB-1234');
  const [vehicleType, setVehicleType] = useState(currentUser?.vehicleType || 'Bike');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Online / Offline Switch
  const [partnerStatus, setPartnerStatus] = useState<'ONLINE' | 'OFFLINE'>(
    currentUser?.partnerStatus === 'OFFLINE' ? 'OFFLINE' : 'ONLINE'
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Notifications
  const [orderAlarm, setOrderAlarm] = useState(true);
  const [smsPickupAlert, setSmsPickupAlert] = useState(true);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setVehicleNumber(currentUser.vehicleNumber || 'TN-37-AB-1234');
      setVehicleType(currentUser.vehicleType || 'Bike');
      setPartnerStatus(currentUser.partnerStatus === 'OFFLINE' ? 'OFFLINE' : 'ONLINE');
    }
  }, [currentUser]);

  const handleToggleOnlineStatus = async () => {
    if (!currentUser) return;
    const newStatus = partnerStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    setIsUpdatingStatus(true);
    try {
      await apiService.updateUserProfile(currentUser.id, {
        name,
        email,
        phone
      });
      setPartnerStatus(newStatus);
      setFeedback({
        type: 'success',
        text: newStatus === 'ONLINE' ? '🟢 You are now ONLINE & ready to receive delivery tasks!' : '⚪ You are now OFFLINE'
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict client-side validation & formatting
    const nameRes = validateName(name);
    if (!nameRes.isValid) {
      setFeedback({ type: 'error', text: nameRes.error || 'Please enter a valid full name.' });
      return;
    }

    const phoneRes = validatePhone(phone);
    if (!phoneRes.isValid) {
      setFeedback({ type: 'error', text: phoneRes.error || 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    const emailRes = validateEmail(email);
    if (!emailRes.isValid) {
      setFeedback({ type: 'error', text: emailRes.error || 'Please enter a valid Gmail address.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await updateUserProfile({
        name: nameRes.value,
        email: emailRes.value,
        phone: phoneRes.value
      });
      setIsEditing(false);
      setFeedback({ type: 'success', text: 'Delivery partner profile updated successfully!' });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-28 md:pb-10 w-full max-w-5xl mx-auto px-0 py-3 sm:py-5 space-y-4 sm:space-y-5">
      {/* Driver Header Card */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-5 rounded-3xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {currentUser?.name?.charAt(0).toUpperCase() || 'D'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight">{currentUser?.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-black text-[10px] uppercase tracking-wider border border-orange-500/30">
                Delivery Fleet
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> {currentUser?.currentRating || '4.9'}
              </span>
              <span>•</span>
              <span>{vehicleType} ({vehicleNumber})</span>
            </div>
          </div>
        </div>

        {/* Driver Online/Offline Switch */}
        <button
          type="button"
          disabled={isUpdatingStatus}
          onClick={handleToggleOnlineStatus}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
            partnerStatus === 'ONLINE'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-stone-700 hover:bg-stone-600 text-stone-200'
          }`}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${partnerStatus === 'ONLINE' ? 'bg-white animate-pulse' : 'bg-stone-400'}`}></div>
          <span>{partnerStatus === 'ONLINE' ? 'ONLINE (Ready)' : 'OFFLINE'}</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Account Details */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h3 className="font-extrabold text-sm text-stone-900">Partner Credentials</h3>
            <p className="text-xs text-stone-500 font-medium">Update your name, contact Gmail, and phone number</p>
          </div>

          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-stone-600" /> Edit Details
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Receiver Name / Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 70))}
                maxLength={70}
                placeholder="Enter full name"
                className="w-full p-2.5 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Gmail / Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full p-2.5 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(sanitizeTypingPhone(e.target.value))}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="w-full p-2.5 border border-stone-300 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold flex items-center gap-1.5 shadow-md shadow-red-700/20 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[10px] font-bold text-stone-400 block uppercase mb-1">Driver Name</span>
              <p className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-600" />
                {currentUser?.name}
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[10px] font-bold text-stone-400 block uppercase mb-1">Gmail</span>
              <p className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{currentUser?.email}</span>
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[10px] font-bold text-stone-400 block uppercase mb-1">Phone</span>
              <p className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                {currentUser?.phone}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Driver Notification Settings */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3.5">
        <div>
          <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-600" /> Dispatch Alerts & Audio Ringtone
          </h4>
          <p className="text-xs text-stone-500 font-medium">Control audio alerts when new orders are assigned to you</p>
        </div>

        <div className="space-y-2.5 pt-1">
          {/* Web Push */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-stone-900 block">Instant Web Push Dispatch</span>
              <span className="text-[11px] text-stone-500">Receive popup on mobile screen when assigned an order</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (webPushPermission !== 'granted') {
                  await requestWebPushPermission();
                } else {
                  togglePushAlerts();
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                webPushPermission === 'granted' && isPushAlertsEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-200 text-stone-700'
              }`}
            >
              {webPushPermission === 'granted' && isPushAlertsEnabled ? 'Enabled' : 'Enable'}
            </button>
          </div>

          {/* Audio Alarm */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                {orderAlarm ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
                New Order Sound Alarm
              </span>
              <span className="text-[11px] text-stone-500">Ring loud siren chime when dispatch assigns a delivery</span>
            </div>
            <button
              type="button"
              onClick={() => setOrderAlarm(!orderAlarm)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                orderAlarm ? 'bg-red-600 justify-end' : 'bg-stone-300 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-xs"></div>
            </button>
          </div>

          {/* SMS Alert */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-stone-900 block">Store Dispatch SMS</span>
              <span className="text-[11px] text-stone-500">Send customer address & OTP via SMS</span>
            </div>
            <button
              type="button"
              onClick={() => setSmsPickupAlert(!smsPickupAlert)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                smsPickupAlert ? 'bg-red-600 justify-end' : 'bg-stone-300 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-xs"></div>
            </button>
          </div>
        </div>
      </div>

      {/* SIGN OUT ACTION */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h4 className="font-extrabold text-sm text-stone-900">Sign Out</h4>
          <p className="text-xs text-stone-500 font-medium">Log out of your delivery driver account</p>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <LogOut className="w-4 h-4 text-red-600" />
          <span>Sign Out of Fleet</span>
        </button>
      </div>
    </div>
  );
};
