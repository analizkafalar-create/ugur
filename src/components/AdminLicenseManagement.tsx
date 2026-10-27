import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, UserRank } from '../types';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Calendar, 
  Search, 
  Filter, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Sparkles, 
  Download, 
  Check, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  User, 
  Smartphone, 
  Coins, 
  Layers, 
  KeyRound, 
  Infinity as InfinityIcon,
  ChevronRight,
  ExternalLink,
  Shield
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';
import { updateUserLicense, updateUserById } from '../utils/userManager';
import { hasActiveLicense, getLicenseDaysLeft } from '../utils/licenseManager';
import { exportToCsv } from '../utils/adminManager';
import { getSupabaseClient } from '../lib/supabase';

interface AdminLicenseManagementProps {
  users: UserProfile[];
  onRefreshUsers: () => void;
  onUpdateUsers?: (updatedUsers: UserProfile[]) => void;
  onSelectUserForDrawer?: (user: UserProfile) => void;
  showToast?: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AdminLicenseManagement: React.FC<AdminLicenseManagementProps> = ({
  users,
  onRefreshUsers,
  onUpdateUsers,
  onSelectUserForDrawer,
  showToast = (_msg: string, _type?: 'info' | 'success' | 'warning' | 'error') => {},
}) => {
  // Local reactive users state for instantaneous optimistic UI updates
  const [localUsers, setLocalUsers] = useState<UserProfile[]>(users);

  // Sync local users whenever parent props change
  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  // Search and Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNLIMITED' | 'NO_LICENSE'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'VIP' | 'ANALYST' | 'ADMIN'>('ALL');

  // Selected User for Detailed License Modal
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [customDatePicker, setCustomDatePicker] = useState<string>('');
  const [bonusCredits, setBonusCredits] = useState<number>(0);
  const [targetTier, setTargetTier] = useState<'USER' | 'VIP' | 'ANALYST' | 'ADMIN'>('USER');

  // Multi-Selection State for Bulk Operations
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkActionNotice, setBulkActionNotice] = useState<string | null>(null);

