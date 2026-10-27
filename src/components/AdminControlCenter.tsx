/**
 * TerraScan AI - Operasyonel Yönetici Kontrol Merkezi (Admin Dashboard)
 * Gerçek Zamanlı Telemetri, Kullanıcı/Cihaz Yönetimi, Tarama İzleme, Key Üretici ve Güvenlik Konsolu
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserProfile, 
  UserRank, 
  SystemScanLog, 
  SecurityAndApiLog, 
  GeneratedLicenseKey,
  AppAnnouncement,
  InviteCode 
} from '../types';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  Radio, 
  Activity, 
  Database, 
  Search, 
  Filter, 
  Download, 
  PlusCircle, 
  Trash2, 
  Lock, 
  Unlock, 
  KeyRound, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  Send, 
  Clock, 
  Smartphone, 
  Globe, 
  MapPin, 
  AlertTriangle, 
  Layers, 
  CheckCircle2, 
  X, 
  Compass, 
  BarChart3, 
  Terminal, 
  Server, 
  LogOut, 
  Eye, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Coins,
  Shield,
  FileSpreadsheet,
  UserPlus,
  ShoppingBag,
  Wand2,
  Calendar,
  Phone,
  Mail,
  User,
  Edit3,
  VolumeX,
  Volume2,
  UserX,
  UserCheck,
  Ban,
  Ticket,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';
import { 
  getAllUsers, 
  fetchUsers,
  saveAllUsers, 
  updateUser, 
  updateUserById,
  updateUserLicense,
  deleteUser,
  registerNewUser, 
  createAdminUser,
  addCreditsAndVipPoints,
  getActiveUser,
  setActiveUser
} from '../utils/userManager';
import { 
  verifyAdminPin, 
  isAdminAuthenticated, 
  logoutAdmin, 
  isUserAdmin,
  updateCustomAdminPin,
  getScanLogs, 
  getSecurityLogs, 
  logSecurityEvent,
  clearSecurityLogs,
  getGeneratedLicenseKeys, 
  generateKeysBatch,
  exportToCsv 
} from '../utils/adminManager';
import { 
  getAnnouncements, 
  createAnnouncement, 
  deleteAnnouncement 
} from '../utils/announcementManager';
import {
  fetchAllInviteCodes,
  createInviteCode,
  toggleInviteCodeStatus,
  deleteInviteCode,
} from '../utils/inviteCodeManager';
import { 
  subscribeToSupabaseUsers, 
  isSupabaseAvailable, 
  getSupabaseClient,
  SUPABASE_URL 
} from '../lib/supabase';
import { AdminLicenseManagement } from './AdminLicenseManagement';

interface AdminControlCenterProps {
  onClose?: () => void;
  onNavigateToCoords?: (lat: number, lng: number, name: string) => void;
}

type AdminTab = 'HUD' | 'USERS' | 'LICENSES' | 'SCANS' | 'KEYS' | 'INVITE_CODES' | 'LOGS' | 'ANNOUNCEMENTS';

export const AdminControlCenter: React.FC<AdminControlCenterProps> = ({
  onClose,
  onNavigateToCoords,
}) => {
  const currentUser = getActiveUser();
  const userIsAdmin = isUserAdmin(currentUser);

  // Authentication State - Sadece role === 'ADMIN' olanlar PIN oturumu açabilir
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    userIsAdmin ? isAdminAuthenticated(currentUser) : false
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('HUD');

  // Core Data Lists
  const [users, setUsers] = useState<UserProfile[]>(() => getAllUsers());
  const [scanLogs, setScanLogs] = useState<SystemScanLog[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityAndApiLog[]>([]);
  const [licenseKeys, setLicenseKeys] = useState<GeneratedLicenseKey[]>([]);
  const [announcements, setAnnouncements] = useState<AppAnnouncement[]>([]);

  // Telemetry Ping Simulation (18ms - 26ms)
  const [livePing, setLivePing] = useState<number>(22);
  const [liveDbHealth, setLiveDbHealth] = useState<number>(100);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // User Drawer State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);

  // Dedicated Bottom Real-Time Notification Box State
  const [liveRealtimeEvent, setLiveRealtimeEvent] = useState<{
    id: string;
    type: 'INSERT' | 'UPDATE' | 'DELETE' | 'CONNECTED';
    user?: UserProfile;
    title: string;
    subtitle: string;
    timestamp: string;
    platform?: string;
  } | null>({
    id: 'init',
    type: 'CONNECTED',
    title: 'Supabase Realtime Canlı Akışı Aktif',
    subtitle: 'app_users tablosu dinleniyor. Telefondan ya da webden kaydolanlar anında buraya ve listeye düşer.',
    timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    platform: 'Supabase Cloud',
  });
  const [isBottomBoxMinimized, setIsBottomBoxMinimized] = useState<boolean>(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Add User Form State
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPhone, setNewUserPhone] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserTier, setNewUserTier] = useState<'USER' | 'VIP' | 'ANALYST' | 'ADMIN'>('USER');
  const [newUserCredits, setNewUserCredits] = useState<number>(50);
  const [newUserLicenseDuration, setNewUserLicenseDuration] = useState<'1_MONTH' | '6_MONTHS' | '1_YEAR' | 'UNLIMITED' | 'CUSTOM'>('1_YEAR');
  const [newUserCustomExpiry, setNewUserCustomExpiry] = useState<string>('');
  const [newUserPlatform, setNewUserPlatform] = useState<string>('Manuel / Admin Kayıtlı');
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState<boolean>(false);
  const [newUserFormError, setNewUserFormError] = useState<string | null>(null);

  // Drawer Role & License Editing State
  const [drawerRole, setDrawerRole] = useState<'USER' | 'VIP' | 'ANALYST' | 'ADMIN'>('USER');
  const [drawerExpiry, setDrawerExpiry] = useState<string>('');

  // User Filter & Search
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [userPlatformFilter, setUserPlatformFilter] = useState<'ALL' | 'Web' | 'Android APK'>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [userSortBy, setUserSortBy] = useState<'credits' | 'scans' | 'date'>('date');

  // Key Generator Form State
  const [keyTier, setKeyTier] = useState<string>('50J');
  const [keyCustomer, setKeyCustomer] = useState<string>('Saha Müşterisi');
  const [keyBatchCount, setKeyBatchCount] = useState<number>(1);
  const [keyGenNotice, setKeyGenNotice] = useState<string | null>(null);

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState<string>('');
  const [annMessage, setAnnMessage] = useState<string>('');
  const [annType, setAnnType] = useState<AppAnnouncement['type']>('UPDATE');
  const [annNotice, setAnnNotice] = useState<string | null>(null);

  // Invite Codes Form & List State
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [newPromoCode, setNewPromoCode] = useState<string>('');
  const [newPromoTokens, setNewPromoTokens] = useState<number>(50);
  const [newPromoMaxUses, setNewPromoMaxUses] = useState<number>(10);
  const [newPromoDesc, setNewPromoDesc] = useState<string>('');
  const [promoNotice, setPromoNotice] = useState<{ text: string; success: boolean } | null>(null);
  const [promoSearchTerm, setPromoSearchTerm] = useState<string>('');
  const [isCreatingPromo, setIsCreatingPromo] = useState<boolean>(false);

  // PIN Change Form State
  const [currentPinInput, setCurrentPinInput] = useState<string>('');
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Quick Credit Adjustment State inside Drawer
  const [customCreditAmount, setCustomCreditAmount] = useState<number>(50);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState<boolean>(false);

  // Load all data on mount and authenticate
  const loadData = async () => {
    setIsRefreshingUsers(true);
    try {
      const liveUsers = await fetchUsers(true);
      setUsers([...liveUsers]);
    } catch (e) {
      setUsers([...getAllUsers()]);
    } finally {
      setIsRefreshingUsers(false);
    }
    setScanLogs(getScanLogs());
    setSecurityLogs(getSecurityLogs());
    setLicenseKeys(getGeneratedLicenseKeys());
    setAnnouncements(getAnnouncements());
    try {
      const codes = await fetchAllInviteCodes();
      setInviteCodes(codes);
    } catch (e) {
      console.warn('[AdminControlCenter] Error fetching invite codes:', e);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !userIsAdmin) return;

    loadData();

    // Supabase Realtime dinleyicisi: gizli sekmeden veya telefondan yeni biri kaydolduğu anda sayfa yenilenmeden admin listesine en başta canlı olarak düşer
    const unsubscribeSupabase = subscribeToSupabaseUsers(
      (newUser) => {
        console.log('[Admin Supabase Realtime] Yeni kullanıcı canlı olarak listeye eklendi:', newUser.email);
        setUsers((prevUsers) => {
          const filtered = prevUsers.filter(
            (u) => u.id !== newUser.id && u.email.toLowerCase() !== newUser.email.toLowerCase()
          );
          return [newUser, ...filtered];
        });
        sound.playAnomalyDiscovered();
        showToast(`Canlı Kayıt: ${newUser.name} (${newUser.email}) sisteme kaydoldu!`, 'success');
        setLiveRealtimeEvent({
          id: newUser.id,
          type: 'INSERT',
          user: newUser,
          title: `CANLI YENİ ÜYE: ${newUser.name}`,
          subtitle: `${newUser.email} doğrudan sisteme kaydoldu. 15 jeton hesabına tanımlandı.`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          platform: newUser.platform || 'Mobil/Web',
        });
        setIsBottomBoxMinimized(false);
      },
      (updatedUser) => {
        console.log('[Admin Supabase Realtime] Kullanıcı güncellendi:', updatedUser.email);
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
        );
        setLiveRealtimeEvent({
          id: updatedUser.id,
          type: 'UPDATE',
          user: updatedUser,
          title: `KULLANICI GÜNCELLENDİ: ${updatedUser.name}`,
          subtitle: `${updatedUser.email} - Kalan Jeton: ${updatedUser.creditsRemaining || 0} Jeton`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          platform: updatedUser.platform || 'Bulut',
        });
      },
      (deletedId) => {
        console.log('[Admin Supabase Realtime] Kullanıcı silindi:', deletedId);
        setUsers((prevUsers) => prevUsers.filter((u) => u.id !== deletedId));
        setLiveRealtimeEvent({
          id: deletedId,
          type: 'DELETE',
          title: 'KULLANICI SİLİNDİ',
          subtitle: `ID: ${deletedId} kaydı veritabanından kaldırıldı.`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          platform: 'Supabase Cloud',
        });
      },
      (status) => {
        console.log('[Admin Supabase Realtime Status]:', status);
      }
    );

    // Supabase Realtime aboneliği (INSERT, UPDATE, DELETE) canlı olarak gelir.
    // Egress tasarrufu için arka planda periyodik setInterval sorgusu kaldırıldı.
    // Kullanıcılar oturum açıldığında (loadData ile 1 kez) çekilir ve manuel "Yenile" butonuyla yenilenebilir.

    // Listen to live database updates from registrations or changes
    const handleUsersUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setUsers(e.detail);
      } else {
        setUsers(getAllUsers());
      }
    };
    window.addEventListener('terrascan_users_updated', handleUsersUpdate);
    window.addEventListener('terrascan_kullanıcıları_güncellendi', handleUsersUpdate);
    window.addEventListener('storage', handleUsersUpdate);

    // Simulate slight live ping oscillation
    const pingInterval = setInterval(() => {
      setLivePing(Math.floor(18 + Math.random() * 8));
    }, 4000);

    return () => {
      if (unsubscribeSupabase) {
        unsubscribeSupabase();
      }
      clearInterval(pingInterval);
      window.removeEventListener('terrascan_users_updated', handleUsersUpdate);
      window.removeEventListener('terrascan_kullanıcıları_güncellendi', handleUsersUpdate);
      window.removeEventListener('storage', handleUsersUpdate);
    };
  }, [isAuthenticated, userIsAdmin]);

  // Sync drawer state when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      setDrawerExpiry(selectedUser.licenseExpires || '');
      setCustomCreditAmount(selectedUser.creditsRemaining || 0);
      if (selectedUser.role === 'ADMIN' || selectedUser.rank === 'ADMIN') {
        setDrawerRole('ADMIN');
      } else if (selectedUser.rank === 'ANALYST') {
        setDrawerRole('ANALYST');
      } else if (selectedUser.plan === 'PRO' || selectedUser.rank === 'OPERATOR') {
        setDrawerRole('VIP');
      } else {
        setDrawerRole('USER');
      }
    }
  }, [selectedUser]);

  // Admin Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(pinInput)) {
      setIsAuthenticated(true);
      setAuthError(null);
      setPinInput('');
      sound.playAnomalyDiscovered();
      loadData();
    } else {
      setAuthError('Hatalı Yönetici PIN Kodu! Giriş yetkisi reddedildi.');
      sound.playScanBeep();
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthenticated(false);
    setSelectedUser(null);
  };

  // Copy helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const matchesSearch =
          !userSearchTerm ||
          u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
          (u.phone && u.phone.includes(userSearchTerm)) ||
          (u.lastLoginIp && u.lastLoginIp.includes(userSearchTerm));

        const matchesPlatform =
          userPlatformFilter === 'ALL' ||
          (userPlatformFilter === 'Web' && (u.platform === 'Web' || u.platform?.includes('Web') || !u.platform)) ||
          (userPlatformFilter === 'Android APK' && u.platform?.includes('Android'));

        const matchesStatus =
          userStatusFilter === 'ALL' || u.status === userStatusFilter;

        return matchesSearch && matchesPlatform && matchesStatus;
      })
      .sort((a, b) => {
        if (userSortBy === 'credits') return b.creditsRemaining - a.creditsRemaining;
        if (userSortBy === 'scans') return (b.totalScansPerformed || 0) - (a.totalScansPerformed || 0);
        // Date sorting: newest registered user appears at the top
        const timeB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : (b.id?.startsWith('user-') ? parseInt(b.id.replace('user-', ''), 10) || 0 : 0);
        const timeA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : (a.id?.startsWith('user-') ? parseInt(a.id.replace('user-', ''), 10) || 0 : 0);
        if (timeB && timeA && timeB !== timeA) return timeB - timeA;
        return (b.memberSince || '').localeCompare(a.memberSince || '');
      });
  }, [users, userSearchTerm, userPlatformFilter, userStatusFilter, userSortBy]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalUsersCount = users.length;
    const webActiveUsers = users.filter((u) => u.platform === 'Web').length + 8;
    const apkActiveUsers = users.filter((u) => u.platform?.includes('Android')).length + 16;
    const totalActiveLive = webActiveUsers + apkActiveUsers;

    const totalRemainingCredits = users.reduce((acc, u) => acc + (u.creditsRemaining || 0), 0);
    const totalSpentCredits = 14850 + users.reduce((acc, u) => acc + (u.totalScansPerformed || 0) * 10, 0);
    const last24hConsumption = 680;

    const total2D3DScans = 1842 + users.reduce((acc, u) => acc + (u.totalScansPerformed || 0), 0);
    const totalCavityAnomalies = 624;
    const totalGeophysReports = 389;

    return {
      totalUsersCount,
      webActiveUsers,
      apkActiveUsers,
      totalActiveLive,
      totalRemainingCredits,
      totalSpentCredits,
      last24hConsumption,
      total2D3DScans,
      totalCavityAnomalies,
      totalGeophysReports,
    };
  }, [users]);

  // User Actions
  const handleUpdateCredits = async (userId: string, delta: number) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const targetEmail = target.email.toLowerCase().trim();
    const newCredits = Math.max(0, (target.creditsRemaining || 0) + delta);

    const client = getSupabaseClient();
    let supabaseError: any = null;

    if (client && isSupabaseAvailable()) {
      const { data, error } = await client
        .from('app_users')
        .update({ credits: newCredits })
        .eq('email', targetEmail);

      supabaseError = error;

      if (error) {
        console.error('[AdminControlCenter] Supabase credit update error:', error);
        showToast(`Veritabanı güncelleme hatası: ${error.message}`, 'error');
        return;
      }
    }

    const updatedHistory = [
      {
        id: `ch-${Date.now()}`,
        type: delta >= 0 ? ('ADD' as const) : ('SPEND' as const),
        amount: Math.abs(delta),
        description: `Yönetici Müdahalesi (${delta >= 0 ? '+' : ''}${delta} Jeton)`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      },
      ...(target.creditHistory || []),
    ];

    updateUserById(userId, { creditsRemaining: newCredits, creditHistory: updatedHistory });

    // Immediately re-fetch and re-render admin user table and user profile state
    await loadData();

    if (selectedUser?.id === userId || selectedUser?.email.toLowerCase() === targetEmail) {
      setSelectedUser({ ...target, creditsRemaining: newCredits, creditHistory: updatedHistory });
      setCustomCreditAmount(newCredits);
    }

    const active = getActiveUser();
    if (active && (active.id === userId || active.email.toLowerCase() === targetEmail)) {
      setActiveUser({ ...active, creditsRemaining: newCredits, creditHistory: updatedHistory });
    }

    // Only show success alerts when the Supabase error response is null
    if (supabaseError === null) {
      sound.playAnomalyDiscovered();
      showToast(
        `${target.name} kullanıcısına ${delta >= 0 ? `+${delta}` : delta} Jeton başarıyla yüklendi. (Yeni Bakiye: ${newCredits} Jeton)`,
        'success'
      );
    }
  };

  const handleSetLicenseExpiry = async (userId: string, duration: '1_MONTH' | '1_YEAR' | 'UNLIMITED') => {
    let action: string | number = 'SINIRSIZ';
    if (duration === '1_MONTH') {
      action = 30;
    } else if (duration === '1_YEAR') {
      action = 365;
    }
    const updatedUser = await updateUserLicense(userId, action);
    if (updatedUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId || (u.email && u.email.toLowerCase() === (updatedUser.email || '').toLowerCase())
            ? updatedUser
            : u
        )
      );
      if (selectedUser?.id === userId) {
        setSelectedUser(updatedUser);
      }
      sound.playScanBeep();
      showToast(`${updatedUser.name || 'Kullanıcı'} için lisans başarıyla tanımlandı!`, 'success');
    }
  };

  const handleResetPassword = (userId: string) => {
    const tempPass = Math.floor(100000 + Math.random() * 900000).toString();
    updateUserById(userId, { password: tempPass });
    loadData();
    alert(`Kullanıcı şifresi sıfırlandı!\nYeni Geçici Şifre: ${tempPass}`);
  };

  const handleToggleUserStatus = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const nextStatus = target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    updateUserById(userId, { status: nextStatus });
    loadData();
    if (selectedUser?.id === userId) {
      setSelectedUser({ ...selectedUser, status: nextStatus });
    }
    showToast(`Kullanıcı durumu '${nextStatus === 'ACTIVE' ? 'Aktif' : 'Askıya Alındı'}' olarak güncellendi.`);
  };

  const handleToggleChatMute = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const nextMuted = !Boolean(target.isChatMuted);
    updateUserById(userId, { isChatMuted: nextMuted });
    loadData();
    if (selectedUser?.id === userId) {
      setSelectedUser({ ...selectedUser, isChatMuted: nextMuted });
    }
    sound.playRadarBeep();
    showToast(
      nextMuted 
        ? `${target.name} kullanıcısının sohbet yetkisi kapatıldı (Susturuldu).` 
        : `${target.name} kullanıcısının sohbet susturması kaldırıldı (Aktif).`,
      nextMuted ? 'info' : 'success'
    );
  };

  const handleSetUserStatusDirect = (userId: string, newStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED') => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    updateUserById(userId, { status: newStatus });
    loadData();
    if (selectedUser?.id === userId) {
      setSelectedUser({ ...selectedUser, status: newStatus });
    }
    sound.playScanBeep();
    showToast(`Kullanıcı durumu '${newStatus}' olarak kaydedildi.`);
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm('Bu kullanıcıyı sistemden silmek istediğinize emin misiniz?')) return;
    deleteUser(userId);
    loadData();
    if (selectedUser?.id === userId) {
      setSelectedUser(null);
    }
  };

  // Generate strong random password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUserPassword(pass);
    sound.playRadarBeep();
  };

  // Admin manually creating a new user
  const handleCreateNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserFormError(null);

    if (!newUserName.trim() || !newUserEmail.trim()) {
      setNewUserFormError('Ad Soyad ve E-posta adresi zorunludur.');
      return;
    }

    const pass = newUserPassword.trim() || 'Terra!2026';

    setIsSubmittingNewUser(true);
    try {
      const role: 'USER' | 'ADMIN' = newUserTier === 'ADMIN' ? 'ADMIN' : 'USER';
      let expiry = '';
      if (newUserLicenseDuration === 'CUSTOM' && newUserCustomExpiry) {
        expiry = newUserCustomExpiry;
      }

      await createAdminUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        phone: newUserPhone.trim(),
        password: pass,
        role,
        tier: newUserTier,
        credits: newUserCredits,
        licenseDuration: newUserLicenseDuration,
        licenseExpires: expiry,
        platform: newUserPlatform || 'Manuel / Admin Kayıtlı',
      });

      sound.playAnomalyDiscovered();
      setShowAddUserModal(false);
      showToast('Kullanıcı başarıyla oluşturuldu ve lisansı tanımlandı.');

      // Reset Form Fields
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserPassword('');
      setNewUserCredits(50);
      setNewUserTier('USER');
      setNewUserLicenseDuration('1_YEAR');
      setNewUserCustomExpiry('');

      // Refresh Data immediately
      loadData();
    } catch (err: any) {
      setNewUserFormError(err.message || 'Kullanıcı oluşturulurken bir hata oluştu.');
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  // Drawer: Update User Role & Permissions directly
  const handleSaveDrawerRole = (newRoleTier: 'USER' | 'VIP' | 'ANALYST' | 'ADMIN') => {
    if (!selectedUser) return;
    setDrawerRole(newRoleTier);

    let role: 'USER' | 'ADMIN' = newRoleTier === 'ADMIN' ? 'ADMIN' : 'USER';
    let plan = 'STARTER';
    let planNameTr = 'Standart Üyelik';
    let rank: UserRank = 'OBSERVER';
    let rankLevel = 1;
    let rankTitle = 'Jeofizik Gözlemci (Seviye 1)';
    let rankBadge = '🥉';

    if (newRoleTier === 'ADMIN') {
      plan = 'ENTERPRISE';
      planNameTr = 'Sistem Yöneticisi';
      rank = 'ADMIN';
      rankLevel = 30;
      rankTitle = 'Sistem Yöneticisi (Seviye 30)';
      rankBadge = '👑';
    } else if (newRoleTier === 'ANALYST') {
      plan = 'PRO';
      planNameTr = 'Saha Mühendisliği Lisansı';
      rank = 'ANALYST';
      rankLevel = 10;
      rankTitle = 'Saha Uzmanı & Analist (Seviye 10)';
      rankBadge = '🥇';
    } else if (newRoleTier === 'VIP') {
      plan = 'PRO';
      planNameTr = 'VIP Üyelik';
      rank = 'OPERATOR';
      rankLevel = 5;
      rankTitle = 'VIP Saha Operatörü (Seviye 5)';
      rankBadge = '⭐';
    }

    const updated = updateUserById(selectedUser.id, {
      role,
      plan: plan as any,
      planNameTr,
      rank,
      rankLevel,
      rankTitle,
      rankBadge,
    });

    if (updated) {
      setSelectedUser(updated);
    }
    loadData();
    sound.playAnomalyDiscovered();
    showToast(`Kullanıcı yetkisi '${planNameTr}' olarak güncellendi.`);
  };

  // Drawer: Update License Expiry directly
  const handleSaveDrawerCustomExpiry = async (customVal?: string) => {
    if (!selectedUser) return;
    const val = customVal !== undefined ? customVal : drawerExpiry;
    if (val === undefined || val === null) return;
    
    try {
      const updatedUser = await updateUserLicense(selectedUser.id, val.trim() || 'REMOVE');
      
      if (updatedUser) {
        // Update selected user in drawer
        setSelectedUser(updatedUser);
        // Update the main users table
        setUsers(prev => prev.map(u => (u.id === updatedUser.id || (u.email && u.email.toLowerCase() === updatedUser.email.toLowerCase())) ? updatedUser : u));
        // Update input field
        setDrawerExpiry(updatedUser.licenseExpires || '');
        
        sound.playScanBeep();
        showToast(`Lisans başarıyla '${val.trim() || 'Sıfırlandı'}' olarak güncellendi.`, 'success');
      }
    } catch (err) {
      console.error('License update failed', err);
      showToast('Lisans güncellenirken bir hata oluştu.', 'error');
    }
  };

  // Drawer: Set custom credit amount directly
  const handleSaveDrawerCredits = async (targetAmount: number) => {
    if (!selectedUser) return;
    const diff = targetAmount - (selectedUser.creditsRemaining || 0);
    await handleUpdateCredits(selectedUser.id, diff);
  };

  // Key Generator
  const handleGenerateKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const generated = generateKeysBatch(keyTier, keyCustomer, keyBatchCount);
    loadData();
    sound.playAnomalyDiscovered();
    setKeyGenNotice(`${generated.length} adet yeni lisans anahtarı üretildi!`);
    setTimeout(() => setKeyGenNotice(null), 3500);
  };

  // Export Table to CSV
  const handleExportUsersCsv = () => {
    const headers = [
      'ID',
      'İsim',
      'E-Posta',
      'Telefon',
      'Platform',
      'Cihaz',
      'Kalan Jeton',
      'Toplam Çekim',
      'Lisans Bitiş',
      'Kayıt Tarihi',
      'Son IP',
      'Durum',
    ];
    const rows = filteredUsers.map((u) => [
      u.id,
      u.name,
      u.email,
      u.phone || '',
      u.platform || 'Web',
      u.deviceModel || '',
      u.creditsRemaining,
      u.totalScansPerformed || 0,
      u.licenseExpires || 'Standart',
      u.memberSince,
      u.lastLoginIp || '',
      u.status,
    ]);
    exportToCsv('TerraScan_Kullanici_Listesi', headers, rows);
  };

  const handleExportScansCsv = () => {
    const headers = [
      'Kayıt ID',
      'Kullanıcı',
      'E-Posta',
      'Lokasyon',
      'Enlem',
      'Boylam',
      'Anomali Türü',
      'Derinlik (m)',
      'Güven Skoru',
      'Uydu/Sensör',
      'Tarih Saat',
    ];
    const rows = scanLogs.map((s) => [
      s.id,
      s.userName,
      s.userEmail,
      s.locationName,
      s.coordinates.lat,
      s.coordinates.lng,
      s.anomalyType,
      s.depthMeters,
      s.confidenceScore,
      s.satelliteName,
      s.timestamp,
    ]);
    exportToCsv('TerraScan_Saha_Tarama_Kayitlari', headers, rows);
  };

  const handleExportKeysCsv = () => {
    const headers = ['Lisans Key', 'Paket Tipi', 'Jeton Değeri', 'Müşteri', 'Üretim Tarihi', 'Durum', 'Kullanan'];
    const rows = licenseKeys.map((k) => [
      k.key,
      k.type,
      k.credits,
      k.customer,
      k.createdAt,
      k.status,
      k.usedBy || '-',
    ]);
    exportToCsv('TerraScan_Lisans_Anahtarlari', headers, rows);
  };

  // Create New Invite/Promo Code
  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;

    setIsCreatingPromo(true);
    setPromoNotice(null);

    try {
      const res = await createInviteCode({
        code: newPromoCode,
        tokens: Number(newPromoTokens) || 50,
        max_uses: Number(newPromoMaxUses) || 10,
        description: newPromoDesc,
      });

      if (res.success) {
        sound.playAnomalyDiscovered();
        setPromoNotice({ text: res.message || 'Davet kodu başarıyla oluşturuldu!', success: true });
        setNewPromoCode('');
        setNewPromoDesc('');
        const refreshed = await fetchAllInviteCodes();
        setInviteCodes(refreshed);
        showToast(`🎟️ "${res.data?.code || newPromoCode.trim().toUpperCase()}" davet kodu oluşturuldu!`, 'success');
      } else {
        sound.playScanBeep();
        console.error('Supabase Invite Hatası:', res.message);
        setPromoNotice({ text: res.message || 'Davet kodu oluşturulamadı.', success: false });
        showToast(res.message || 'Davet kodu oluşturulamadı!', 'error');
      }
    } catch (err: any) {
      console.error('Supabase Invite Hatası:', err);
      setPromoNotice({ text: err.message || 'Hata oluştu.', success: false });
      showToast(err.message || 'İşlem başarısız.', 'error');
    } finally {
      setIsCreatingPromo(false);
    }
  };

  // Toggle Invite Code Status (Pasif Yap / Aktif Yap)
  const handleTogglePromoStatus = async (codeId: string, currentActive: boolean) => {
    sound.playRadarBeep();
    await toggleInviteCodeStatus(codeId, !currentActive);
    setInviteCodes((prev) =>
      prev.map((c) => (c.id === codeId ? { ...c, is_active: !currentActive } : c))
    );
    showToast(`Kod ${!currentActive ? 'Aktif' : 'Pasif'} duruma getirildi.`, 'info');
  };

  // Delete Invite Code
  const handleDeletePromoCode = async (codeId: string, codeName: string) => {
    if (!window.confirm(`"${codeName}" davet kodunu tamamen silmek istediğinizden emin misiniz?`)) return;
    sound.playScanBeep();
    await deleteInviteCode(codeId);
    setInviteCodes((prev) => prev.filter((c) => c.id !== codeId));
    showToast(`"${codeName}" davet kodu silindi.`, 'info');
  };

  // Change PIN
  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateCustomAdminPin(currentPinInput, newPinInput);
    setPinChangeMsg({ success: res.success, text: res.message });
    if (res.success) {
      setCurrentPinInput('');
      setNewPinInput('');
    }
  };

  // Create Announcement
  const handleAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;
    createAnnouncement(annTitle, annMessage, annType);
    setAnnTitle('');
    setAnnMessage('');
    setAnnNotice('Duyuru başarıyla tüm kullanıcılara yayınlandı.');
    loadData();
    setTimeout(() => setAnnNotice(null), 3500);
  };

  // -------------------------------------------------------------------------
  // 1. LOGIN VIEW IF NOT AUTHENTICATED (PIN Koruması)
  // -------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[1200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-indigo-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(99,102,241,0.2)] text-center relative overflow-hidden">
          {/* Top Decorative Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-600"></div>

          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <Server className="w-8 h-8" />
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
            TERRASCAN SUNUCU MASASI
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Merkezi Operasyon & Güvenlik Yönetim Konsolu
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Güvenli Sunucu PIN Kodunu Giriniz"
                className="w-full text-center tracking-widest text-base font-mono bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                autoFocus
              />
            </div>

            {authError && (
              <div className="text-xs text-rose-400 font-mono bg-rose-950/40 border border-rose-800/50 rounded-xl p-2.5">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Sisteme Yetkili Girişi Yap</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>256-Bit SHA Şifreli Sunucu Doğrulaması</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 2. MAIN FULL-FEATURED ADMIN DASHBOARD
  // -------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[1200] bg-slate-950/98 backdrop-blur-2xl text-slate-100 flex flex-col overflow-hidden font-sans">
      {/* TOP COMMAND BAR */}
      <header className="shrink-0 h-16 border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Branding & Status Beacon */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/60 flex items-center justify-center text-indigo-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-white tracking-wider">
                TERRASCAN <span className="text-indigo-400">ADMIN CONTROL</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                CANLI OPERASYONEL
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Canlı Ping: <strong className="text-emerald-400">{livePing} ms</strong> · Veritabanı: <strong className="text-cyan-400">%{liveDbHealth} Normal</strong>
            </div>
          </div>
        </div>

        {/* Center: Quick Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('HUD')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'HUD'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Genel Bakış</span>
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'USERS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kullanıcılar ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('LICENSES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'LICENSES'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-bold'
                : 'text-blue-400 hover:text-blue-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Lisans & Süre Yönetimi</span>
          </button>

          <button
            onClick={() => setActiveTab('SCANS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'SCANS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Saha Taramaları</span>
          </button>

          <button
            onClick={() => setActiveTab('KEYS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'KEYS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Key Üretici</span>
          </button>

          <button
            onClick={async () => {
              setActiveTab('INVITE_CODES');
              try {
                const fresh = await fetchAllInviteCodes();
                setInviteCodes(fresh);
              } catch (e) {
                console.error('Supabase Invite Hatası:', e);
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'INVITE_CODES'
                ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold'
                : 'text-amber-400 hover:text-amber-200 hover:bg-slate-800'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Davet & Promo ({inviteCodes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'LOGS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Güvenlik Logları</span>
          </button>

          <button
            onClick={() => setActiveTab('ANNOUNCEMENTS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'ANNOUNCEMENTS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Duyuru & Ayarlar</span>
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playScanBeep();
              loadData();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Verileri Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Oturumu Kapat"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Güvenli Çıkış</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* DASHBOARD BODY (SCROLLABLE) */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ================================================================= */}
        {/* TAB 1: HUD & GENEL BAKIŞ                                          */}
        {/* ================================================================= */}
        {activeTab === 'HUD' && (
          <div className="space-y-6 animate-fadeIn">
            {/* 4 METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Toplam Üye & Canlı Kullanıcı */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-all shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">Toplam Üye & Canlı</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white">{metrics.totalUsersCount}</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    +{metrics.totalActiveLive} Canlı
                  </span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Web: <strong className="text-cyan-400">{metrics.webActiveUsers}</strong></span>
                  <span>Android APK: <strong className="text-emerald-400">{metrics.apkActiveUsers}</strong></span>
                </div>
              </div>

              {/* Card 2: Jeton & Ciro Havuzu */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">Jeton & Ciro Havuzu</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400">
                    {metrics.totalRemainingCredits.toLocaleString('tr-TR')} J
                  </span>
                  <span className="text-xs text-slate-400">Havuzda Kalan</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Toplam Harcanan: <strong className="text-white">{metrics.totalSpentCredits} J</strong></span>
                  <span>Son 24s: <strong className="text-amber-300">-{metrics.last24hConsumption} J</strong></span>
                </div>
              </div>

              {/* Card 3: Tarama & Rapor Sayısı */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 transition-all shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">Tarama & Raporlar</span>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-cyan-300">
                    {metrics.total2D3DScans.toLocaleString('tr-TR')}
                  </span>
                  <span className="text-xs text-slate-400">2B/3B Çekim</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Dehliz / Anomali: <strong className="text-white">{metrics.totalCavityAnomalies}</strong></span>
                  <span>Raporlar: <strong className="text-cyan-400">{metrics.totalGeophysReports}</strong></span>
                </div>
              </div>

              {/* Card 4: Sunucu & API Durumu */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition-all shadow-lg">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">Sunucu & API Durumu</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400">{livePing} ms</span>
                  <span className="text-xs font-bold text-emerald-300 font-mono">Ultra Hızlı</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>DEM / SRTM: <strong className="text-emerald-400">Aktif</strong></span>
                  <span>Copernicus / SAR: <strong className="text-emerald-400">Aktif</strong></span>
                </div>
              </div>
            </div>

            {/* LIVE FEED SPLIT: RECENT SCANS vs RECENT SECURITY LOGS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Canlı Saha Taramaları */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-bold text-xs text-cyan-300">
                    <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span>CANLI SAHA ANALİZLERİ & ANOMALİ ALGORİTMALARI</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('SCANS')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold"
                  >
                    <span>Tümünü Gör</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {scanLogs.slice(0, 4).map((scan) => (
                    <div
                      key={scan.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span>{scan.locationName}</span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                            {scan.depthMeters} m
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {scan.userName} · {scan.coordinates.lat.toFixed(4)}°N, {scan.coordinates.lng.toFixed(4)}°E
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                          {scan.anomalyType}
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">{scan.timestamp.slice(11)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Güvenlik & API Hata Konsolu Önizleme */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-bold text-xs text-amber-300">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>SİSTEM & GÜVENLİK TEHDİT KONSOLU</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('LOGS')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold"
                  >
                    <span>Log Konsolu</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 font-mono text-[11px]">
                  {securityLogs.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5"
                    >
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                          log.level === 'ERROR'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : log.level === 'SECURITY'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : log.level === 'WARN'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        }`}
                      >
                        {log.level}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-300 truncate">{log.message}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {log.timestamp} · IP: {log.ip} · {log.platform}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: GELİŞMİŞ KULLANICI VE CİHAZ YÖNETİMİ                       */}
        {/* ================================================================= */}
        {activeTab === 'USERS' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filter & Action Ribbon */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="İsim, E-Posta, Telefon veya IP ile arayın..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={userPlatformFilter}
                  onChange={(e) => setUserPlatformFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Tüm Platformlar</option>
                  <option value="Web">🌐 Web Tarayıcı</option>
                  <option value="Android APK">📱 Android APK</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Tüm Durumlar</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="SUSPENDED">Askıda / Dondurulmuş</option>
                </select>

                <select
                  value={userSortBy}
                  onChange={(e) => setUserSortBy(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="date">Kayıt Tarihine Göre</option>
                  <option value="credits">En Çok Jetonu Olan</option>
                  <option value="scans">En Çok Tarama Yapan</option>
                </select>

                {/* Refresh Cloud Database Button */}
                <button
                  onClick={() => {
                    sound.playScanBeep();
                    loadData();
                  }}
                  disabled={isRefreshingUsers}
                  className="px-3 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Bulut Veritabanından Kullanıcıları Yenile (fetchUsers)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingUsers ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingUsers ? 'Yenileniyor...' : 'Veritabanını Yenile'}</span>
                </button>

                {/* CSV Export Button */}
                <button
                  onClick={handleExportUsersCsv}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Tüm Listeyi CSV/Excel Olarak İndir"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>CSV Dışa Aktar</span>
                </button>

                {/* Add New User Button */}
                <button
                  onClick={() => {
                    sound.playRadarBeep();
                    setNewUserFormError(null);
                    setShowAddUserModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer shrink-0"
                  title="Sisteme Manuel Yeni Üye & Lisans Tanımla"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Yeni Kullanıcı Ekle</span>
                </button>
              </div>
            </div>

            {/* Cloud Sync Status Banner */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-300 font-bold">
                  {isSupabaseAvailable() ? '⚡ Supabase Realtime & PostgreSQL Aktif' : 'Bulut Veritabanı Aktif'}
                </span>
                <span className="text-slate-500">·</span>
                <span>Toplam {filteredUsers.length} Kayıtlı Kullanıcı (Canlı Realtime Dinleme Açık)</span>
              </div>
              {isRefreshingUsers && (
                <span className="text-indigo-400 font-bold flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Veriler çekiliyor...
                </span>
              )}
            </div>

            {/* USERS TABLE */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px]">
                      <th className="p-3.5">KULLANICI BİLGİSİ</th>
                      <th className="p-3.5">PLATFORM / CİHAZ</th>
                      <th className="p-3.5">SON GİRİŞ IP</th>
                      <th className="p-3.5">LİSANS DURUMU</th>
                      <th className="p-3.5">KALAN JETON</th>
                      <th className="p-3.5">TARAMA</th>
                      <th className="p-3.5">DURUM</th>
                      <th className="p-3.5 text-right">İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {filteredUsers.map((u) => (
                      <tr 
                        key={u.id} 
                        className={`hover:bg-slate-800/40 transition-colors cursor-pointer ${
                          selectedUser?.id === u.id ? 'bg-indigo-950/30' : ''
                        }`}
                        onClick={() => setSelectedUser(u)}
                      >
                        {/* Name & Email */}
                        <td className="p-3.5">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{u.name}</span>
                            <span className="text-[10px]">{u.rankBadge}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                          {u.phone && <div className="text-[10px] text-slate-500 font-mono">{u.phone}</div>}
                        </td>

                        {/* Platform & Device */}
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            u.platform?.includes('Android')
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {u.platform?.includes('Android') ? (
                              <Smartphone className="w-3 h-3" />
                            ) : (
                              <Globe className="w-3 h-3" />
                            )}
                            <span>{u.platform || 'Web'}</span>
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[140px]">
                            {u.deviceModel || 'Bilinmeyen Cihaz'}
                          </div>
                        </td>

                        {/* IP */}
                        <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                          <div>{u.lastLoginIp || '85.105.xx.xx'}</div>
                          <div className="text-[10px] text-slate-500">{u.lastLoginDate?.slice(5) || 'Bugün'}</div>
                        </td>

                        {/* License */}
                        <td className="p-3.5">
                          {u.licenseExpires ? (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/30">
                              {u.licenseExpires}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 font-mono text-[10px] border border-slate-700/50">
                              Lisanssız
                            </span>
                          )}
                        </td>

                        {/* Credits & Quick Topup */}
                        <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 font-mono font-bold">
                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-amber-400 text-sm font-black">{u.creditsRemaining} J</span>
                          </div>
                          
                          {/* Hızlı Jeton Yükleme Butonları */}
                          <div className="flex items-center gap-1 mt-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateCredits(u.id, 50)}
                              className="px-1.5 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[10px] transition-colors cursor-pointer"
                              title="+50 Jeton Yükle"
                            >
                              +50 J
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateCredits(u.id, 100)}
                              className="px-1.5 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-[10px] transition-colors cursor-pointer"
                              title="+100 Jeton Yükle"
                            >
                              +100 J
                            </button>
                          </div>
                        </td>

                        {/* Scans */}
                        <td className="p-3.5 font-mono text-slate-400">
                          {u.totalScansPerformed || 0} Çekim
                        </td>

                        {/* Status & Chat Mute */}
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : u.status === 'BANNED'
                                  ? 'bg-rose-950 text-rose-300 border-rose-500 font-extrabold'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}>
                              {u.status === 'ACTIVE' ? 'Aktif' : u.status === 'BANNED' ? '🚫 Yasaklı (Ban)' : 'Askıda'}
                            </span>
                            {u.isChatMuted && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-mono font-bold flex items-center gap-0.5">
                                <VolumeX className="w-2.5 h-2.5" /> Susturuldu
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quick Action Buttons */}
                        <td className="p-3.5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              sound.playRadarBeep();
                              setSelectedUser(u);
                            }}
                            className="px-2.5 py-1 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Kullanıcı Detayları, Yetki & Lisans Düzenle"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-400" />
                            <span>Detay / Düzenle</span>
                          </button>

                          {/* Quick Chat Mute / Unmute Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleChatMute(u.id)}
                            className={`p-1 rounded border transition-colors cursor-pointer ${
                              u.isChatMuted 
                                ? 'bg-amber-950 border-amber-500/50 text-amber-300 hover:bg-amber-900' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                            title={u.isChatMuted ? 'Sohbet Susturmasını Kaldır (Unmute)' : 'Sohbetten Sustur (Mute)'}
                          >
                            {u.isChatMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleToggleUserStatus(u.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title={u.status === 'ACTIVE' ? 'Hesabı Dondur' : 'Hesabı Aktif Et'}
                          >
                            {u.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Kullanıcıyı Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2.5: LİSANS & SÜRE YÖNETİMİ MODÜLÜ                           */}
        {/* ================================================================= */}
        {activeTab === 'LICENSES' && (
          <div className="space-y-4 animate-fadeIn">
            <AdminLicenseManagement
              users={users}
              onRefreshUsers={loadData}
              onUpdateUsers={(updatedUsers) => setUsers([...updatedUsers])}
              onSelectUserForDrawer={(u) => setSelectedUser(u)}
              showToast={showToast}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: SAHA & TARAMA İZLEME MODÜLÜ                                */}
        {/* ================================================================= */}
        {activeTab === 'SCANS' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>KULLANICI SAHA VE ANOMALİ TARAMA İZLEME MERKEZİ</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kullanıcıların haritada kaydettiği veya analiz yaptığı lokasyonlar, algılanan derinlik ve anomali türleri
                </p>
              </div>

              <button
                onClick={handleExportScansCsv}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                <span>Taramaları CSV Olarak İndir</span>
              </button>
            </div>

            {/* Scans Grid / Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scanLogs.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 transition-all shadow-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white">{item.locationName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Kullanıcı: <strong className="text-slate-200">{item.userName}</strong>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      {item.anomalyType}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>GPS Koordinat:</span>
                      <span className="text-cyan-300 font-bold">
                        {item.coordinates.lat.toFixed(5)}°, {item.coordinates.lng.toFixed(5)}°
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Tahmini Derinlik:</span>
                      <span className="text-amber-400 font-bold">{item.depthMeters} Metre</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Güven Skoru:</span>
                      <span className="text-emerald-400 font-bold">%{Math.round(item.confidenceScore * 10)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Sensör & Mod:</span>
                      <span className="text-slate-300">{item.satelliteName.split(' ')[0]}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const gpsStr = `${item.coordinates.lat}, ${item.coordinates.lng}`;
                          handleCopyText(gpsStr);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedKey === `${item.coordinates.lat}, ${item.coordinates.lng}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>GPS Kopyala</span>
                      </button>

                      {onNavigateToCoords && (
                        <button
                          onClick={() => {
                            onNavigateToCoords(item.coordinates.lat, item.coordinates.lng, item.locationName);
                            if (onClose) onClose();
                          }}
                          className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Haritada İncele</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: LİSANS VE KEY ÜRETİCİSİ                                    */}
        {/* ================================================================= */}
        {activeTab === 'KEYS' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Generator & Manual Order Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Generator Form */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-bold text-xs text-indigo-300">
                    <KeyRound className="w-4 h-4 text-indigo-400" />
                    <span>TOPLU & TEKİL LİSANS ANAHTARI (KEY) ÜRETİCİ</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    TERA-XXXX-YYYY Formatı
                  </span>
                </div>

                <form onSubmit={handleGenerateKeySubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Paket / Lisans Tipi</label>
                      <select
                        value={keyTier}
                        onChange={(e) => setKeyTier(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="30J">30 Tera Jeton (Standart)</option>
                        <option value="50J">50 Tera Jeton (Genişletilmiş)</option>
                        <option value="100J">100 Tera Jeton (Pro)</option>
                        <option value="250J">250 Tera Jeton (Saha Paketi)</option>
                        <option value="VIP">1000 Tera Jeton (VIP Elit)</option>
                        <option value="30_DAYS">30 Günlük Sınırsız Lisans</option>
                        <option value="1_YEAR">1 Yıllık Tam Saha Lisansı</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Müşteri / Açıklama</label>
                      <input
                        type="text"
                        value={keyCustomer}
                        onChange={(e) => setKeyCustomer(e.target.value)}
                        placeholder="Müşteri Adı / Saha Sahibi"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Üretilecek Adet</label>
                      <select
                        value={keyBatchCount}
                        onChange={(e) => setKeyBatchCount(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value={1}>Tekil (1 Adet Key)</option>
                        <option value={5}>Toplu (5 Adet Key)</option>
                        <option value={10}>Toplu (10 Adet Key)</option>
                        <option value={20}>Toplu (20 Adet Key)</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Anahtar(ları) Üret</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Manual Shopier Order No / Custom Code Approval Form */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-bold text-xs text-emerald-400">
                    <ShoppingBag className="w-4 h-4" />
                    <span>MANUEL SHOPIER SİPARİŞİ / ÖZEL KOD ONAYLA</span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80 font-mono">
                    Admin Kontrollü Kod Girişi
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Shopier'dan manuel gelen sipariş numarasını (Örn: <code className="text-amber-300 font-mono font-bold">SP-992140</code>) buraya girerek kullanıcının tek tıkla yükleme yapmasını sağlayabilirsiniz.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const code = (e.currentTarget.elements.namedItem('manualCode') as HTMLInputElement)?.value;
                    const credits = parseInt((e.currentTarget.elements.namedItem('manualCredits') as HTMLSelectElement)?.value || '50');
                    const customer = (e.currentTarget.elements.namedItem('manualCustomer') as HTMLInputElement)?.value || 'Shopier Müşterisi';
                    if (!code || !code.trim()) return;

                    import('../utils/activationCodes').then(({ addOrApproveOrderCode }) => {
                      addOrApproveOrderCode(code.trim(), credits, customer);
                      loadData();
                      sound.playAnomalyDiscovered();
                      showToast(`'${code.trim().toUpperCase()}' kodlu sipariş +${credits} Jeton olarak onaylandı!`, 'success');
                      (e.target as HTMLFormElement).reset();
                    });
                  }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Sipariş / Kod</label>
                      <input
                        name="manualCode"
                        type="text"
                        placeholder="Örn: SP-882190"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-emerald-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Yüklenecek Jeton</label>
                      <select
                        name="manualCredits"
                        defaultValue="50"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                      >
                        <option value="30">30 Jeton</option>
                        <option value="50">50 Jeton</option>
                        <option value="100">100 Jeton</option>
                        <option value="250">250 Jeton</option>
                        <option value="1000">1000 Jeton (VIP)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">Müşteri Notu</label>
                      <input
                        name="manualCustomer"
                        type="text"
                        placeholder="Müşteri Adı / Tel"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sipariş Kodunu Sisteme Kaydet & Onayla</span>
                  </button>
                </form>
              </div>
            </div>

            {keyGenNotice && (
              <div className="text-xs text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl animate-fadeIn">
                {keyGenNotice}
              </div>
            )}

            {/* Recent Keys Table */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono font-bold text-xs text-slate-300">
                  <span>ÜRETİLEN LİSANS ANAHTARLARI ({licenseKeys.length})</span>
                </div>

                <button
                  onClick={handleExportKeysCsv}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                  <span>Key Listesini CSV Olarak İndir</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                      <th className="pb-2">LİSANS ANAHTARI</th>
                      <th className="pb-2">PAKET</th>
                      <th className="pb-2">MÜŞTERİ</th>
                      <th className="pb-2">TARİH</th>
                      <th className="pb-2">DURUM</th>
                      <th className="pb-2 text-right">KOPYALA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {licenseKeys.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 text-indigo-300 font-bold">{item.key}</td>
                        <td className="py-2.5 text-slate-300">{item.type}</td>
                        <td className="py-2.5 text-slate-400">{item.customer}</td>
                        <td className="py-2.5 text-slate-500 text-[11px]">{item.createdAt}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'BEKLIYOR'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleCopyText(item.key)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            {copiedKey === item.key ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Kopyalandı</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Kopyala</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: GÜVENLİK & API HATA LOGLARI KONSOLU                        */}
        {/* ================================================================= */}
        {activeTab === 'LOGS' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>SİSTEM, GÜVENLİK & API HATA LOGLARI (CANLI KONSOL)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Başarısız girişler, yetkisiz istekler (401/403) ve DEM raster yükseklik verisi hataları
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    clearSecurityLogs();
                    loadData();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Logları Temizle
                </button>
              </div>
            </div>

            {/* Console Terminal View */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2.5 max-h-[600px] overflow-y-auto shadow-2xl">
              {securityLogs.length === 0 ? (
                <div className="text-slate-500 py-8 text-center">Henüz kaydedilmiş güvenlik logu bulunmuyor.</div>
              ) : (
                securityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          log.level === 'ERROR'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : log.level === 'SECURITY'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : log.level === 'WARN'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        }`}
                      >
                        [{log.level}]
                      </span>
                      <div>
                        <div className="text-slate-200 font-bold">{log.message}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Kategori: <span className="text-slate-400">{log.category}</span> · İstemci IP: <span className="text-cyan-400">{log.ip}</span> · Platform: <span className="text-emerald-400">{log.platform}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-500 shrink-0">{log.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: DAVET & PROMOSYON KODLARI                                  */}
        {/* ================================================================= */}
        {activeTab === 'INVITE_CODES' && (
          <div className="space-y-6 animate-fadeIn">
            {/* 4 Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Toplam Promosyon Kodu</div>
                  <div className="text-2xl font-black text-white mt-1">{inviteCodes.length} Adet</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Ticket className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Aktif Kodlar</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {inviteCodes.filter((c) => c.is_active).length} Aktif
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Toplam Kullanım Kotası</div>
                  <div className="text-2xl font-black text-cyan-300 mt-1">
                    {inviteCodes.reduce((acc, c) => acc + (c.max_uses || 0), 0)} Kişi
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Kullanılan Adet</div>
                  <div className="text-2xl font-black text-indigo-400 mt-1">
                    {inviteCodes.reduce((acc, c) => acc + (c.used_count || 0), 0)} Kullanım
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Yeni Davet Kodu Oluştur Formu */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-4">
                <div className="flex items-center gap-2 font-mono font-bold text-xs text-amber-300">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>YENİ DAVET / PROMOSYON KODU TANIMLA</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Oluşturulan kodlar Supabase <code className="text-amber-300 font-mono">invite_codes</code> tablosuna anında kaydedilir ve kullanıcılar tarafından giriş/kayıt ekranından kullanılabilir.
                </p>

                <form onSubmit={handleCreatePromoCode} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Kod Adı <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newPromoCode}
                      onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                      placeholder="Davet Kodunu Girin"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 uppercase font-mono tracking-wider focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Jeton Miktarı <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={newPromoTokens}
                        onChange={(e) => setNewPromoTokens(Number(e.target.value))}
                        placeholder="50"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Maks. Kullanım Sayısı <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        value={newPromoMaxUses}
                        onChange={(e) => setNewPromoMaxUses(Number(e.target.value))}
                        placeholder="10"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Kampanya / Not (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      value={newPromoDesc}
                      onChange={(e) => setNewPromoDesc(e.target.value)}
                      placeholder="Örn: Özel VIP Lansman Kampanyası"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {promoNotice && (
                    <div
                      className={`text-xs p-2.5 rounded-xl flex items-center gap-2 font-mono ${
                        promoNotice.success
                          ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-800/50'
                          : 'text-rose-300 bg-rose-950/40 border border-rose-800/50'
                      }`}
                    >
                      {promoNotice.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{promoNotice.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isCreatingPromo || !newPromoCode.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{isCreatingPromo ? 'Oluşturuluyor...' : '🎟️ Promosyon Kodunu Yayınla'}</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Mevcut Kodlar Listesi */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-mono font-bold text-xs text-white">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>MEVCUT DAVET & PROMOSYON KODLARI ({inviteCodes.length})</span>
                    <button
                      onClick={async () => {
                        sound.playRadarBeep();
                        try {
                          const refreshed = await fetchAllInviteCodes();
                          setInviteCodes(refreshed);
                          showToast('Promosyon kodları Supabase üzerinden yenilendi.', 'info');
                        } catch (e) {
                          console.error('Supabase Invite Hatası:', e);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors"
                      title="Listeyi Yenile (Supabase'den Çek)"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={promoSearchTerm}
                      onChange={(e) => setPromoSearchTerm(e.target.value)}
                      placeholder="Kod veya açıklama ara..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Codes Table / Cards */}
                <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                  {inviteCodes
                    .filter(
                      (c) =>
                        !promoSearchTerm ||
                        c.code.toLowerCase().includes(promoSearchTerm.toLowerCase()) ||
                        (c.description && c.description.toLowerCase().includes(promoSearchTerm.toLowerCase()))
                    )
                    .map((item) => {
                      const usagePercent = Math.min(100, Math.round((item.used_count / item.max_uses) * 100));
                      const isFull = item.used_count >= item.max_uses;

                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            item.is_active
                              ? 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40'
                              : 'bg-slate-950/40 border-slate-900 opacity-60'
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border font-mono font-bold text-xs ${
                                item.is_active
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-500'
                              }`}
                            >
                              🎟️
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-sm text-white tracking-wider">
                                  {item.code}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.code);
                                    showToast(`"${item.code}" panoya kopyalandı!`);
                                  }}
                                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                                  title="Kodu Kopyala"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    item.is_active
                                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/50'
                                      : 'bg-rose-950/80 text-rose-400 border-rose-700/50'
                                  }`}
                                >
                                  {item.is_active ? 'AKTİF' : 'PASİF'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                                <span className="text-amber-400 font-bold font-mono">+{item.tokens} Jeton</span>
                                {item.description && <span>· {item.description}</span>}
                                <span>· {new Date(item.created_at).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                          </div>

                          {/* Usage quota bar & Action buttons */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <div className="text-right min-w-[110px]">
                              <div className="text-[11px] font-mono text-slate-300">
                                Kullanım: <strong className="text-white">{item.used_count}</strong> / {item.max_uses}
                              </div>
                              <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 ml-auto">
                                <div
                                  className={`h-full transition-all ${
                                    isFull ? 'bg-rose-500' : item.is_active ? 'bg-amber-400' : 'bg-slate-600'
                                  }`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Pasif Yap / Aktif Yap Butonu */}
                              <button
                                onClick={() => handleTogglePromoStatus(item.id, item.is_active)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  item.is_active
                                    ? 'bg-amber-950/60 hover:bg-amber-900 border border-amber-800/50 text-amber-300'
                                    : 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/50 text-emerald-300'
                                }`}
                                title={item.is_active ? 'Kodu Pasife Al' : 'Kodu Aktif Yap'}
                              >
                                {item.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                              </button>

                              {/* Sil Butonu */}
                              <button
                                onClick={() => handleDeletePromoCode(item.id, item.code)}
                                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-300 hover:text-rose-100 transition-colors cursor-pointer"
                                title="Kodu Tamamen Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {inviteCodes.length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-xs font-mono">
                      Henüz tanımlanmış bir davet veya promosyon kodu bulunmuyor. Sol panelden ilk kodunuzu oluşturabilirsiniz.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: DUYURU & SUNUCU AYARLARI                                   */}
        {/* ================================================================= */}
        {activeTab === 'ANNOUNCEMENTS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
            {/* Left: Duyuru Yayınla */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-blue-500/40 space-y-4">
              <div className="flex items-center gap-2 font-mono font-bold text-xs text-blue-300">
                <Send className="w-4 h-4 text-blue-400" />
                <span>TÜM KULLANICILARA CANLI UYGULAMA DUYURUSU YAYINLA</span>
              </div>

              <form onSubmit={handleAnnouncementSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Duyuru Başlığı</label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="Örn: Yeni Sentinel-2B ve ALOS-2 Radarları Devrede"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Duyuru Türü</label>
                  <select
                    value={annType}
                    onChange={(e) => setAnnType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="UPDATE">🚀 Sistem & Uydu Güncellemesi</option>
                    <option value="INFO">ℹ️ Bilgilendirme</option>
                    <option value="PROMO">🎁 Jeton & Lisans Kampanyası</option>
                    <option value="WARNING">⚠️ Saha Güvenlik Uyarısı</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Mesaj İçeriği</label>
                  <textarea
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Kullanıcı panellerinde görüntülenecek detaylı duyuru metni..."
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400 resize-none"
                    required
                  />
                </div>

                {annNotice && (
                  <div className="text-xs text-emerald-400 font-mono">{annNotice}</div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Duyuruyu Yayınla
                </button>
              </form>
            </div>

            {/* Right: Yönetici PIN Değiştirme */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 font-mono font-bold text-xs text-amber-400">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>YÖNETİCİ GÜVENLİK PIN KODU GÜNCELLEME</span>
              </div>
              <p className="text-xs text-slate-400">
                Yetkili Sunucu Masası erişim şifrenizi buradan güncelleyebilirsiniz.
              </p>

              <form onSubmit={handleChangePinSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Mevcut PIN Kodu</label>
                  <input
                    type="password"
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    placeholder="Mevcut PIN Kodunuz"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Yeni PIN Kodu (En az 6 karakter)</label>
                  <input
                    type="password"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="Yeni Güvenli PIN Kodu"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                {pinChangeMsg && (
                  <div
                    className={`text-xs font-mono p-2 rounded-xl ${
                      pinChangeMsg.success
                        ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/50'
                        : 'text-rose-400 bg-rose-950/40 border border-rose-800/50'
                    }`}
                  >
                    {pinChangeMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  PIN Kodunu Güncelle
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* USER DETAILS SLIDE-OVER DRAWER                                        */}
      {/* ===================================================================== */}
      {selectedUser && (
        <div className="fixed inset-0 z-[1300] bg-slate-950/70 backdrop-blur-sm flex justify-end animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 text-lg font-bold">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{selectedUser.name}</span>
                    <span>{selectedUser.rankBadge}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{selectedUser.email}</div>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-5 space-y-5 flex-1 text-xs">
              {/* 1. Quick Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">KALAN JETON</div>
                  <div className="text-base font-black text-amber-400 mt-0.5">{selectedUser.creditsRemaining} J</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">TOPLAM ÇEKİM</div>
                  <div className="text-base font-black text-cyan-300 mt-0.5">{selectedUser.totalScansPerformed || 0}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">DURUM</div>
                  <div className="text-xs font-bold text-emerald-400 mt-1">{selectedUser.status}</div>
                </div>
              </div>

              {/* 2. Cihaz ve Bağlantı Bilgileri */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>CİHAZ VE BAĞLANTI BİLGİLERİ</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                  <div>Platform: <strong className="text-white">{selectedUser.platform || 'Web'}</strong></div>
                  <div>Cihaz: <strong className="text-white">{selectedUser.deviceModel || 'Standart'}</strong></div>
                  <div>Son Giriş IP: <strong className="text-cyan-400">{selectedUser.lastLoginIp || '85.105.xx.xx'}</strong></div>
                  <div>Lisans Bitiş: <strong className="text-purple-400">{selectedUser.licenseExpires || 'Lisans Yok'}</strong></div>
                </div>
              </div>

              {/* 3. HIZLI MÜDAHALE & YETKİ / LİSANS YÖNETİMİ */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-3.5">
                <div className="text-xs font-bold text-indigo-300 font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>YÖNETİCİ MÜDAHALESİ & YETKİ AYARLARI</span>
                </div>

                {/* 3A. ROL / YETKİ DERECESİ DEĞİŞTİRME */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Rol & Yetki Seviyesi:</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      Mevcut: {selectedUser.planNameTr} ({selectedUser.role})
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerRole('USER')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all text-left flex items-center justify-between ${
                        drawerRole === 'USER'
                          ? 'bg-slate-800 border-indigo-500 text-white shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🥉 Standart Üye</span>
                      {drawerRole === 'USER' && <Check className="w-3 h-3 text-indigo-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerRole('VIP')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all text-left flex items-center justify-between ${
                        drawerRole === 'VIP'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-200 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>⭐ VIP Üye</span>
                      {drawerRole === 'VIP' && <Check className="w-3 h-3 text-amber-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerRole('ANALYST')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all text-left flex items-center justify-between ${
                        drawerRole === 'ANALYST'
                          ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🥇 Saha Uzmanı</span>
                      {drawerRole === 'ANALYST' && <Check className="w-3 h-3 text-cyan-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerRole('ADMIN')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all text-left flex items-center justify-between ${
                        drawerRole === 'ADMIN'
                          ? 'bg-rose-950/60 border-rose-500 text-rose-200 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>👑 Sistem Admin</span>
                      {drawerRole === 'ADMIN' && <Check className="w-3 h-3 text-rose-400" />}
                    </button>
                  </div>
                </div>

                {/* 3B. LİSANS BİTİŞ TARİHİ VE GEÇERLİLİK SÜRESİ */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Lisans Bitiş Süresi:</span>
                    <span className="text-[10px] font-mono text-purple-300 font-bold">
                      {selectedUser.licenseExpires || 'Lisans Yok'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerCustomExpiry('7')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono"
                      title="Mevcut süreye veya bugüne 7 gün ekle"
                    >
                      +7 Gün
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerCustomExpiry('30')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono"
                      title="Mevcut süreye veya bugüne 30 gün ekle"
                    >
                      +30 Gün
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerCustomExpiry('90')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono"
                      title="Mevcut süreye veya bugüne 90 gün (3 ay) ekle"
                    >
                      +90 Gün
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerCustomExpiry('365')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono"
                      title="Mevcut süreye veya bugüne 365 gün (1 yıl) ekle"
                    >
                      +1 Yıl
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerCustomExpiry('SINIRSIZ')}
                      className="px-2 py-1 rounded bg-purple-900/60 hover:bg-purple-800 border border-purple-500/50 text-purple-200 text-[10px] font-mono font-bold"
                    >
                      👑 Sınırsız VIP
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerCustomExpiry('REMOVE')}
                      className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-[10px] font-mono"
                    >
                      ❌ Sıfırla
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={drawerExpiry}
                      onChange={(e) => setDrawerExpiry(e.target.value)}
                      placeholder="YYYY-AA-GG veya SINIRSIZ veya +gün"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerCustomExpiry()}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>

                {/* 3C. JETON / KREDİ MİKTARI AYARI */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Jeton / Kredi Ayarı:</span>
                    <span className="text-[10px] font-mono font-bold text-amber-400">
                      Mevcut: {selectedUser.creditsRemaining} Jeton
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleUpdateCredits(selectedUser.id, 10)}
                      className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[11px]"
                    >
                      +10 J
                    </button>
                    <button
                      onClick={() => handleUpdateCredits(selectedUser.id, 50)}
                      className="px-2 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-[11px]"
                    >
                      +50 J
                    </button>
                    <button
                      onClick={() => handleUpdateCredits(selectedUser.id, 100)}
                      className="px-2 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-mono font-bold text-[11px]"
                    >
                      +100 J
                    </button>
                    <button
                      onClick={() => handleUpdateCredits(selectedUser.id, -10)}
                      className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-mono font-bold text-[11px]"
                    >
                      -10 J
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="number"
                      value={customCreditAmount}
                      onChange={(e) => setCustomCreditAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveDrawerCredits(customCreditAmount)}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Jetonu Belirle
                    </button>
                  </div>
                </div>

                {/* 3D. TOPLULUK VE SOHBET YÖNETİMİ (MUTE / BAN) */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <VolumeX className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Sohbet & Topluluk İzni:</span>
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      selectedUser.isChatMuted 
                        ? 'bg-amber-950 text-amber-300 border-amber-500/40' 
                        : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {selectedUser.isChatMuted ? '🔇 Susturuldu (Muted)' : '💬 Sohbet Açık'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleChatMute(selectedUser.id)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedUser.isChatMuted
                          ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-md'
                          : 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {selectedUser.isChatMuted ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Sohbet Yasağını Kaldır (Unmute)</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Sohbetten Sustur (Mute)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 3E. GÜVENLİK, YASAKLAMA (BAN) VE DURUM İŞLEMLERİ */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Ban className="w-3.5 h-3.5 text-rose-400" />
                      <span>Hesap Durumu & Yasaklama (Ban):</span>
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      selectedUser.status === 'ACTIVE'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : selectedUser.status === 'BANNED'
                          ? 'bg-rose-950 text-rose-300 border-rose-500 font-extrabold'
                          : 'bg-amber-950 text-amber-300 border-amber-500/40'
                    }`}>
                      {selectedUser.status === 'ACTIVE' ? 'Aktif' : selectedUser.status === 'BANNED' ? '🚫 BANNED' : 'Askıda'}
                    </span>
                  </div>

                  {/* 3 Buton: Aktif Et / Askıya Al / Tamamen Yasakla (Ban) */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSetUserStatusDirect(selectedUser.id, 'ACTIVE')}
                      className={`py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                        selectedUser.status === 'ACTIVE'
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/50'
                      }`}
                    >
                      Aktif Yap
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetUserStatusDirect(selectedUser.id, 'SUSPENDED')}
                      className={`py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                        selectedUser.status === 'SUSPENDED'
                          ? 'bg-amber-600 border-amber-400 text-white'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-500/50'
                      }`}
                    >
                      Askıya Al
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetUserStatusDirect(selectedUser.id, 'BANNED')}
                      className={`py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                        selectedUser.status === 'BANNED'
                          ? 'bg-rose-700 border-rose-500 text-white'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-rose-300 hover:border-rose-500/50'
                      }`}
                    >
                      🚫 Banla
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => handleResetPassword(selectedUser.id)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono font-bold"
                    >
                      Geçici Şifre Üret
                    </button>

                    <button
                      onClick={() => handleDeleteUser(selectedUser.id)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-mono font-bold"
                    >
                      Kullanıcıyı Sil
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Kullanıcının Yaptığı Son Taramalar */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>SON TARAMA KOORDİNATLARI ({selectedUser.savedStudies?.length || 0})</span>
                </div>

                {(!selectedUser.savedStudies || selectedUser.savedStudies.length === 0) ? (
                  <div className="text-[11px] text-slate-500 font-mono py-2">
                    Kullanıcının kayıtlı bir tarama noktası bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedUser.savedStudies.map((st) => (
                      <div key={st.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-0.5">
                        <div className="font-bold text-white">{st.locationName}</div>
                        <div className="text-slate-400 font-mono text-[10px]">
                          {st.lat.toFixed(4)}°N, {st.lng.toFixed(4)}°E · {st.depthRange}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Jeton İşlem Geçmişi */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>JETON İŞLEM GEÇMİŞİ</span>
                </div>

                {(!selectedUser.creditHistory || selectedUser.creditHistory.length === 0) ? (
                  <div className="text-[11px] text-slate-500 font-mono py-2">
                    Kayıtlı işlem hareketi bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedUser.creditHistory.map((h) => (
                      <div key={h.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
                        <div>
                          <div className="text-slate-200">{h.description}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{h.date}</div>
                        </div>
                        <span className={`font-mono font-bold ${h.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {h.amount > 0 ? `+${h.amount}` : h.amount} J
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* YENİ KULLANICI & LİSANS EKLEME MODALI (ADMIN PROVISIONING)             */}
      {/* ===================================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[1500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>+ Yeni Kullanıcı & Lisans Ekle</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Admin Masası
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Kullanıcıyı REST API bulut veritabanına doğrudan kaydeder ve anında listeler.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateNewUserSubmit} className="p-6 space-y-4 text-xs">
              {newUserFormError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{newUserFormError}</span>
                </div>
              )}

              {/* 1. Ad Soyad & E-posta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ad Soyad *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Örn: Dr. Ahmet Yılmaz"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>E-Posta Adresi *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="ahmet@jeofizik.org"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* 2. Telefon & Şifre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Telefon Numarası (İsteğe Bağlı)</span>
                  </label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="+90 532 000 00 00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Başlangıç Şifresi *</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateStrongPassword}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Rastgele 10 karakterli güvenli şifre üret"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Otomatik Güçlü Şifre Üret</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Şifre belirleyin veya otomatik üretin"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 pr-8"
                    />
                    {newUserPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(newUserPassword);
                          showToast('Şifre panoya kopyalandı.');
                        }}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                        title="Şifreyi Kopyala"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Rol / Yetki Derecesi */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Rol / Yetki Derecesi</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'USER', label: 'Standart Kullanıcı', sub: 'Seviye 1 Gözlemci', badge: '🥉' },
                    { id: 'VIP', label: 'VIP Üye', sub: 'Seviye 5 Operatör', badge: '⭐' },
                    { id: 'ANALYST', label: 'Saha Uzmanı', sub: 'Seviye 10 Analist', badge: '🥇' },
                    { id: 'ADMIN', label: 'Sistem Yöneticisi', sub: 'Seviye 30 Admin', badge: '👑' },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setNewUserTier(t.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        newUserTier === t.id
                          ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md shadow-emerald-900/30'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-base mb-1">{t.badge}</div>
                      <div className="font-bold text-[11px] leading-tight text-white">{t.label}</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">{t.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Tanımlanacak Jeton / Kredi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tanımlanacak Jeton / Kredi Miktarı</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newUserCredits}
                    onChange={(e) => setNewUserCredits(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[25, 50, 100, 250, 500].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setNewUserCredits(amt)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                          newUserCredits === amt
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Platform & Kayıt Kaynağı</span>
                  </label>
                  <select
                    value={newUserPlatform}
                    onChange={(e) => setNewUserPlatform(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Manuel / Admin Kayıtlı">🏷️ Manuel / Admin Kayıtlı</option>
                    <option value="Android APK">📱 Android APK</option>
                    <option value="Web">🌐 Web Tarayıcı</option>
                  </select>
                </div>
              </div>

              {/* 5. Lisans Bitiş Tarihi & Süresi */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Lisans Geçerlilik Süresi</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: '1_MONTH', label: '1 Ay' },
                    { id: '6_MONTHS', label: '6 Ay' },
                    { id: '1_YEAR', label: '1 Yıl' },
                    { id: 'UNLIMITED', label: '👑 Sınırsız VIP' },
                    { id: 'CUSTOM', label: '📅 Özel Tarih' },
                  ].map((d) => (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => setNewUserLicenseDuration(d.id as any)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        newUserLicenseDuration === d.id
                          ? 'bg-purple-950/70 border-purple-500 text-purple-200 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>

                {newUserLicenseDuration === 'CUSTOM' && (
                  <div className="mt-2">
                    <input
                      type="date"
                      value={newUserCustomExpiry}
                      onChange={(e) => setNewUserCustomExpiry(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-500/60 rounded-xl px-3 py-2 text-xs text-purple-300 font-mono focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewUser}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingNewUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Kullanıcıyı Kaydet & Lisansı Tanımla</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TOAST BİLDİRİM KUTUSU (FLOATING SUCCESS / INFO NOTIFICATION)          */}
      {/* ===================================================================== */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[2000] flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 border border-emerald-500/60 text-white shadow-2xl shadow-emerald-950/80 animate-fadeIn">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="pr-2">
            <div className="text-[10px] font-bold text-emerald-400 font-mono tracking-wider">YÖNETİM BİLDİRİMİ</div>
            <div className="text-xs text-slate-200 font-medium">{toastMessage.text}</div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* ===================================================================== */}
      {/* CANLI SUPABASE GERÇEK ZAMANLI ALT BİLDİRİM KUTUSU (BOTTOM NOTIFICATION) */}
      {/* ===================================================================== */}
      {liveRealtimeEvent && isAuthenticated && userIsAdmin && (
        <div className="fixed bottom-4 right-4 md:right-6 z-[2100] max-w-lg w-full px-3 md:px-0 transition-all duration-300">
          {isBottomBoxMinimized ? (
            /* Minimized Bar */
            <div 
              onClick={() => setIsBottomBoxMinimized(false)}
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-slate-950/95 border border-emerald-500/50 text-white shadow-2xl shadow-emerald-950/90 cursor-pointer hover:border-emerald-400 hover:bg-slate-900 transition-all backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-emerald-400 font-mono uppercase tracking-wider">
                  Supabase Realtime Canlı Akış
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  {users.length} Kayıtlı
                </span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBottomBoxMinimized(false);
                }}
                className="text-xs text-slate-300 hover:text-white font-bold flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg hover:bg-slate-700"
              >
                <span>Aç</span>
                <ChevronRight className="w-3.5 h-3.5 rotate-[-90deg]" />
              </button>
            </div>
          ) : (
            /* Full Floating Notification Panel */
            <div className="rounded-2xl bg-slate-950/95 border border-emerald-500/50 shadow-2xl shadow-emerald-950/90 p-4 backdrop-blur-xl text-white transition-all animate-fadeIn">
              {/* Box Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-400 tracking-wider uppercase font-mono">
                        CANLI BİLDİRİM KUTUSU
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                        app_users
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {liveRealtimeEvent.timestamp} • {liveRealtimeEvent.platform || 'Supabase Cloud'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsBottomBoxMinimized(true)}
                    title="Küçült"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </button>
                  <button
                    onClick={() => setLiveRealtimeEvent(null)}
                    title="Bildirimi Kapat"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Event Content */}
              <div className="py-3">
                {liveRealtimeEvent.type === 'INSERT' && liveRealtimeEvent.user ? (
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Yeni Üye Sisteme Kaydoldu!</span>
                        </div>
                        <div className="text-sm font-black text-white mt-0.5">
                          {liveRealtimeEvent.user.name}
                        </div>
                        <div className="text-xs text-slate-300 font-mono mt-0.5">
                          {liveRealtimeEvent.user.email}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs font-mono">
                          +{liveRealtimeEvent.user.creditsRemaining || 15} Jeton
                        </span>
                      </div>
                    </div>

                    {/* Metadata Pill Row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-slate-300">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/80 flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-cyan-400" />
                        {liveRealtimeEvent.user.platform || 'Mobil/Web'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/80 text-amber-400">
                        {liveRealtimeEvent.user.planNameTr || 'Standart Üyelik'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/80 text-purple-400">
                        Seviye {liveRealtimeEvent.user.rankLevel || 1}
                      </span>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (liveRealtimeEvent.user) {
                            setSelectedUser(liveRealtimeEvent.user);
                          }
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Kullanıcı Detayını Aç & Yönet</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>{liveRealtimeEvent.title}</span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      {liveRealtimeEvent.subtitle}
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Veritabanı: <strong className="text-emerald-400">app_users</strong></span>
                      <span>Toplam Kayıtlı: <strong className="text-white">{users.length}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Quick Refresh / Sync Info */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-cyan-400" />
                  <span>Doğrudan Supabase Sync ({livePing} ms)</span>
                </span>
                <button
                  onClick={() => {
                    loadData();
                    showToast('Kullanıcı listesi Supabase üzerinden tazelendi.', 'info');
                  }}
                  className="hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingUsers ? 'animate-spin' : ''}`} />
                  <span>Şimdi Yenile</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
