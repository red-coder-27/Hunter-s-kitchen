import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { apiService } from '../../services/api';
import { Users, Bike, Plus, Check, X, Shield, Phone, Mail, Edit, Trash2 } from 'lucide-react';

export const OwnerStaffView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STAFF' | 'DELIVERY'>('STAFF');
  const [staffList, setStaffList] = useState<User[]>([]);
  const [deliveryList, setDeliveryList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Staff Modal State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState<'KITCHEN_CHEF' | 'ORDER_BILLER' | 'STORE_DISPATCHER' | 'GENERAL_MANAGER'>('GENERAL_MANAGER');

  // Add Delivery Partner Modal State
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('TN-37-XX-1234');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editVehicleNumber, setEditVehicleNumber] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<'KITCHEN_CHEF' | 'ORDER_BILLER' | 'STORE_DISPATCHER' | 'GENERAL_MANAGER'>('GENERAL_MANAGER');

  // Delete Confirmation State
  const [deletingUserConfirm, setDeletingUserConfirm] = useState<User | null>(null);
  const [deleteVerification, setDeleteVerification] = useState('');

  const loadData = async () => {
    try {
      const [staffData, driverData] = await Promise.all([
        apiService.getUsers('STAFF'),
        apiService.getUsers('DELIVERY_PARTNER')
      ]);
      setStaffList(staffData);
      setDeliveryList(driverData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiService.addStaff({ name: staffName, email: staffEmail, phone: staffPhone, staffRole });
      setShowAddStaffModal(false);
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffRole('GENERAL_MANAGER');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiService.addDeliveryPartner({
        name: driverName,
        email: driverEmail,
        phone: driverPhone,
        vehicleNumber,
        vehicleType: 'Bike'
      });
      setShowAddDriverModal(false);
      setDriverName('');
      setDriverEmail('');
      setDriverPhone('');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStaffStatus = async (user: User) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiService.updateStaff(user.id, { status: nextStatus });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDriverStatus = async (user: User) => {
    const nextStatus = user.partnerStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      await apiService.updateDeliveryPartnerStatus(user.id, nextStatus);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone);
    setEditVehicleNumber(user.vehicleNumber || '');
    setEditStaffRole(user.staffRole || 'GENERAL_MANAGER');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      if (editingUser.role === 'STAFF') {
        await apiService.updateStaff(editingUser.id, {
          name: editName,
          email: editEmail,
          phone: editPhone,
          staffRole: editStaffRole
        });
      } else {
        await apiService.updateDeliveryPartner(editingUser.id, {
          name: editName,
          email: editEmail,
          phone: editPhone,
          vehicleNumber: editVehicleNumber
        });
      }
      setShowEditModal(false);
      setEditingUser(null);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrigger = (user: User) => {
    setDeletingUserConfirm(user);
    setDeleteVerification('');
  };

  const confirmDeleteUser = async () => {
    if (!deletingUserConfirm) return;
    try {
      await apiService.deleteUser(deletingUserConfirm.id);
      setDeletingUserConfirm(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="pb-28 md:pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-stone-900">Staff & Delivery Fleet</h2>
          <p className="text-xs text-stone-500">Manage kitchen staff & delivery personnel</p>
        </div>

        <button
          onClick={() => (activeTab === 'STAFF' ? setShowAddStaffModal(true) : setShowAddDriverModal(true))}
          className="px-3.5 py-2 rounded-xl bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-red-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add {activeTab === 'STAFF' ? 'Staff' : 'Driver'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200">
        <button
          onClick={() => setActiveTab('STAFF')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'STAFF' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" /> Kitchen Staff ({staffList.length})
        </button>

        <button
          onClick={() => setActiveTab('DELIVERY')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'DELIVERY' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Bike className="w-4 h-4 text-rose-600" /> Delivery Partners ({deliveryList.length})
        </button>
      </div>

      {/* List Content */}
      {activeTab === 'STAFF' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {staffList.map((st) => (
            <div key={st.id} className="bg-white rounded-2xl border border-stone-200/90 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                  {st.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h4 className="font-extrabold text-xs text-stone-900 truncate">{st.name}</h4>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 tracking-wider shrink-0">
                      {st.staffRole ? st.staffRole.replace(/_/g, ' ') : 'GENERAL MANAGER'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5 truncate">{st.email} • {st.phone}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-stone-100 shrink-0">
                <button
                  onClick={() => toggleStaffStatus(st)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase cursor-pointer ${
                    st.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {st.status}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(st)}
                    className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors cursor-pointer"
                    title="Edit Staff details"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteTrigger(st)}
                    className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete Staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {deliveryList.map((dr) => (
            <div key={dr.id} className="bg-white rounded-2xl border border-stone-200/90 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-sm shrink-0">
                  <Bike className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-xs text-stone-900 truncate">{dr.name}</h4>
                  <p className="text-[11px] text-stone-500 truncate">
                    {dr.vehicleNumber || 'Bike'} • {dr.phone}
                  </p>
                  <p className="text-[10px] text-amber-600 font-bold mt-0.5 truncate">
                    ★ {dr.currentRating || 5.0} • {dr.totalDeliveries || 0} Deliveries Completed
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-stone-100 shrink-0">
                <button
                  onClick={() => toggleDriverStatus(dr)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase cursor-pointer ${
                    dr.partnerStatus === 'ONLINE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {dr.partnerStatus || 'OFFLINE'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(dr)}
                    className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition-colors cursor-pointer"
                    title="Edit Delivery Partner details"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteTrigger(dr)}
                    className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete Delivery Partner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-stone-900 text-sm">Invite Kitchen Staff</h3>
              <button onClick={() => setShowAddStaffModal(false)}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700">Staff Name</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Ramesh V"
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700">Email Address</label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="staff@hunterskitchen.com"
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700">Phone Number</label>
                <input
                  type="text"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700">Assign Role / Station</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as any)}
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl bg-white text-xs font-semibold text-stone-800"
                >
                  <option value="KITCHEN_MANAGER">Kitchen Manager (Full Operations)</option>
                  <option value="GENERAL_MANAGER">General Manager (All Access)</option>
                  <option value="HEAD_CHEF">Head Executive Chef (Kitchen & Recipes)</option>
                  <option value="KITCHEN_CHEF">Kitchen Chef (Food Cooking & Prep)</option>
                  <option value="LINE_COOK">Line Cook (Station Cooking)</option>
                  <option value="ORDER_BILLER">Order Desk / Biller (Order Acceptance)</option>
                  <option value="FRONT_DESK">Front Desk & Reception (Orders & Counter)</option>
                  <option value="STORE_DISPATCHER">Store Dispatcher (Assigning Drivers)</option>
                </select>
                <p className="text-[10px] text-stone-400 mt-1">
                  Determines the dynamic screens and tools accessible on the staff's terminal.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-700 text-white font-bold shadow-md"
                >
                  {isSubmitting ? 'Sending...' : 'Invite Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-stone-900 text-sm">Add Delivery Partner</h3>
              <button onClick={() => setShowAddDriverModal(false)}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleAddDriverSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700">Partner Name</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Arun Kumar"
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700">Email Address</label>
                <input
                  type="email"
                  value={driverEmail}
                  onChange={(e) => setDriverEmail(e.target.value)}
                  placeholder="driver@hunterskitchen.com"
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700">Phone Number</label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+91 91234 56789"
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700">Vehicle Number</label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="TN-37-AB-1234"
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDriverModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-700 text-white font-bold shadow-md"
                >
                  {isSubmitting ? 'Saving...' : 'Add Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-stone-900 text-sm">
                Edit {editingUser.role === 'STAFF' ? 'Kitchen Staff' : 'Delivery Partner'}
              </h3>
              <button onClick={() => { setShowEditModal(false); setEditingUser(null); }}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                  required
                />
              </div>

              {editingUser.role === 'STAFF' && (
                <div>
                  <label className="font-bold text-stone-700">Assign Role / Station</label>
                  <select
                    value={editStaffRole}
                    onChange={(e) => setEditStaffRole(e.target.value as any)}
                    className="w-full mt-1 p-2 border border-stone-300 rounded-xl bg-white text-xs font-semibold text-stone-800"
                  >
                    <option value="KITCHEN_MANAGER">Kitchen Manager (Full Operations)</option>
                    <option value="GENERAL_MANAGER">General Manager (All Access)</option>
                    <option value="HEAD_CHEF">Head Executive Chef (Kitchen & Recipes)</option>
                    <option value="KITCHEN_CHEF">Kitchen Chef (Food Cooking & Prep)</option>
                    <option value="LINE_COOK">Line Cook (Station Cooking)</option>
                    <option value="ORDER_BILLER">Order Desk / Biller (Order Acceptance)</option>
                    <option value="FRONT_DESK">Front Desk & Reception (Orders & Counter)</option>
                    <option value="STORE_DISPATCHER">Store Dispatcher (Assigning Drivers)</option>
                  </select>
                </div>
              )}

              {editingUser.role === 'DELIVERY_PARTNER' && (
                <div>
                  <label className="font-bold text-stone-700">Vehicle Number</label>
                  <input
                    type="text"
                    value={editVehicleNumber}
                    onChange={(e) => setEditVehicleNumber(e.target.value)}
                    className="w-full mt-1 p-2 border border-stone-300 rounded-xl"
                    required
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingUser(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-700 text-white font-bold shadow-md"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Safe Delete Confirmation Modal */}
      {deletingUserConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-red-600 text-sm flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Secure Delete Confirmation
              </h3>
              <button onClick={() => setDeletingUserConfirm(null)}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-stone-600 leading-relaxed">
                Are you sure you want to delete <strong className="text-stone-900">{deletingUserConfirm.name}</strong>?
                This user will be permanently removed from the staff database.
              </p>
              
              <div className="p-2.5 bg-red-50 text-red-800 rounded-xl border border-red-100 font-medium leading-relaxed">
                ⚠️ Warning: Deleting a staff member cannot be undone. Any active task or session history may lose its reference.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDeletingUserConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-700 text-xs hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs bg-red-600 hover:bg-red-700 shadow-md transition-all"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