  // Helper: Determine license status of a user
  const getLicenseInfo = (user: UserProfile) => {
    const raw = user.licenseExpires;
    if (!raw || !raw.trim()) {
      return {
        status: 'NO_LICENSE' as const,
        label: 'Lisanssız',
        badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
        daysLeft: 0,
        formattedDate: 'Tanımlanmamış',
        isUnlimited: false,
        isActive: false,
      };
    }

    const trimmed = raw.trim();
    const upper = trimmed.toUpperCase();
    if (upper === 'SINIRSIZ' || upper === 'UNLIMITED' || upper === 'SINIRSIZ VIP' || upper === 'VIP' || upper.includes('SINIRSIZ') || upper.includes('UNLIMITED')) {
      return {
        status: 'UNLIMITED' as const,
        label: 'Sınırsız VIP',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold',
        daysLeft: 99999,
        formattedDate: 'Süresiz Sınırsız VIP',
        isUnlimited: true,
        isActive: true,
      };
    }

    const expiryDate = new Date(trimmed);
    if (isNaN(expiryDate.getTime())) {
      return {
        status: 'NO_LICENSE' as const,
        label: 'Geçersiz Format',
        badgeClass: 'bg-rose-950/60 text-rose-400 border-rose-800/40',
        daysLeft: 0,
        formattedDate: trimmed,
        isUnlimited: false,
        isActive: false,
      };
    }

    if (expiryDate.getFullYear() >= 2090) {
      return {
        status: 'UNLIMITED' as const,
        label: 'Sınırsız VIP',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold',
        daysLeft: 99999,
        formattedDate: 'Süresiz Sınırsız VIP',
        isUnlimited: true,
        isActive: true,
      };
    }

    const now = Date.now();
    const diffMs = expiryDate.getTime() - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        status: 'EXPIRED' as const,
        label: 'Süresi Doldu',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        daysLeft: diffDays,
        formattedDate: expiryDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        isUnlimited: false,
        isActive: false,
      };
    }

    if (diffDays <= 7) {
      return {
        status: 'EXPIRING_SOON' as const,
        label: `${diffDays} Gün Kaldı`,
        badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40 animate-pulse',
        daysLeft: diffDays,
        formattedDate: expiryDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        isUnlimited: false,
        isActive: true,
      };
    }

    return {
      status: 'ACTIVE' as const,
      label: `${diffDays} Gün Kaldı`,
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      daysLeft: diffDays,
      formattedDate: expiryDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      isUnlimited: false,
      isActive: true,
    };
  };

  // Metrics summary
  const metrics = useMemo(() => {
    let total = localUsers.length;
    let active = 0;
    let unlimited = 0;
    let expiringSoon = 0;
    let expired = 0;
    let noLicense = 0;

    localUsers.forEach((u) => {
      const info = getLicenseInfo(u);
      if (info.status === 'UNLIMITED') {
        unlimited++;
        active++;
      } else if (info.status === 'EXPIRING_SOON') {
        expiringSoon++;
        active++;
      } else if (info.status === 'ACTIVE') {
        active++;
      } else if (info.status === 'EXPIRED') {
        expired++;
      } else {
        noLicense++;
      }
    });

    return { total, active, unlimited, expiringSoon, expired, noLicense };
  }, [localUsers]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return localUsers.filter((u) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        u.id.toLowerCase().includes(q);

      if (!matchSearch) return false;

      const info = getLicenseInfo(u);
      if (statusFilter === 'ACTIVE' && !info.isActive) return false;
      if (statusFilter === 'EXPIRING_SOON' && info.status !== 'EXPIRING_SOON') return false;
      if (statusFilter === 'EXPIRED' && info.status !== 'EXPIRED') return false;
      if (statusFilter === 'UNLIMITED' && info.status !== 'UNLIMITED') return false;
      if (statusFilter === 'NO_LICENSE' && info.status !== 'NO_LICENSE') return false;

      if (roleFilter !== 'ALL') {
        if (roleFilter === 'ADMIN' && u.role !== 'ADMIN') return false;
        if (roleFilter === 'VIP' && u.plan !== 'PRO' && u.rank !== 'OPERATOR') return false;
        if (roleFilter === 'ANALYST' && u.rank !== 'ANALYST') return false;
        if (roleFilter === 'USER' && (u.role === 'ADMIN' || u.rank === 'ANALYST')) return false;
      }

      return true;
    });
  }, [localUsers, searchTerm, statusFilter, roleFilter]);

  // Locate or create the handler function inside AdminLicenseManagement
  const handleQuickLicenseAssign = async (userId: string, action: number | 'UNLIMITED' | 'REMOVE' | string) => {
    try {
      // Call the robust function that handles both Supabase and Local Storage
      const updatedUser = await updateUserLicense(userId, action);
      
      if (updatedUser) {
        // Optimistically update the UI table
        const updatedUsersList = localUsers.map((u) => 
          (u.id === userId || (u.email && u.email.toLowerCase() === (updatedUser.email || '').toLowerCase())) ? updatedUser : u
        );
        setLocalUsers(updatedUsersList);
        if (onUpdateUsers) {
          onUpdateUsers(updatedUsersList); 
        }
        
        sound.playAnomalyDiscovered();
        showToast('Lisans başarıyla tanımlandı!', 'success');

        if (editingUser?.id === userId) {
          setEditingUser(updatedUser);
        }

        onRefreshUsers();
      } else {
        showToast('Kullanıcı bulunamadı veya lisans tanımlanamadı.', 'error');
      }
    } catch (err) {
      console.error('License assignment failed', err);
      showToast('Lisans tanımlanırken hata oluştu.', 'error');
    }
  };

  const handleQuickLicenseAction = handleQuickLicenseAssign;

  // Open Detailed Modal
  const openLicenseModal = (user: UserProfile) => {
    setEditingUser(user);
    setTargetTier(user.role === 'ADMIN' ? 'ADMIN' : (user.plan === 'PRO' ? 'VIP' : 'USER'));
    setBonusCredits(0);
    
    // Set datepicker default
    if (user.licenseExpires && user.licenseExpires !== 'SINIRSIZ' && !isNaN(new Date(user.licenseExpires).getTime())) {
      const d = new Date(user.licenseExpires);
      const iso = d.toISOString().substring(0, 16);
      setCustomDatePicker(iso);
    } else {
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);
      setCustomDatePicker(in30Days.toISOString().substring(0, 16));
    }
  };

  // Save Detailed Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    let targetDateStr: string = customDatePicker;
    if (customDatePicker) {
      const parsed = new Date(customDatePicker);
      if (!isNaN(parsed.getTime())) {
        targetDateStr = parsed.toISOString();
      }
    }

    let updated = (await updateUserLicense(editingUser.id, targetDateStr)) || editingUser;
    
    // Also update credits if bonus requested
    if (bonusCredits > 0) {
      const withCredits = updateUserById(editingUser.id, {
        creditsRemaining: (editingUser.creditsRemaining || 0) + bonusCredits,
      });
      if (withCredits) updated = withCredits;
    }

    // Also update tier if requested
    if (targetTier !== 'USER') {
      let role: 'USER' | 'ADMIN' = targetTier === 'ADMIN' ? 'ADMIN' : 'USER';
      let plan = targetTier === 'VIP' ? 'PRO' : (targetTier === 'ANALYST' ? 'PRO' : 'STARTER');
      let rank: UserRank = targetTier === 'VIP' ? 'OPERATOR' : (targetTier === 'ANALYST' ? 'ANALYST' : (targetTier === 'ADMIN' ? 'ADMIN' : 'OBSERVER'));
      const withRole = updateUserById(editingUser.id, { role, plan: plan as any, rank });
      if (withRole) updated = withRole;
    }

    // Instant optimistic update
    const nextList = localUsers.map((u) => 
      (u.id === editingUser.id || (u.email && u.email.toLowerCase() === editingUser.email.toLowerCase())) ? updated : u
    );
    setLocalUsers(nextList);
    if (onUpdateUsers) {
      onUpdateUsers(nextList);
    }

    sound.playAnomalyDiscovered();
    showToast(`${editingUser.name} lisansı ve yetkileri başarıyla güncellendi!`, 'success');
    setEditingUser(null);
    onRefreshUsers();
  };

  // Bulk extension action
  const handleBulkAction = async (action: number | 'UNLIMITED' | 'REMOVE', label: string) => {
    if (selectedUserIds.length === 0) {
      showToast('Lütfen en az bir kullanıcı seçin.', 'warning');
      return;
    }

    try {
      const updatedMap: Record<string, UserProfile> = {};

      for (const id of selectedUserIds) {
        const res = await updateUserLicense(id, action);
        if (res) updatedMap[id] = res;
      }

      const nextList = localUsers.map((u) => updatedMap[u.id] || u);
      setLocalUsers(nextList);
      if (onUpdateUsers) {
        onUpdateUsers(nextList);
      }

      sound.playAnomalyDiscovered();
      setBulkActionNotice(`${selectedUserIds.length} kullanıcıya ${label} tanımlandı.`);
      setTimeout(() => setBulkActionNotice(null), 4000);
      showToast(`${selectedUserIds.length} kullanıcıya ${label} tanımlandı.`, 'success');
      setSelectedUserIds([]);
      onRefreshUsers();
    } catch (err) {
      console.error('Bulk license action failed:', err);
      showToast('Toplu işlem sırasında hata oluştu.', 'error');
    }
  };

  // Export to CSV
  const handleExportLicenseReport = () => {
    const headers = [
      'ID',
      'İsim',
      'E-Posta',
      'Telefon',
      'Lisans Durumu',
      'Bitiş Tarihi',
      'Kalan Gün',
      'Jeton Bakiyesi',
      'Üyelik Rolü',
      'Kayıt Tarihi',
    ];

    const rows = filteredUsers.map((u) => {
      const info = getLicenseInfo(u);
      return [
        u.id,
        u.name,
        u.email,
        u.phone || '-',
        info.label,
        info.formattedDate,
        info.isUnlimited ? 'Sınırsız' : info.daysLeft,
        u.creditsRemaining,
        u.role === 'ADMIN' ? 'Admin' : u.plan,
        u.memberSince,
      ];
    });

    exportToCsv('TerraScan_Lisans_Yonetim_Raporu', headers, rows);
    showToast('Lisans raporu CSV olarak indirildi.', 'info');
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP METRICS BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Toplam Kullanıcı</span>
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">{metrics.total}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Sistem Kayıtlı</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold">Aktif Lisans</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">{metrics.active}</div>
          <div className="text-[10px] text-emerald-500/80 font-mono mt-1">Geçerli Sınırsız/Süreli</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold">Sınırsız VIP</span>
            <InfinityIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">{metrics.unlimited}</div>
          <div className="text-[10px] text-amber-500/80 font-mono mt-1">Süresiz VIP Yetki</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-orange-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-orange-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold">Yakında Bitiyor</span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black font-mono text-orange-400">{metrics.expiringSoon}</div>
          <div className="text-[10px] text-orange-500/80 font-mono mt-1">Son 7 Gün İçinde</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-rose-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold">Süresi Dolan</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-400">{metrics.expired}</div>
          <div className="text-[10px] text-rose-500/80 font-mono mt-1">Süre Tamamlandı</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">Lisanssız</span>
            <XCircle className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-300">{metrics.noLicense}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Standart Jetonlu</div>
        </div>
      </div>

      {/* 2. SEARCH, FILTER & BULK CONTROLS */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="İsim, e-posta, telefon veya kullanıcı ID ile ara..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tümü ({users.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                Aktif ({metrics.active})
              </button>
              <button
                onClick={() => setStatusFilter('UNLIMITED')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'UNLIMITED' ? 'bg-amber-600 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                Sınırsız ({metrics.unlimited})
              </button>
              <button
                onClick={() => setStatusFilter('EXPIRING_SOON')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'EXPIRING_SOON' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-orange-300'
                }`}
              >
                Yakında Biten ({metrics.expiringSoon})
              </button>
              <button
                onClick={() => setStatusFilter('NO_LICENSE')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'NO_LICENSE' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Lisanssız ({metrics.noLicense})
              </button>
            </div>

            {/* Export Report */}
            <button
              onClick={handleExportLicenseReport}
              className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
              title="CSV Lisans Raporu İndir"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Lisans CSV</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Bar (When users are selected) */}
        {selectedUserIds.length > 0 && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-500/50 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-mono font-black">
                {selectedUserIds.length}
              </span>
              <span className="text-xs font-bold text-white">Kullanıcı Seçildi - Toplu Lisans İşlemi:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleBulkAction(7, '+7 Gün')}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                +7 Gün Ekle
              </button>
              <button
                onClick={() => handleBulkAction(30, '+30 Gün (1 Ay)')}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                +30 Gün Ekle
              </button>
              <button
                onClick={() => handleBulkAction(90, '+90 Gün (3 Ay)')}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                +90 Gün Ekle
              </button>
              <button
                onClick={() => handleBulkAction(365, '+365 Gün (1 Yıl)')}
                className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                +1 Yıl Ekle
              </button>
              <button
                onClick={() => handleBulkAction('UNLIMITED', 'Sınırsız VIP')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-sm"
              >
                👑 Sınırsız VIP Yap
              </button>
              <button
                onClick={() => handleBulkAction('REMOVE', 'Lisans İptali')}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                Lisansı Sıfırla
              </button>
              <button
                onClick={() => setSelectedUserIds([])}
                className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-all"
              >
                Seçimi Kaldır
              </button>
            </div>
          </div>
        )}

        {bulkActionNotice && (
          <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bulkActionNotice}</span>
          </div>
        )}
      </div>

      {/* 3. USER LICENSE TABLE */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUserIds(filteredUsers.map((u) => u.id));
                      } else {
                        setSelectedUserIds([]);
                      }
                    }}
                    className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Kullanıcı Bilgisi</th>
                <th className="py-3.5 px-4">Yetki & Rol</th>
                <th className="py-3.5 px-4">Jeton (Kredi)</th>
                <th className="py-3.5 px-4">Lisans Durumu</th>
                <th className="py-3.5 px-4">Geçerlilik Bitişi</th>
                <th className="py-3.5 px-4 text-right">Hızlı Lisans Uzat / Tanımla</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <span>Filtrelere uygun kullanıcı bulunamadı.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const info = getLicenseInfo(user);
                  const isSelected = selectedUserIds.includes(user.id);

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-blue-950/30' : ''
                      }`}
                    >
                      {/* Select Checkbox */}
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds((prev) => [...prev, user.id]);
                            } else {
                              setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                            }
                          }}
                          className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* User Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-1.5 truncate">
                              <span>{user.name}</span>
                              {user.role === 'ADMIN' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-bold">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Tier */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-300">
                          {user.role === 'ADMIN' ? (
                            <span className="text-indigo-400 font-bold">👑 Sistem Yöneticisi</span>
                          ) : user.plan === 'PRO' ? (
                            <span className="text-amber-400 font-bold">⭐ VIP Saha Mühendisi</span>
                          ) : (
                            <span className="text-slate-400">Standart Kullanıcı</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {user.rankTitle || 'Seviye 1 Gözlemci'}
                        </div>
                      </td>

                      {/* Credits */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-black text-emerald-400 flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{user.creditsRemaining.toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {user.totalScansPerformed || 0} Çekim Yapıldı
                        </div>
                      </td>

                      {/* License Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${info.badgeClass}`}>
                          {info.isUnlimited ? (
                            <InfinityIcon className="w-3 h-3" />
                          ) : info.isActive ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <ShieldAlert className="w-3 h-3" />
                          )}
                          <span>{info.label}</span>
                        </span>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-slate-200">
                          {info.formattedDate}
                        </div>
                        {user.licenseExpires && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]" title={user.licenseExpires}>
                            {user.licenseExpires}
                          </div>
                        )}
                      </td>

                      {/* Quick License Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {/* +7 Gün */}
                          <button
                            type="button"
                            onClick={() => handleQuickLicenseAssign(user.id, 7)}
                            className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-[11px] font-mono font-bold transition-all cursor-pointer"
                            title="Mevcut lisansa 7 gün ekle"
                          >
                            +7G
                          </button>

                          {/* +30 Gün */}
                          <button
                            type="button"
                            onClick={() => handleQuickLicenseAssign(user.id, 30)}
                            className="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-bold transition-all cursor-pointer"
                            title="Mevcut lisansa 30 gün ekle"
                          >
                            +30G
                          </button>

                          {/* +90 Gün */}
                          <button
                            type="button"
                            onClick={() => handleQuickLicenseAssign(user.id, 90)}
                            className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold transition-all cursor-pointer"
                            title="Mevcut lisansa 90 gün ekle"
                          >
                            +90G
                          </button>

                          {/* +365 Gün */}
                          <button
                            type="button"
                            onClick={() => handleQuickLicenseAssign(user.id, 365)}
                            className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-[11px] font-mono font-bold transition-all cursor-pointer"
                            title="Mevcut lisansa 365 gün (1 Yıl) ekle"
                          >
                            +1Yıl
                          </button>

                          {/* Sınırsız VIP */}
                          <button
                            type="button"
                            onClick={() => handleQuickLicenseAssign(user.id, 'UNLIMITED')}
                            className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-black transition-all cursor-pointer"
                            title="Süresiz Sınırsız VIP Lisans Yap"
                          >
                            👑 VIP
                          </button>

                          {/* Detailed Modal Edit */}
                          <button
                            type="button"
                            onClick={() => openLicenseModal(user)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                            title="Özel Tarih & Detaylı Lisans Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                          </button>

                          {/* Reset / Remove License */}
                          {user.licenseExpires && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`${user.name} kullanıcısının lisansını iptal etmek/sıfırlamak istediğinize emin misiniz?`)) {
                                  handleQuickLicenseAssign(user.id, 'REMOVE');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition-all cursor-pointer"
                              title="Lisansı İptal Et / Sıfırla"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. DETAILED LICENSE MODAL (DATEPICKER & TIER CHANGER) */}
      {editingUser && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Lisans & Süre Yönetimi</h3>
                  <p className="text-xs text-slate-400 font-mono">{editingUser.name} ({editingUser.email})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Current Status Overview */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Mevcut Lisans Durumu</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {getLicenseInfo(editingUser).formattedDate}
                  </div>
                </div>
                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${getLicenseInfo(editingUser).badgeClass}`}>
                  {getLicenseInfo(editingUser).label}
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">Hızlı Süre Şablonları</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setCustomDatePicker(d.toISOString().substring(0, 16));
                    }}
                    className="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-blue-950/60 border border-slate-800 hover:border-blue-500/50 text-xs font-mono text-slate-200 text-center transition-all"
                  >
                    +7 Gün
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      setCustomDatePicker(d.toISOString().substring(0, 16));
                    }}
                    className="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 text-xs font-mono text-slate-200 text-center transition-all"
                  >
                    +30 Gün (1 Ay)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 60);
                      setCustomDatePicker(d.toISOString().substring(0, 16));
                    }}
                    className="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 text-xs font-mono text-slate-200 text-center transition-all"
                  >
                    +60 Gün (2 Ay)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 90);
                      setCustomDatePicker(d.toISOString().substring(0, 16));
                    }}
                    className="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-purple-950/60 border border-slate-800 hover:border-purple-500/50 text-xs font-mono text-slate-200 text-center transition-all"
                  >
                    +90 Gün (3 Ay)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 365);
                      setCustomDatePicker(d.toISOString().substring(0, 16));
                    }}
                    className="py-2 px-2.5 rounded-xl bg-slate-950 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/50 text-xs font-mono text-slate-200 text-center transition-all"
                  >
                    +365 Gün (1 Yıl)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomDatePicker('SINIRSIZ');
                    }}
                    className="py-2 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-mono font-bold text-amber-300 text-center transition-all"
                  >
                    👑 Sınırsız VIP
                  </button>
                </div>
              </div>

              {/* Exact Date & Time Picker */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Özel Bitiş Tarihi ve Saati</span>
                  <span className="text-blue-400 text-[10px]">ISO formatında kaydedilir</span>
                </label>
                {customDatePicker === 'SINIRSIZ' ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/40 border border-amber-500/40">
                    <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-2">
                      <InfinityIcon className="w-4 h-4" />
                      Sınırsız VIP Lisans Seçili
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const in30 = new Date();
                        in30.setDate(in30.getDate() + 30);
                        setCustomDatePicker(in30.toISOString().substring(0, 16));
                      }}
                      className="text-xs text-slate-400 hover:text-white underline font-mono"
                    >
                      Tarih Belirle
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={customDatePicker}
                      onChange={(e) => setCustomDatePicker(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Membership Tier Sync */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">Kullanıcı Rolü & Yetki</label>
                  <select
                    value={targetTier}
                    onChange={(e) => setTargetTier(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  >
                    <option value="USER">Standart Üye</option>
                    <option value="VIP">⭐ VIP Saha Operatörü</option>
                    <option value="ANALYST">🥇 Saha Analisti</option>
                    <option value="ADMIN">👑 Sistem Yöneticisi (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">Bonus Jeton Ekle</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={bonusCredits}
                    onChange={(e) => setBonusCredits(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="Örn: 100"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lisansı Kaydet ve Uygula</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
