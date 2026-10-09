import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import { 
  Settings, 
  Save, 
  Check, 
  ShieldCheck, 
  Hash, 
  RefreshCw, 
  AlertTriangle, 
  Database, 
  CheckCircle2, 
  Activity
} from 'lucide-react';

export const OwnerSettingsView: React.FC = () => {
  const { settings, refreshSettings } = useAuth();

  const [restaurantName, setRestaurantName] = useState(settings?.restaurantName || "Hunter's Kitchen");
  const [phone, setPhone] = useState(settings?.phone || '+91 98765 00000');
  const [address, setAddress] = useState(settings?.address || 'Coimbatore');
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(settings?.baseDeliveryFee || 35);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(settings?.freeDeliveryThreshold || 500);
  const [codEnabled, setCodEnabled] = useState(settings?.codEnabled ?? true);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(settings?.onlinePaymentEnabled ?? true);
  const [announcement, setAnnouncement] = useState(settings?.announcement || '');

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Observability & Hardening States
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'integrity' | 'outbox'>('settings');
  const [integrityReport, setIntegrityReport] = useState<any | null>(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [reconciliationReport, setReconciliationReport] = useState<any | null>(null);
  const [isRunningReconciliation, setIsRunningReconciliation] = useState(false);
  const [outboxEvents, setOutboxEvents] = useState<any[]>([]);
  const [isLoadingOutbox, setIsLoadingOutbox] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiService.updateSettings({
        restaurantName,
        phone,
        address,
        baseDeliveryFee: Number(baseDeliveryFee),
        freeDeliveryThreshold: Number(freeDeliveryThreshold),
        codEnabled,
        onlinePaymentEnabled,
        announcement
      });
      await refreshSettings();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyChain = async () => {
    setIsVerifyingChain(true);
    try {
      const data = await apiService.verifyAuditIntegrity();
      setIntegrityReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifyingChain(false);
    }
  };

  const handleRunReconciliation = async () => {
    setIsRunningReconciliation(true);
    try {
      const data = await apiService.runReconciliation();
      setReconciliationReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunningReconciliation(false);
    }
  };

  const handleLoadOutbox = async () => {
    setIsLoadingOutbox(true);
    try {
      const data = await apiService.getOutboxEvents(25);
      setOutboxEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingOutbox(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'integrity') {
      handleVerifyChain();
      handleRunReconciliation();
    } else if (activeSubTab === 'outbox') {
      handleLoadOutbox();
    }
  }, [activeSubTab]);

  return (
    <div className="pb-28 md:pb-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-stone-900">Admin Control & Operations</h2>
          <p className="text-xs text-stone-500 font-medium">Configure store settings & inspect production integrity</p>
        </div>
      </div>

      {/* Sub-tab Switcher */}
      <div className="flex bg-stone-100 p-1 rounded-xl gap-1 border border-stone-200 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'settings' ? 'bg-white text-stone-900 shadow-2xs font-extrabold' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-stone-700" /> Store Settings
        </button>
        <button
          onClick={() => setActiveSubTab('integrity')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'integrity' ? 'bg-white text-stone-900 shadow-2xs font-extrabold' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Audit & Reconciliation
        </button>
        <button
          onClick={() => setActiveSubTab('outbox')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'outbox' ? 'bg-white text-stone-900 shadow-2xs font-extrabold' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-blue-600" /> Outbox Queue
        </button>
      </div>

      {activeSubTab === 'settings' && (
        <>
          {isSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" /> Settings updated successfully!
            </div>
          )}

          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-stone-200 p-4 space-y-4 text-xs shadow-2xs">
            <div>
              <label className="font-bold text-stone-700">Restaurant Name</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full mt-1 p-2.5 border border-stone-300 rounded-xl font-medium focus:ring-1 focus:ring-red-600"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-700">Support Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-stone-300 rounded-xl font-medium"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700">City / Location</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-stone-300 rounded-xl font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-stone-700">Base Delivery Fee (₹)</label>
                <input
                  type="number"
                  value={baseDeliveryFee}
                  onChange={(e) => setBaseDeliveryFee(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 border border-stone-300 rounded-xl font-medium"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-stone-700">Free Delivery Above (₹)</label>
                <input
                  type="number"
                  value={freeDeliveryThreshold}
                  onChange={(e) => setFreeDeliveryThreshold(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 border border-stone-300 rounded-xl font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                <span className="font-bold text-stone-800">Cash on Delivery (COD)</span>
                <input
                  type="checkbox"
                  checked={codEnabled}
                  onChange={(e) => setCodEnabled(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                <span className="font-bold text-stone-800">Enable Online Payment Gateway</span>
                <input
                  type="checkbox"
                  checked={onlinePaymentEnabled}
                  onChange={(e) => setOnlinePaymentEnabled(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-stone-700">Announcement Banner Text</label>
              <input
                type="text"
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="e.g. Try our Seeraga Samba Mutton Biriyani!"
                className="w-full mt-1 p-2.5 border border-stone-300 rounded-xl font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-red-700 text-white font-extrabold text-xs shadow-md hover:bg-red-800 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </>
      )}

      {activeSubTab === 'integrity' && (
        <div className="space-y-4">
          {/* Cryptographic SHA-256 Chain Verification Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-stone-900">Immutable Audit Log (SHA-256 Hash Chained)</h3>
                  <p className="text-[11px] text-stone-500">Cryptographically links every mutation to detect tampering</p>
                </div>
              </div>
              <button
                onClick={handleVerifyChain}
                disabled={isVerifyingChain}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingChain ? 'animate-spin' : ''}`} />
                {isVerifyingChain ? 'Verifying...' : 'Re-verify Chain'}
              </button>
            </div>

            {integrityReport && (
              <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                integrityReport.isValid ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
              }`}>
                <div className="flex items-center gap-2 font-black">
                  {integrityReport.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span>{integrityReport.isValid ? 'Audit Log Chain Integrity Verified: 100% Intact' : 'Tamper Warning: Hash Chain Mismatch!'}</span>
                </div>
                <div className="text-[11px] font-mono text-stone-700 space-y-0.5 pt-1 border-t border-emerald-200/60">
                  <p><span className="font-bold">Audited Blocks:</span> {integrityReport.checkedCount} records verified</p>
                  <p className="truncate"><span className="font-bold">Latest Hash:</span> {integrityReport.latestHash}</p>
                  {integrityReport.error && (
                    <p className="text-red-700 font-bold">{integrityReport.error}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* COD Operational Reconciliation Scan Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-stone-900">COD Financial & State Reconciliation</h3>
                  <p className="text-[11px] text-stone-500">Audits cash collection, stale orders, item prices & rider states</p>
                </div>
              </div>
              <button
                onClick={handleRunReconciliation}
                disabled={isRunningReconciliation}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningReconciliation ? 'animate-spin' : ''}`} />
                {isRunningReconciliation ? 'Scanning...' : 'Run Audit Scan'}
              </button>
            </div>

            {reconciliationReport && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] text-stone-500 uppercase font-extrabold">Orders Audited</span>
                    <p className="text-base font-black text-stone-900">{reconciliationReport.totalOrdersAudited}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    reconciliationReport.anomaliesDetected > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <span className="text-[10px] uppercase font-extrabold text-stone-500">Anomalies Detected</span>
                    <p className={`text-base font-black ${
                      reconciliationReport.anomaliesDetected > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}>{reconciliationReport.anomaliesDetected}</p>
                  </div>
                </div>

                {reconciliationReport.issues.length === 0 ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    All orders are fully reconciled. No financial or state anomalies found.
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <h4 className="text-[11px] font-black text-stone-800 uppercase tracking-wide">Detected Issues ({reconciliationReport.issues.length})</h4>
                    {reconciliationReport.issues.map((issue: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-amber-900">{issue.type}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}>{issue.severity}</span>
                        </div>
                        <p className="text-stone-700 text-[11px]">{issue.description}</p>
                        <p className="text-[10px] font-semibold text-amber-900/80"><span className="font-bold">Suggested Action:</span> {issue.suggestedAction}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'outbox' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-stone-900">Transactional Outbox Queue</h3>
                <p className="text-[11px] text-stone-500">Autonomous worker dispatching real-time SSE events</p>
              </div>
            </div>
            <button
              onClick={handleLoadOutbox}
              disabled={isLoadingOutbox}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOutbox ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
            {outboxEvents.length === 0 ? (
              <p className="py-6 text-center text-xs text-stone-400">No events in outbox log</p>
            ) : (
              outboxEvents.map((evt: any) => (
                <div key={evt.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-900 text-[11px]">{evt.eventType}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        evt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        evt.status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                        evt.status === 'PROCESSING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {evt.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-0.5 font-mono truncate max-w-xs">
                      {evt.aggregateType} #{evt.aggregateId} • {new Date(evt.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400">
                    Retries: {evt.retryCount}/{evt.maxRetries}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
