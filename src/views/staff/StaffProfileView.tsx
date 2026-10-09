import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { StaffSubRole } from '../../types';
import {
  validateName,
  validatePhone,
  validateEmail,
  sanitizeTypingPhone,
  sanitizeTypingName
} from '../../utils/validation';
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  LogOut,
  Save,
  Check,
  Edit2,
  X,
  Volume2,
  VolumeX,
  Loader2,
  Award,
  Clock,
  UtensilsCrossed,
  Bike,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  ChefHat,
  CookingPot
} from 'lucide-react';

interface StaffProfileViewProps {
  onSignOut?: () => void;
}

export const StaffProfileView: React.FC<StaffProfileViewProps> = () => {
  const { currentUser, updateUserProfile, logout } = useAuth();
  const { webPushPermission, requestWebPushPermission, isPushAlertsEnabled, togglePushAlerts } = useNotification();

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notification Preferences State
  const [kitchenChime, setKitchenChime] = useState(true);
  const [orderPushAlerts, setOrderPushAlerts] = useState(true);
  const [smsShiftAlerts, setSmsShiftAlerts] = useState(true);

  // Shift Status
  const [shiftStatus, setShiftStatus] = useState<'ON_DUTY' | 'BREAK' | 'OFF_DUTY'>('ON_DUTY');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
    }
  }, [currentUser]);

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
      setFeedback({ type: 'success', text: 'Staff profile updated successfully!' });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', text: err.message || 'Failed to update staff profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const staffRole = currentUser?.staffRole || 'GENERAL_MANAGER';

  const getRoleBadge = (role: StaffSubRole) => {
    switch (role) {
      case 'GENERAL_MANAGER':
        return { label: 'General Manager (All Access & Deliveries)', icon: <Shield className="w-3.5 h-3.5 text-red-600" />, color: 'bg-red-50 text-red-800 border-red-200' };
      case 'KITCHEN_STAFF':
      case 'STAFF':
      default:
        return { label: 'Kitchen Staff (Order Management & Dispatch)', icon: <Award className="w-3.5 h-3.5 text-blue-600" />, color: 'bg-blue-50 text-blue-800 border-blue-200' };
    }
  };

  const badge = getRoleBadge(staffRole);

  return (
    <div className="pb-28 md:pb-10 w-full max-w-5xl mx-auto px-0 py-3 sm:py-5 space-y-4 sm:space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white p-5 rounded-3xl shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {currentUser?.name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight">{currentUser?.name}</h2>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.color} bg-white/90`}>
                {badge.icon}
                <span>{badge.label}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Shift Status Selector */}
        <div className="text-right">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 block mb-1">Shift Status</span>
          <select
            value={shiftStatus}
            onChange={(e) => setShiftStatus(e.target.value as any)}
            className="p-1.5 bg-stone-800 text-white border border-stone-700 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="ON_DUTY">🟢 On Duty</option>
            <option value="BREAK">🟡 On Break</option>
            <option value="OFF_DUTY">⚪ Off Duty</option>
          </select>
        </div>
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

      {/* Personal Info Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h3 className="font-extrabold text-sm text-stone-900">Staff Account Details</h3>
            <p className="text-xs text-stone-500 font-medium">Update your receiver name, Gmail, and contact phone number</p>
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
              <label className="font-bold text-stone-700 block mb-1">Full Name / Receiver Name</label>
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
              <span className="text-[10px] font-bold text-stone-400 block uppercase mb-1">Name</span>
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

      {/* NOTIFICATION PREFERENCES */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3.5">
        <div>
          <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-red-600" /> Kitchen & Terminal Notifications
          </h4>
          <p className="text-xs text-stone-500 font-medium">Control live sound chimes and incoming ticket notifications</p>
        </div>

        <div className="space-y-2.5 pt-1">
          {/* Web Push */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-stone-900 block">Terminal Web Push Alerts</span>
              <span className="text-[11px] text-stone-500">Receive popup notification when orders are created or updated</span>
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

          {/* Kitchen Audio Bell */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                {kitchenChime ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
                Kitchen Ticket Audio Chime
              </span>
              <span className="text-[11px] text-stone-500">Play chime when order reaches PREPARING status</span>
            </div>
            <button
              type="button"
              onClick={() => setKitchenChime(!kitchenChime)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                kitchenChime ? 'bg-red-600 justify-end' : 'bg-stone-300 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-xs"></div>
            </button>
          </div>

          {/* SMS Shift Alerts */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-stone-900 block">Shift Assignment SMS</span>
              <span className="text-[11px] text-stone-500">Receive roster schedule updates via SMS</span>
            </div>
            <button
              type="button"
              onClick={() => setSmsShiftAlerts(!smsShiftAlerts)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                smsShiftAlerts ? 'bg-red-600 justify-end' : 'bg-stone-300 justify-start'
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
          <p className="text-xs text-stone-500 font-medium">End your active terminal shift session</p>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <LogOut className="w-4 h-4 text-red-600" />
          <span>Sign Out of Terminal</span>
        </button>
      </div>
    </div>
  );
};
