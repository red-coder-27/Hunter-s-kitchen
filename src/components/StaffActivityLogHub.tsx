import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiService } from '../services/api';
import {
  ClipboardList,
  Download,
  FolderSync,
  FolderOpen,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Bike,
  Utensils,
  Flame,
  Check,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Activity,
  FileSpreadsheet,
  FileText,
  User,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface StaffAction {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  actionType: string;
  actionTitle: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  details: string;
  rejectionReason?: string;
  cancellationReason?: string;
  assignedPartnerName?: string;
  grandTotal?: number;
  statusBadgeColor: string;
}

// IndexedDB Helper to persist directory handle across browser sessions
function openDirectoryHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('HunterKitchenStorage', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('handles')) {
        req.result.createObjectStore('handles');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDirHandle(handle: any) {
  try {
    const db = await openDirectoryHandleDb();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, 'autoSaveDir');
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.warn('Could not save directory handle in IndexedDB:', err);
  }
}

async function getDirHandle(): Promise<any> {
  try {
    const db = await openDirectoryHandleDb();
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get('autoSaveDir');
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export const StaffActivityLogHub: React.FC = () => {
  const [actions, setActions] = useState<StaffAction[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('TODAY');
  const [selectedRole, setSelectedRole] = useState<'ALL' | 'STAFF' | 'DELIVERY_PARTNER' | 'OWNER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Folder Access State
  const [folderHandle, setFolderHandle] = useState<any>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [isSavingToFolder, setIsSavingToFolder] = useState(false);
  const [folderSaveSuccessMsg, setFolderSaveSuccessMsg] = useState<string | null>(null);

  // Collapsible diagnostics state (technical ledger & worker outbox)
  const [showTechnicalDiagnostics, setShowTechnicalDiagnostics] = useState(false);
  const [integrityReport, setIntegrityReport] = useState<any | null>(null);
  const [isVerifyingLedger, setIsVerifyingLedger] = useState(false);
  const [outboxEvents, setOutboxEvents] = useState<any[]>([]);
  const [isLoadingOutbox, setIsLoadingOutbox] = useState(false);

  // Load Saved Directory Handle on mount
  useEffect(() => {
    getDirHandle().then((handle) => {
      if (handle) {
        setFolderHandle(handle);
        setFolderName(handle.name || 'Configured Folder');
      }
    });
  }, []);

  const loadActions = async () => {
    setIsLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const dateParam = selectedDate === 'TODAY' ? todayStr : selectedDate === 'ALL' ? undefined : selectedDate;
      const res: any = await apiService.getStaffActions({
        date: dateParam,
        role: selectedRole === 'ALL' ? undefined : selectedRole,
        limit: 1000
      });

      const actionList = Array.isArray(res)
        ? res
        : Array.isArray(res?.actions)
        ? res.actions
        : Array.isArray(res?.data)
        ? res.data
        : [];

      setActions(actionList);

      const summaryDates = res?.summary?.dates || res?.dates;
      if (Array.isArray(summaryDates) && summaryDates.length > 0) {
        setAvailableDates(summaryDates);
      }

      // Cache actions to localStorage for offline access
      try {
        const cacheKey = `hunter_actions_${dateParam || 'all'}`;
        localStorage.setItem(cacheKey, JSON.stringify(actionList));
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load staff actions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [selectedDate, selectedRole]);

  // Filter actions by search query
  const filteredActions = useMemo(() => {
    if (!searchQuery.trim()) return actions;
    const q = searchQuery.toLowerCase();
    return actions.filter(
      (a) =>
        a.actorName?.toLowerCase().includes(q) ||
        a.actorRole?.toLowerCase().includes(q) ||
        a.orderNumber?.toLowerCase().includes(q) ||
        a.actionTitle?.toLowerCase().includes(q) ||
        a.details?.toLowerCase().includes(q) ||
        a.customerName?.toLowerCase().includes(q)
    );
  }, [actions, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = actions.filter((a) => a.date === todayStr).length;
    const staffCount = actions.filter((a) => a.actorRole.toUpperCase().includes('STAFF')).length;
    const driverCount = actions.filter((a) => a.actorRole.toUpperCase().includes('DELIVERY')).length;
    const rejectedCount = actions.filter((a) => a.actionType === 'REJECTED').length;
    const acceptedCount = actions.filter((a) => a.actionType === 'ACCEPTED').length;
    return { todayCount, staffCount, driverCount, rejectedCount, acceptedCount };
  }, [actions]);

  // Generate CSV text
  const generateCsvContent = (records: StaffAction[]): string => {
    const headers = [
      'Log_ID',
      'Date',
      'Time',
      'Action_Type',
      'Action_Title',
      'Staff_or_Partner_Name',
      'Actor_Role',
      'Order_Number',
      'Customer_Name',
      'Details',
      'Rejection_Reason',
      'Cancellation_Reason',
      'Grand_Total',
      'Timestamp_ISO'
    ];

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = records.map((r) => [
      escapeCsv(r.id),
      escapeCsv(r.date),
      escapeCsv(r.time),
      escapeCsv(r.actionType),
      escapeCsv(r.actionTitle),
      escapeCsv(r.actorName),
      escapeCsv(r.actorRole),
      escapeCsv(r.orderNumber || 'N/A'),
      escapeCsv(r.customerName || 'N/A'),
      escapeCsv(r.details),
      escapeCsv(r.rejectionReason || ''),
      escapeCsv(r.cancellationReason || ''),
      escapeCsv(r.grandTotal ? `₹${r.grandTotal}` : ''),
      escapeCsv(r.timestamp)
    ]);

    // Prepend UTF-8 BOM for perfect Microsoft Excel rendering
    return '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  };

  // 1. Manual CSV Download
  const handleDownloadCsv = () => {
    const dateLabel = selectedDate === 'TODAY' ? new Date().toISOString().split('T')[0] : selectedDate;
    const csvData = generateCsvContent(filteredActions);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HunterKitchen_Staff_Delivery_Log_${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Manual JSON Download
  const handleDownloadJson = () => {
    const dateLabel = selectedDate === 'TODAY' ? new Date().toISOString().split('T')[0] : selectedDate;
    const jsonStr = JSON.stringify(filteredActions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HunterKitchen_Staff_Delivery_Log_${dateLabel}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 3. Request Local Folder Access (File System Access API)
  const handleSelectFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support local folder directory access. You can use the Download Daily Report button to save reports.');
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      if (handle) {
        setFolderHandle(handle);
        setFolderName(handle.name || 'Selected Folder');
        await saveDirHandle(handle);
        setFolderSaveSuccessMsg(`Auto-save linked to folder "${handle.name}".`);
        setTimeout(() => setFolderSaveSuccessMsg(null), 4000);

        // Immediately auto-save today's action file into the folder
        await saveReportToDirectory(handle);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Directory access error:', err);
      }
    }
  };

  // Helper to save report file directly to the given DirectoryHandle
  const saveReportToDirectory = async (dirHandle: any) => {
    if (!dirHandle) return;
    setIsSavingToFolder(true);
    try {
      // Check write permissions
      if ((await dirHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          throw new Error('Write permission was not granted by the browser.');
        }
      }

      const dateLabel = selectedDate === 'TODAY' ? new Date().toISOString().split('T')[0] : selectedDate;
      const fileName = `HunterKitchen_Daily_Log_${dateLabel}.csv`;
      const csvData = generateCsvContent(actions);

      // Create or overwrite file in the local folder
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(csvData);
      await writable.close();

      setFolderSaveSuccessMsg(`Saved "${fileName}" to local folder "${dirHandle.name || 'Selected'}"!`);
      setTimeout(() => setFolderSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Failed to save to local directory:', err);
      alert(`Could not save file to local folder: ${err.message || 'Permission denied'}`);
    } finally {
      setIsSavingToFolder(false);
    }
  };

  // Technical Diagnostics Functions
  const handleVerifyLedger = async () => {
    setIsVerifyingLedger(true);
    try {
      const rep = await apiService.verifyAuditIntegrity();
      setIntegrityReport(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifyingLedger(false);
    }
  };

  const handleLoadOutbox = async () => {
    setIsLoadingOutbox(true);
    try {
      const data = await apiService.getOutboxEvents(30);
      setOutboxEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingOutbox(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Success Notification for Folder Auto-Save */}
      {folderSaveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{folderSaveSuccessMsg}</span>
          </div>
          <button onClick={() => setFolderSaveSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-extrabold text-sm">
            ×
          </button>
        </div>
      )}

      {/* Main Container Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
        {/* Header & Quick Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" /> Staff & Delivery Action Logs
            </h3>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              Comprehensive operational audit trail of kitchen staff (acceptance, cooking, packaging, rejection) & delivery partners.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadActions}
              disabled={isLoading}
              className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
              title="Refresh Actions Log"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Summary Pill Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-2xl bg-stone-50 border border-stone-200/80">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Total Logged</span>
            <span className="text-lg font-black text-stone-900">{filteredActions.length}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Accepted Dishes</span>
            <span className="text-lg font-black text-emerald-900">{stats.acceptedCount}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-rose-50/70 border border-rose-200/80">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Rejected Orders</span>
            <span className="text-lg font-black text-rose-900">{stats.rejectedCount}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-blue-50/70 border border-blue-200/80">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Driver Dispatches</span>
            <span className="text-lg font-black text-blue-900">{stats.driverCount}</span>
          </div>
        </div>

        {/* Filter Bar & Export Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Left: Date & Role Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Date Pills */}
            <div className="inline-flex rounded-xl p-1 bg-stone-100 border border-stone-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedDate('TODAY')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedDate === 'TODAY' ? 'bg-white text-stone-900 shadow-2xs font-extrabold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedDate === 'ALL' ? 'bg-white text-stone-900 shadow-2xs font-extrabold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Days
              </button>
            </div>

            {/* Custom Date Input */}
            <div className="relative inline-flex items-center">
              <Calendar className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 pointer-events-none" />
              <input
                type="date"
                value={selectedDate === 'TODAY' || selectedDate === 'ALL' ? '' : selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="pl-8 pr-2.5 py-1.5 text-xs font-bold border border-stone-200 rounded-xl bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            {/* Role Filter Dropdown */}
            <div className="relative inline-flex items-center">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="py-1.5 pl-2.5 pr-7 text-xs font-bold border border-stone-200 rounded-xl bg-white text-stone-700 hover:border-stone-300 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                <option value="STAFF">Kitchen Staff</option>
                <option value="DELIVERY_PARTNER">Delivery Partners</option>
                <option value="OWNER">Owner Actions</option>
              </select>
            </div>
          </div>

          {/* Right: Search + Export & Folder Auto-Save Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative min-w-44">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search staff, order, dish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-stone-200 rounded-xl bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
              />
            </div>

            {/* Download CSV Report */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={filteredActions.length === 0}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Download filtered daily actions as CSV/Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>

            {/* Folder Auto-Save Button (File System Access API) */}
            <button
              type="button"
              onClick={folderHandle ? () => saveReportToDirectory(folderHandle) : handleSelectFolder}
              disabled={isSavingToFolder}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                folderHandle
                  ? 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100 shadow-3xs'
                  : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
              }`}
              title={
                folderHandle
                  ? `Click to sync & write daily report into "${folderName}".`
                  : 'Choose a local folder on your computer to automatically auto-save daily reports.'
              }
            >
              {isSavingToFolder ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" />
              ) : folderHandle ? (
                <FolderSync className="w-3.5 h-3.5 text-blue-700" />
              ) : (
                <FolderOpen className="w-3.5 h-3.5 text-stone-600" />
              )}
              <span>{folderHandle ? `Auto-Saved: ${folderName}` : 'Auto-Save Folder'}</span>
            </button>
          </div>
        </div>

        {/* Actions List Table / Cards */}
        {isLoading ? (
          <div className="py-12 text-center text-stone-400 space-y-2">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-emerald-600" />
            <p className="text-xs font-bold text-stone-600">Loading operational activity logs...</p>
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="p-8 text-center bg-stone-50/60 rounded-2xl border border-stone-200 space-y-1">
            <ClipboardList className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-bold text-stone-700">No actions recorded for the selected filter.</p>
            <p className="text-[11px] text-stone-400">Actions taken by chefs, billers, and drivers will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[520px] overflow-y-auto no-scrollbar pr-1 divide-y divide-stone-100">
            {filteredActions.map((action) => {
              const initials = action.actorName
                ? action.actorName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'ST';

              const isRejected = action.actionType === 'REJECTED' || action.actionType === 'CANCELLED';
              const isAccepted = action.actionType === 'ACCEPTED';
              const isDelivered = action.actionType === 'DELIVERED';
              const isReady = action.actionType === 'READY';
              const isPreparing = action.actionType === 'PREPARING';
              const isAssigned = action.actionType === 'ASSIGNED' || action.actionType === 'REASSIGNED';

              return (
                <div
                  key={action.id}
                  className={`pt-2.5 pb-2.5 px-3 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-stone-50/80 ${
                    isRejected ? 'bg-rose-50/40 border-l-4 border-rose-500' : isAccepted ? 'bg-emerald-50/20' : ''
                  }`}
                >
                  {/* Left: Performer Identity & Action Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Actor Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 border mt-0.5 ${
                        action.actorRole.includes('DELIVERY')
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : action.actorRole.includes('CHEF') || action.actorRole.includes('MANAGER')
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Actor Name & Role Tag */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-stone-900">{action.actorName}</span>
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                          {action.actorRole}
                        </span>
                        {action.orderNumber && (
                          <span className="text-[10px] font-black text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded-md">
                            #{action.orderNumber}
                          </span>
                        )}
                      </div>

                      {/* Descriptive narrative */}
                      <p className="text-xs text-stone-600 font-medium mt-0.5">{action.details}</p>

                      {/* Callout if Rejection Reason exists */}
                      {action.rejectionReason && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md">
                          <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>Reason: {action.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action Badge & Time */}
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0 text-left sm:text-right">
                    {/* Action Pill Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight inline-flex items-center gap-1 ${
                        isAccepted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isRejected
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isDelivered
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isPreparing
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isReady
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : isAssigned
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : 'bg-stone-100 text-stone-700 border border-stone-200'
                      }`}
                    >
                      {isAccepted && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                      {isRejected && <XCircle className="w-3 h-3 text-rose-700" />}
                      {isPreparing && <Flame className="w-3 h-3 text-amber-700" />}
                      {isReady && <Check className="w-3 h-3 text-blue-700" />}
                      {isAssigned && <Bike className="w-3 h-3 text-indigo-700" />}
                      {isDelivered && <ShieldCheck className="w-3 h-3 text-emerald-700" />}
                      <span>{action.actionTitle}</span>
                    </span>

                    {/* Timestamp */}
                    <div className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      <span>{action.time}</span>
                      <span className="text-stone-300">•</span>
                      <span>{action.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* COLLAPSIBLE TECHNICAL AUDIT & OUTBOX DIAGNOSTICS (Developer View) */}
      {/* ========================================================================= */}
      <div className="bg-stone-50 rounded-2xl border border-stone-200/90 overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => {
            setShowTechnicalDiagnostics((prev) => !prev);
            if (!showTechnicalDiagnostics) {
              handleVerifyLedger();
              handleLoadOutbox();
            }
          }}
          className="w-full px-4 py-3 flex items-center justify-between text-stone-600 hover:text-stone-900 transition-colors font-bold cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-stone-500" />
            <span>Cryptographic Security Ledger & Outbox Diagnostics (Technical View)</span>
          </div>
          {showTechnicalDiagnostics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTechnicalDiagnostics && (
          <div className="p-4 pt-1 border-t border-stone-200/80 space-y-3 bg-white">
            {/* Cryptographic Ledger Box */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-extrabold text-stone-800 text-xs">SHA-256 Cryptographic Hash Chain</h5>
                  <p className="text-[10px] text-stone-500">Tamper-evident blockchain-style event verification</p>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyLedger}
                  disabled={isVerifyingLedger}
                  className="px-2.5 py-1 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg text-xs font-bold text-stone-700 flex items-center gap-1"
                >
                  {isVerifyingLedger ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                  <span>Verify Hashes</span>
                </button>
              </div>

              {integrityReport && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-bold ${
                    integrityReport.isValid || integrityReport.valid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  Ledger Integrity: {integrityReport.isValid || integrityReport.valid ? 'VERIFIED (100% Tamper Proof)' : 'COMPROMISED'}
                  <span className="block text-[10px] font-normal text-stone-600 mt-0.5">
                    Verified {integrityReport.checkedCount || integrityReport.totalChecked || 0} chained cryptographic blocks.
                  </span>
                </div>
              )}
            </div>

            {/* Outbox Queue Box */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-extrabold text-stone-800 text-xs">Background Transactional Outbox</h5>
                  <p className="text-[10px] text-stone-500">Queue workers & delivery notifications</p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadOutbox}
                  disabled={isLoadingOutbox}
                  className="px-2.5 py-1 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg text-xs font-bold text-stone-700"
                >
                  Refresh
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                {outboxEvents.length === 0 ? (
                  <p className="text-[11px] text-stone-400 italic">No pending background outbox events.</p>
                ) : (
                  outboxEvents.slice(0, 10).map((evt) => (
                    <div key={evt.id} className="p-1.5 bg-white rounded-lg border border-stone-200 flex justify-between items-center text-[10px]">
                      <span className="font-bold text-stone-800">{evt.eventType}</span>
                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 font-bold rounded-md">{evt.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
