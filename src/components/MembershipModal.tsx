/**
 * TerraScan AI - Tera Jeton & Key Tabanlı Üyelik, Sunucu ve Kullanıcı Yönetim Merkezi
 * Yasal Mevzuata (2863 S.K.) Tam Uyumlu Jeofizik Zemin ve Anomali Analiz Sistemi
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  UserProfile, 
  MembershipPlanTier, 
  UserRank, 
  SavedStudy, 
  AppLanguage, 
  AppAnnouncement, 
  ScanArea,
  LicensePackage,
  SHOPIER_LICENSE_PACKAGES 
} from '../types';
import { 
  X, 
  User, 
  ShieldCheck, 
  History, 
  MapPin, 
  Check, 
  Copy, 
  Coins, 
  ExternalLink, 
  ShoppingBag, 
  CheckCircle2, 
  Lock, 
  Server, 
  Radio, 
  RefreshCw, 
  PlusCircle, 
  Sparkles, 
  Award, 
  Trash2, 
  LogOut, 
  Bookmark, 
  Users, 
  Eye, 
  AlertTriangle, 
  Gift, 
  Share2, 
  MessageCircle,
  MessageSquare,
  Send,
  Headphones,
  CreditCard,
  Building,
  Megaphone,
  Bell,
  CheckSquare,
  ChevronRight,
  KeyRound,
  ShieldAlert,
  Unlock,
  Key,
  Smartphone,
  Play,
  Wrench,
  Box,
  HelpCircle
} from 'lucide-react';
import { PRESET_SCAN_SITES } from '../data/satellites';
import { sound } from '../utils/anomalyEngine';
import { 
  getAllUsers, 
  fetchUsers,
  saveAllUsers, 
  calculateRankProgression, 
  calculateVipProgression,
  getUserReferralCode,
  redeemReferralCode,
  registerNewUser,
  addCreditsAndVipPoints,
  updateUser
} from '../utils/userManager';
import { hasActiveLicense, getLicenseDaysLeft } from '../utils/licenseManager';
import { redeemOrderOrLicenseCode } from '../utils/activationCodes';
import { 
  getAnnouncements, 
  createAnnouncement, 
  deleteAnnouncement, 
  toggleAnnouncementStatus 
} from '../utils/announcementManager';
import { verifyAdminPin, isAdminAuthenticated as checkAdminAuthenticated, logoutAdmin, isUserAdmin } from '../utils/adminManager';
import { AdminControlCenter } from './AdminControlCenter';
import { VoxlerDeviceScanInspector } from './VoxlerDeviceScanInspector';
import { FAQSection } from './FAQSection';
import { TRANSLATIONS, getRankBadgeAndTitle } from '../utils/i18n';
import { 
  buildShopierCheckoutUrl, 
  verifyShopierPayment, 
  processConfirmedPayment,
  markShopierCheckoutInitiated,
  isShopierCheckoutAwaiting
} from '../utils/shopierClient';
import {
  extractAndCleanPaymentUrlParams,
  isOrderIdAlreadyProcessed,
  markOrderIdAsProcessed,
} from '../utils/paymentIdempotency';
import {
  jetonSatinAl,
  PlayBilling,
  krediEkle,
  isAndroidNativeEnvironment,
} from '../utils/playBilling';

export type MembershipTabType = 
  | 'PROFILE' 
  | 'STUDIES' 
  | 'SERVER' 
  | 'SUPPORT' 
  | 'REFERRAL' 
  | 'CREDITS' 
  | 'ANNOUNCEMENTS'
  | 'HISTORY'
  | 'PLANS'
  | 'FAQ';

export interface CreditPackage {
  id: string;
  name: string;
  badge?: string;
  badgeColor?: string;
  credits: number;
  price: string;
  unitPriceDesc?: string;
  shopierUrl: string;
  playBillingId: string;
  description: string;
  features: string[];
  popular?: boolean;
  borderTheme: string;
  buttonTheme: string;
}

export const SHOPIER_CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'PRO_100',
    name: '100 TERA JETON [PRO JEOFİZİK]',
    badge: 'PRO & YÜKSEK HASSASİYET',
    badgeColor: 'bg-amber-500/25 text-amber-200 border-amber-400/50',
    credits: 100,
    price: '1200 TL',
    unitPriceDesc: '12.00 TL / Jeton',
    shopierUrl: 'https://www.shopier.com/ulubeyteknoloji/50655930',
    playBillingId: 'tera_jeton_100',
    description: 'Maden sahaları, jeofizik mühendisleri ve geniş araziler için 100 Tera Jeton.',
    features: [
      '100 Kredi Anomali Çekim Bakiyesi',
      'Sınırsız Detaylı PDF & GeoTIFF Rapor Çıktısı',
      'Tüm 7 Uydu Platformuna (SAR, LIDAR, Termal) Tam Erişim',
      'Gelişmiş AI Inversion & Jeofizik Matrisi',
      'Shopier 3D Secure Onaylı Güvenli Ödeme',
      'Ulubey Teknoloji 7/24 Öncelikli Müşteri Desteği',
    ],
    borderTheme: 'border-amber-500/80 bg-gradient-to-b from-amber-950/35 to-slate-900/95 hover:border-amber-400',
    buttonTheme: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-black',
  },
  {
    id: 'MEGA_250',
    name: '250 TERA JETON [GENİŞ SAHA]',
    badge: 'EN ÇOK TERCİH EDİLEN',
    badgeColor: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50',
    credits: 250,
    price: '2500 TL',
    unitPriceDesc: '10.00 TL / Jeton',
    shopierUrl: 'https://www.shopier.com/ulubeyteknoloji/50720240',
    playBillingId: 'tera_jeton_250',
    description: 'Büyük ölçekli maden ve jeoteknik projeler için 250 Tera Jeton paketi.',
    features: [
      '250 Kredi Anomali Çekim Bakiyesi',
      'Özel Yeraltı Boşluk & Dehliz Haritalama',
      'WorldView-3 ve TerraSAR-X Radar Desteği',
      'Shopier 3D Secure ile VIP Aktivasyon',
      'VİP Sunucu İletişim Hattı & Doğrudan Destek',
      'Ömür Boyu Süresiz Kullanım',
    ],
    popular: true,
    borderTheme: 'border-emerald-500/80 bg-gradient-to-b from-emerald-950/35 to-slate-900/95 hover:border-emerald-400',
    buttonTheme: 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black',
  },
  {
    id: 'ENTERPRISE_1000',
    name: '1000 TERA JETON [KURUMSAL & VIP ELİT]',
    badge: 'VIP ELİT LİSANS',
    badgeColor: 'bg-blue-500/25 text-blue-200 border-blue-400/50',
    credits: 1000,
    price: '8500 TL',
    unitPriceDesc: '8.50 TL / Jeton',
    shopierUrl: 'https://www.shopier.com/ulubeyteknoloji/50780462',
    playBillingId: 'tera_jeton_1000',
    description: 'Şirketler, arkeolojik araştırma ekipleri ve kurumlar için 1000 Tera Jeton.',
    features: [
      '1000 Kredi Çekim Bakiyesi',
      'Anında VIP Seviye 10 Elit Statü Tanımlaması',
      'Sınırsız Çoklu Uydu & 3D Hacimsel Boşluk Modelleme',
      'Shopier 3D Secure Kurumsal Ödeme',
      'Öncelikli Özel Sunucu Tahsisi',
      'Güvenli Lisans Doğrulama',
    ],
    borderTheme: 'border-blue-500/80 bg-gradient-to-b from-blue-950/35 to-slate-900/95 hover:border-blue-400',
    buttonTheme: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black',
  },
];

interface GeneratedKeyItem {
  key: string;
  type: string;
  credits: number;
  customer: string;
  createdAt: string;
  status: 'BEKLIYOR' | 'KULLANILDI';
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

interface MembershipModalProps {
  user: UserProfile;
  onClose: () => void;
  onUpdatePlan: (newPlan: MembershipPlanTier, newCredits: number) => void;
  onSelectPastScan: (coords: string) => void;
  initialTab?: MembershipTabType | string;
  onSwitchAccount?: () => void;
  onUpdateUser?: (updated: UserProfile) => void;
  currentLang?: AppLanguage;
  onSelectLang?: (lang: AppLanguage) => void;
  scanArea?: ScanArea | null;
  activeSatelliteName?: string;
  onNavigateToCoords?: (lat: number, lng: number, name: string) => void;
}

export const MembershipModal: React.FC<MembershipModalProps> = ({
  user,
  onClose,
  onUpdatePlan,
  onSelectPastScan,
  initialTab = 'PROFILE',
  onSwitchAccount,
  onUpdateUser,
  currentLang = 'tr',
  onSelectLang,
  scanArea,
  activeSatelliteName,
  onNavigateToCoords,
}) => {
  // Normalize initial tab
  const getNormalizedTab = (tab?: string): MembershipTabType => {
    if (!tab) return 'PROFILE';
    if (tab === 'PLANS') return 'CREDITS';
    if (tab === 'HISTORY') return 'STUDIES';
    return tab as MembershipTabType;
  };

  const [activeTab, setActiveTab] = useState<MembershipTabType>(getNormalizedTab(initialTab));

  // Global notice state
  const [globalNotice, setGlobalNotice] = useState<{ text: string; success: boolean } | null>(null);

  // Shopier automated verification state
  const [isVerifyingShopier, setIsVerifyingShopier] = useState<boolean>(false);
  const [lastShopierCheckTime, setLastShopierCheckTime] = useState<string | null>(null);
  const [paymentInitiatedPkg, setPaymentInitiatedPkg] = useState<CreditPackage | null>(null);
  const [shopierSuccessModal, setShopierSuccessModal] = useState<{
    show: boolean;
    orderId?: string;
    tokensAdded?: number;
    newTotal?: number;
    packageTitle?: string;
  } | null>(null);

  // Promo / License Key state
  const [licenseKeyInput, setLicenseKeyInput] = useState<string>('');

  // Registered users state for Server console (CRITICAL REAL-TIME CONNECTION)
  const [allUsersList, setAllUsersList] = useState<UserProfile[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [showAddUserForm, setShowAddUserForm] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserCredits, setNewUserCredits] = useState<number>(50);
  const [newUserError, setNewUserError] = useState<string | null>(null);

  const refreshUsers = (force = false) => {
    const list = getAllUsers();
    setAllUsersList(list);
    if (force) {
      fetchUsers(true).then((liveList) => {
        if (liveList && liveList.length > 0) {
          setAllUsersList(liveList);
        }
      }).catch(() => {});
    }
  };

  // Sync users immediately and keep live listener active without triggering fetch loop
  useEffect(() => {
    refreshUsers(false);
    const handleUsersUpdate = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setAllUsersList(e.detail);
      } else {
        setAllUsersList(getAllUsers());
      }
    };
    window.addEventListener('terrascan_users_updated', handleUsersUpdate);
    window.addEventListener('storage', handleUsersUpdate);
    return () => {
      window.removeEventListener('terrascan_users_updated', handleUsersUpdate);
      window.removeEventListener('storage', handleUsersUpdate);
    };
  }, []);

  // Whenever user navigates to SERVER tab, re-sync user list
  useEffect(() => {
    if (activeTab === 'SERVER') {
      refreshUsers();
    }
  }, [activeTab]);

  // System Announcements State
  const [announcementsList, setAnnouncementsList] = useState<AppAnnouncement[]>([]);
  const [annTitle, setAnnTitle] = useState<string>('');
  const [annMessage, setAnnMessage] = useState<string>('');
  const [annType, setAnnType] = useState<AppAnnouncement['type']>('INFO');
  const [annNotice, setAnnNotice] = useState<string | null>(null);

  useEffect(() => {
    setAnnouncementsList(getAnnouncements());
    const handleAnnouncementsUpdate = () => setAnnouncementsList(getAnnouncements());
    window.addEventListener('terrascan_announcements_updated', handleAnnouncementsUpdate);
    return () => {
      window.removeEventListener('terrascan_announcements_updated', handleAnnouncementsUpdate);
    };
  }, []);

  // Save Study Form state (inside STUDIES tab)
  const [studyTitleInput, setStudyTitleInput] = useState<string>(
    scanArea?.locationName ? `${scanArea.locationName} - Saha Taraması` : 'Özel Saha Jeofizik Taraması'
  );
  const [studyNotesInput, setStudyNotesInput] = useState<string>('');
  const [studySavedSuccess, setStudySavedSuccess] = useState<boolean>(false);

  // Referral state
  const myReferralCode = getUserReferralCode(user);
  const [friendReferralInput, setFriendReferralInput] = useState<string>('');
  const [referralNotice, setReferralNotice] = useState<{ text: string; success: boolean } | null>(null);
  const [copiedReferralCode, setCopiedReferralCode] = useState<boolean>(false);
  const [copiedReferralLink, setCopiedReferralLink] = useState<boolean>(false);

  // Live Support Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: 'Merhaba! TerraScan Jeofizik Destek Hattına hoş geldiniz. Ben Baş Jeofizikçi Uzmanı. Yeraltı taraması, SAR radarı, lisanslama veya jeton paketleri hakkında size nasıl yardımcı olabilirim?',
      time: 'Şimdi',
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');

  // Admin / Server authentication state
  const [adminPin, setAdminPin] = useState<string>('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => isUserAdmin(user) || checkAdminAuthenticated(user));
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [newAdminPinInput, setNewAdminPinInput] = useState<string>('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Admin Key Generator state
  const [selectedKeyTier, setSelectedKeyTier] = useState<string>('50J');
  const [keyCustomerName, setKeyCustomerName] = useState<string>('Müşteri (Saha Sahibi)');
  const [recentGeneratedKeys, setRecentGeneratedKeys] = useState<GeneratedKeyItem[]>([
    {
      key: 'TERA-50J-9821-4472-TR',
      type: '50 Tera Jeton',
      credits: 50,
      customer: 'Ahmet Yılmaz (Uşak)',
      createdAt: 'Bugün 10:24',
      status: 'KULLANILDI',
    },
    {
      key: 'TERA-100J-4119-8802-TR',
      type: '100 Tera Jeton',
      credits: 100,
      customer: 'Mehmet Demir (Denizli)',
      createdAt: 'Dün 16:40',
      status: 'BEKLIYOR',
    },
  ]);

  // Admin Login Handler
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(adminPin)) {
      setIsAdminAuthenticated(true);
      setAdminAuthError(null);
      sound.playAnomalyDiscovered();
      refreshUsers();
    } else {
      setAdminAuthError('Hatalı Yönetici PIN Kodu! Lütfen geçerli şifreyi giriniz.');
      sound.playScanBeep();
    }
  };

  const handleChangeAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPinInput.length < 4) {
      setPinChangeMsg({ text: 'PIN kodu en az 4 karakter olmalıdır.', success: false });
      return;
    }
    localStorage.setItem('terrascan_admin_pin', newAdminPinInput);
    setPinChangeMsg({ text: 'Yönetici PIN kodu başarıyla güncellendi.', success: true });
    setNewAdminPinInput('');
  };

  // Add Manual User in Server Tab
  const handleAddNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setNewUserError('Lütfen tüm alanları eksiksiz doldurunuz.');
      return;
    }
    try {
      const created = await registerNewUser(newUserName, newUserEmail, newUserPassword, 'tr');
      if (newUserCredits > 15) {
        addCreditsAndVipPoints(created.id, newUserCredits - 15);
      }
      refreshUsers();
      setShowAddUserForm(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserCredits(50);
      setNewUserError(null);
      sound.playAnomalyDiscovered();
    } catch (err: any) {
      setNewUserError(err.message || 'Üye oluşturulamadı.');
    }
  };

  // Admin Update User Rank
  const handleUpdateUserRank = (targetUserId: string, newRank: UserRank) => {
    sound.playAnomalyDiscovered();
    const { badge, title } = getRankBadgeAndTitle(newRank, (currentLang || 'tr') as AppLanguage);
    const updatedUsers = allUsersList.map((u) => {
      if (u.id === targetUserId) {
        return {
          ...u,
          rank: newRank,
          rankBadge: badge,
          rankTitle: title,
        };
      }
      return u;
    });
    setAllUsersList(updatedUsers);
    saveAllUsers(updatedUsers);

    if (user.id === targetUserId && onUpdateUser) {
      const activeUpdated = updatedUsers.find((u) => u.id === targetUserId);
      if (activeUpdated) onUpdateUser(activeUpdated);
    }
  };

  // Admin Update User Credits
  const handleUpdateUserCredits = (targetUserId: string, addedCredits: number) => {
    sound.playAnomalyDiscovered();
    const updatedUsers = allUsersList.map((u) => {
      if (u.id === targetUserId) {
        const newCredits = Math.max(0, u.creditsRemaining + addedCredits);
        return {
          ...u,
          creditsRemaining: newCredits,
        };
      }
      return u;
    });
    setAllUsersList(updatedUsers);
    saveAllUsers(updatedUsers);

    if (user.id === targetUserId) {
      const activeUpdated = updatedUsers.find((u) => u.id === targetUserId);
      if (activeUpdated) {
        if (onUpdateUser) onUpdateUser(activeUpdated);
        onUpdatePlan(activeUpdated.plan || 'STARTER', activeUpdated.creditsRemaining);
      }
    }
  };

  // Admin Toggle User Status
  const handleToggleUserStatus = (targetUserId: string) => {
    sound.playScanBeep();
    const updatedUsers = allUsersList.map((u) => {
      if (u.id === targetUserId) {
        return {
          ...u,
          status: (u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED') as 'ACTIVE' | 'SUSPENDED',
        };
      }
      return u;
    });
    setAllUsersList(updatedUsers);
    saveAllUsers(updatedUsers);

    if (user.id === targetUserId && onUpdateUser) {
      const activeUpdated = updatedUsers.find((u) => u.id === targetUserId);
      if (activeUpdated) onUpdateUser(activeUpdated);
    }
  };

  // Admin Delete User
  const handleDeleteUser = (targetUserId: string) => {
    if (targetUserId === user.id) {
      alert('Kendi yönetici hesabınızı silemezsiniz!');
      return;
    }
    sound.playScanBeep();
    const updatedUsers = allUsersList.filter((u) => u.id !== targetUserId);
    setAllUsersList(updatedUsers);
    saveAllUsers(updatedUsers);
  };

  // Create Announcement
  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) {
      setAnnNotice('Lütfen duyuru başlığı ve içerik yazınız.');
      return;
    }
    createAnnouncement(annTitle, annMessage, annType, user.name || 'Yönetim Masası');
    setAnnouncementsList(getAnnouncements());
    setAnnTitle('');
    setAnnMessage('');
    setAnnNotice('Duyuru başarıyla yayınlandı ve tüm kullanıcılara iletildi!');
    sound.playAnomalyDiscovered();
    setTimeout(() => setAnnNotice(null), 3000);
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updated = deleteAnnouncement(id);
    setAnnouncementsList(updated);
    sound.playScanBeep();
  };

  // Admin Key Generator
  const handleGenerateKey = () => {
    sound.playAnomalyDiscovered();
    const randPart1 = Math.floor(1000 + Math.random() * 9000);
    const randPart2 = Math.floor(1000 + Math.random() * 9000);
    const generatedCode = `TERA-${selectedKeyTier}-${randPart1}-${randPart2}-TR`;
    const creditsMap: Record<string, number> = {
      '25J': 25,
      '50J': 50,
      '100J': 100,
      '250J': 250,
      'VIP': 1000,
    };
    const credits = creditsMap[selectedKeyTier] || 50;

    const newKeyItem: GeneratedKeyItem = {
      key: generatedCode,
      type: `${credits} Tera Jeton`,
      credits,
      customer: keyCustomerName.trim() || 'Müşteri',
      createdAt: 'Az önce',
      status: 'BEKLIYOR',
    };

    setRecentGeneratedKeys([newKeyItem, ...recentGeneratedKeys]);
  };

  const handleCopyKey = (keyStr: string) => {
    navigator.clipboard.writeText(keyStr);
    sound.playScanBeep();
    setGlobalNotice({ text: `Lisans Anahtarı (${keyStr}) kopyalandı!`, success: true });
    setTimeout(() => setGlobalNotice(null), 2500);
  };

  // Single execution ref for payment processing in modal
  const hasProcessedModalPaymentRef = useRef<boolean>(false);

  // Automated Shopier Orders Verification & Sync
  const checkShopierOrders = async (silent = false) => {
    if (!user?.email || isVerifyingShopier) return;
    if (!silent) setIsVerifyingShopier(true);
    try {
      const result = await verifyShopierPayment(user);
      setLastShopierCheckTime(new Date().toLocaleTimeString('tr-TR'));
      if (result.credited && result.creditedOrders.length > 0) {
        let latestUser = user;
        let totalAdded = 0;
        const processedList: typeof result.creditedOrders = [];

        for (const order of result.creditedOrders) {
          if (!isOrderIdAlreadyProcessed(order.orderId, latestUser)) {
            latestUser = addCreditsAndVipPoints(
              user.id,
              order.tokens,
              order.orderId,
              `Shopier Sipariş (#${order.orderId}) Onaylandı: +${order.tokens} Tera Jeton Yüklendi`
            );
            totalAdded += order.tokens;
            processedList.push(order);
          }
        }

        if (totalAdded > 0 && processedList.length > 0) {
          sound.playAnomalyDiscovered();
          if (onUpdateUser) onUpdateUser(latestUser);
          onUpdatePlan(latestUser.plan, latestUser.creditsRemaining);
          setPaymentInitiatedPkg(null);

          setShopierSuccessModal({
            show: true,
            orderId: processedList.map((o) => `#${o.orderId}`).join(', '),
            tokensAdded: totalAdded,
            newTotal: result.newTotalTokens ?? latestUser.creditsRemaining,
            packageTitle: processedList[0]?.packageTitle || 'Tera Jeton Paketi',
          });

          setGlobalNotice({
            text: `🎉 Ödemeniz onaylandı, bakiyeniz güncellendi! Hesabınıza +${totalAdded} Tera Jeton başarıyla yüklendi.`,
            success: true,
          });
        }
      } else if (!silent) {
        setGlobalNotice({
          text: result.message || 'Hesabınızla eşleşen yeni veya bekleyen ödenmiş sipariş bulunamadı.',
          success: result.success,
        });
        setTimeout(() => setGlobalNotice(null), 4000);
      }
    } catch (err: any) {
      if (!silent) {
        setGlobalNotice({
          text: `Ödeme kontrolü sırasında hata: ${err.message}`,
          success: false,
        });
      }
    } finally {
      setIsVerifyingShopier(false);
    }
  };

  // Automated detection when user returns to app from Shopier
  useEffect(() => {
    // Extract and clean URL parameters if user landed on the page with payment return params
    const urlParams = extractAndCleanPaymentUrlParams();

    const handleCheckAndDirectCredit = async () => {
      if (!user?.id || !user?.email) return;

      if (urlParams.isSuccess || urlParams.hasPaymentParams) {
        const orderId =
          urlParams.orderId ||
          urlParams.paymentId ||
          `SP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        if (!isOrderIdAlreadyProcessed(orderId, user)) {
          try {
            const directRes = await processConfirmedPayment(user, {
              orderId,
              tokens: urlParams.tokens,
              rawParams: urlParams.rawParams,
            });

            if (directRes.success && directRes.tokensAdded > 0) {
              sound.playAnomalyDiscovered();
              if (directRes.updatedUser) {
                if (onUpdateUser) onUpdateUser(directRes.updatedUser);
                onUpdatePlan(directRes.updatedUser.plan, directRes.updatedUser.creditsRemaining);
              }
              setPaymentInitiatedPkg(null);
              setShopierSuccessModal({
                show: true,
                orderId: `#${orderId}`,
                tokensAdded: directRes.tokensAdded,
                newTotal: directRes.newTotal,
                packageTitle: 'Tera Jeton Paketi',
              });
              setGlobalNotice({
                text: `🎉 Ödemeniz onaylandı! ${directRes.tokensAdded} jeton hesabınıza başarıyla tanımlandı.`,
                success: true,
              });
              return;
            }
          } catch (e) {
            console.warn('[MembershipModal] Direct payment check note:', e);
          }
        }
      }

      // Yalnızca kullanıcı gerçekten bir ödeme başlatmışsa siparişleri sorgula
      if (isShopierCheckoutAwaiting() || paymentInitiatedPkg || localStorage.getItem('terrascan_paying_user_id')) {
        checkShopierOrders(true);
      }
    };

    handleCheckAndDirectCredit();

    const handleFocus = () => {
      // Yalnızca kullanıcı Shopier ödemesinden geri döndüğünde veya beklemede ödeme varsa kontrol et
      if (isShopierCheckoutAwaiting() || paymentInitiatedPkg || localStorage.getItem('terrascan_paying_user_id')) {
        checkShopierOrders(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isShopierCheckoutAwaiting() || paymentInitiatedPkg || localStorage.getItem('terrascan_paying_user_id')) {
          checkShopierOrders(true);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.email, user?.id, paymentInitiatedPkg]);

  // Redeem Promo / License Key / Shopier Order Number
  const handleRedeemKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = licenseKeyInput.trim();
    if (!key) {
      setGlobalNotice({ text: 'Lütfen geçerli bir sipariş numarası veya lisans kodu giriniz.', success: false });
      return;
    }

    const result = await redeemOrderOrLicenseCode(key, user);
    if (result.success) {
      sound.playAnomalyDiscovered();
      if (result.updatedUser) {
        if (onUpdateUser) onUpdateUser(result.updatedUser);
        onUpdatePlan(result.updatedUser.plan, result.updatedUser.creditsRemaining);
      }
      setGlobalNotice({
        text: result.message,
        success: true,
      });
      setLicenseKeyInput('');
    } else {
      sound.playRadarBeep();
      setGlobalNotice({
        text: result.message,
        success: false,
      });
    }
  };

  // Save Study (from STUDIES tab)
  const handleSaveStudyInTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyTitleInput.trim()) return;

    const lat = scanArea ? scanArea.center.lat : 38.477309;
    const lng = scanArea ? scanArea.center.lng : 29.728954;
    const coordsStr = `${lat.toFixed(6)} ${lng.toFixed(6)}`;

    const newStudy: SavedStudy = {
      id: `study-${Date.now()}`,
      title: studyTitleInput.trim(),
      coordinates: coordsStr,
      lat,
      lng,
      locationName: scanArea?.locationName || 'Özel Saha Koordinatı',
      date: new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }),
      satelliteName: activeSatelliteName || 'Sentinel-2 SAR High-Res',
      hotspotCount: scanArea?.hotspots?.length || 0,
      confidenceScore: scanArea ? Math.min(9.9, +(8.5 + (scanArea.hotspots?.length || 1) * 0.3).toFixed(1)) : 9.0,
      depthRange: '0.8 - 4.8 m',
      notes: studyNotesInput.trim() || undefined,
      tags: ['Saha Kaydı', (activeSatelliteName || 'Sentinel').split(' ')[0]],
    };

    const currentStudies = user.savedStudies || [];
    const updatedUser: UserProfile = {
      ...user,
      savedStudies: [newStudy, ...currentStudies],
      savedLocationsCount: (user.savedLocationsCount || 0) + 1,
    };

    updateUser(updatedUser);
    if (onUpdateUser) onUpdateUser(updatedUser);

    sound.playAnomalyDiscovered();
    setStudySavedSuccess(true);
    setStudyNotesInput('');
    setTimeout(() => setStudySavedSuccess(false), 3000);
  };

  const handleDeleteStudy = (studyId: string) => {
    sound.playScanBeep();
    const currentStudies = user.savedStudies || [];
    const updatedStudies = currentStudies.filter((s) => s.id !== studyId);
    const updatedUser: UserProfile = {
      ...user,
      savedStudies: updatedStudies,
      savedLocationsCount: updatedStudies.length,
    };
    updateUser(updatedUser);
    if (onUpdateUser) onUpdateUser(updatedUser);
  };

  // Referral Handlers
  const handleCopyMyReferralCode = () => {
    try {
      navigator.clipboard.writeText(myReferralCode);
      setCopiedReferralCode(true);
      sound.playScanBeep();
      setTimeout(() => setCopiedReferralCode(false), 2200);
    } catch {
      // fallback
    }
  };

  const handleCopyInviteLink = () => {
    try {
      const inviteUrl = `${window.location.origin}${window.location.pathname}?ref=${myReferralCode}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopiedReferralLink(true);
      sound.playScanBeep();
      setTimeout(() => setCopiedReferralLink(false), 2200);
    } catch {
      // fallback
    }
  };

  const handleApplyFriendReferral = () => {
    const trimmed = friendReferralInput.trim();
    if (!trimmed) {
      setReferralNotice({ text: 'Lütfen bir arkadaşınızın davet kodunu yazınız.', success: false });
      return;
    }
    const result = redeemReferralCode(user.id, trimmed);
    if (result.success && result.updatedUser) {
      sound.playAnomalyDiscovered();
      setReferralNotice({ text: result.message, success: true });
      if (onUpdateUser) onUpdateUser(result.updatedUser);
      if (onUpdatePlan) onUpdatePlan(result.updatedUser.plan, result.updatedUser.creditsRemaining);
      setFriendReferralInput('');
    } else {
      sound.playScanBeep();
      setReferralNotice({ text: result.message, success: false });
    }
  };

  // Chat Support Handlers
  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const query = chatInput.trim();
    setChatInput('');
    sound.playScanBeep();

    setTimeout(() => {
      let reply = 'Sorunuz uzman jeofizik mühendislerimiz tarafından incelenmektedir.';
      const q = query.toLowerCase();

      if (
        q.includes('satın') ||
        q.includes('nasıl alırım') ||
        q.includes('ücret') ||
        q.includes('fiyat') ||
        q.includes('ödeme') ||
        q.includes('nasıl yapılır') ||
        q.includes('kaç para')
      ) {
        reply = 'Uygulama içi satın alma veya doğrudan link paylaşımı yapılmamaktadır. Yeni bir lisans edinmek veya mevcut paketinizi yönetmek için tarayıcınızı açarak web sitemizi ziyaret edebilirsiniz.';
      } else if (
        q.includes('lisans') ||
        q.includes('anahtar') ||
        q.includes('key') ||
        query.toUpperCase().includes('TERA-')
      ) {
        const cleanKey = query.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        const isValidFormat = /^TERA-[A-Z0-9]{2,8}-[A-Z0-9]{3,8}-[A-Z0-9]{3,8}-[A-Z0-9]{2,4}$/.test(cleanKey) ||
                              /^TERA-[A-Z0-9]{4,8}-[A-Z0-9]{4,8}-[A-Z0-9]{2,4}$/.test(cleanKey);
        if (isValidFormat) {
          reply = `Lisans anahtarı biçimi geçerlidir (${cleanKey}). Lisansınızı aktifleştirmek için bu sekmedeki 'Lisans Kodu' alanına girip 'Doğrula ve Yükle' butonuna basabilirsiniz.`;
        } else {
          reply = "Girilen lisans anahtarı formatı geçersizdir. Lütfen 'TERA-XXXX-XXXX-XXXX-TR' formatındaki lisans kodunuzu kontrol ediniz.";
        }
      } else if (q.includes('jeton') || q.includes('kredi') || q.includes('paket')) {
        reply = 'Uygulama içi satın alma veya doğrudan link paylaşımı yapılmamaktadır. Yeni bir lisans edinmek veya mevcut paketinizi yönetmek için tarayıcınızı açarak web sitemizi ziyaret edebilirsiniz.';
      } else if (q.includes('arkadaş') || q.includes('davet')) {
        reply = 'Arkadaşını Getir sekmesindeki kodunuzu paylaştığınızda, o kodla kayıt olan her arkadaşınız ve siz anında +15 Kredi (1 ücretsiz tarama hakkı) kazanırsınız!';
      } else if (q.includes('kanun') || q.includes('sit') || q.includes('yasal') || q.includes('2863')) {
        reply = '2863 Sayılı Kültür ve Tabiat Varlıklarını Koruma Kanununa göre izinsiz kazı yapmak suçtur. TerraScan, yalnızca zemin etüdü, bilimsel anomaliler ve uzaktan algılama amaçlı kullanılmalıdır.';
      } else if (q.includes('derinlik') || q.includes('radar') || q.includes('sar')) {
        reply = 'Sistemimiz Sentinel-1 SAR C-band, L-band ve Landsat termal sensörleriyle 0.8m - 5.0m derinliğe kadar dielektrik geçirgenlik ve manyetik anomalileri haritalandırır.';
      } else if (q.includes('sipariş') || q.includes('google') || q.includes('play') || q.includes('onay')) {
        reply = 'Uygulama içi satın alma veya doğrudan link paylaşımı yapılmamaktadır. Yeni bir lisans edinmek veya mevcut paketinizi yönetmek için tarayıcınızı açarak web sitemizi ziyaret edebilirsiniz.';
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: reply,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      sound.playAnomalyDiscovered();
    }, 700);
  };

  // Google Play In-App Billing (PlayBilling) State & Handler
  const [purchasingPlayBillingId, setPurchasingPlayBillingId] = useState<string | null>(null);
  const [paymentMethodTab, setPaymentMethodTab] = useState<'ALL' | 'GOOGLE_PLAY' | 'SHOPIER'>('ALL');
  const [packageCategory, setPackageCategory] = useState<'LICENSE' | 'CREDITS'>('LICENSE');
  const [copiedIbanField, setCopiedIbanField] = useState<'IBAN' | 'NAME' | 'DESC' | null>(null);
  const [selectedIbanPackageName, setSelectedIbanPackageName] = useState<string | null>(null);
  const ibanPanelRef = useRef<HTMLDivElement>(null);

  const handleCopyIbanText = (text: string, field: 'IBAN' | 'NAME' | 'DESC') => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedIbanField(field);
      sound.playScanBeep();
      setTimeout(() => {
        setCopiedIbanField((prev) => (prev === field ? null : prev));
      }, 2200);
    } catch {
      // fallback
    }
  };

  const scrollToIbanPanel = (pkgLabel?: string) => {
    sound.playScanBeep();
    if (pkgLabel) setSelectedIbanPackageName(pkgLabel);
    setTimeout(() => {
      ibanPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const handlePlayBillingPurchase = async (_pkg: CreditPackage) => {
    setGlobalNotice({
      text: 'Google Play uygulama içi satın alma ve ödeme sistemi geçici olarak bakımdadır. Lütfen lisans anahtarınızı kullanınız.',
      success: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 flex items-center justify-center text-slate-950 shadow-md">
              <Radio className="w-5 h-5 font-bold animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>TERRASCAN ÜYE & SUNUCU MERKEZİ</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
                  {user.rankTitle || 'Jeofizik Gözlemci'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>{user.email}</span>
                <span>·</span>
                <span>Mevcut Bakiye:</span>
                <strong className="text-emerald-400 font-mono text-xs px-2 py-0.5 bg-emerald-950/80 rounded border border-emerald-500/40">
                  {user.creditsRemaining} Tera Jeton
                </strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playScanBeep();
              setIsAdminAuthenticated(false);
              logoutAdmin();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation - REQUESTED ORDER: Profil, Çalışma Kayıtları, Sunucu, Canlı Destek, Arkadaşını Getir, Jeton Yükle, Duyurular */}
        <div className="flex overflow-x-auto border-b border-slate-800 px-2 sm:px-4 bg-slate-950/70 no-scrollbar gap-1">
          {/* Tab 1: Kullanıcı Profili */}
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'PROFILE'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Kullanıcı Profili</span>
            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">
              VIP {user.vipLevel || 1}
            </span>
          </button>

          {/* Tab 2: Çalışma Kayıtları */}
          <button
            onClick={() => setActiveTab('STUDIES')}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'STUDIES'
                ? 'border-purple-400 text-purple-300 bg-purple-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-purple-400" />
            <span>Çalışma Kayıtları</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono">
              {user.savedStudies?.length || 0}
            </span>
          </button>

          {/* Tab 3: SUNUCU (Yönetici Masası - PIN Korumalı, Her Zaman Görünür) */}
          <button
            onClick={() => setActiveTab('SERVER')}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'SERVER'
                ? 'border-indigo-400 text-indigo-300 bg-indigo-950/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
            <span>🛡️ SUNUCU</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
              PIN
            </span>
          </button>

          {/* Tab 4: Canlı Destek */}
          <button
            onClick={() => setActiveTab('SUPPORT')}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'SUPPORT'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-emerald-400" />
            <span>Canlı Destek</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Tab 5: Arkadaşını Getir */}
          <button
            onClick={() => setActiveTab('REFERRAL')}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'REFERRAL'
                ? 'border-amber-400 text-amber-300 bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            <span>Arkadaşını Getir</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
              +15 KREDİ
            </span>
          </button>

          {/* Tab 6: Tera Jeton Yükle (Shopier) */}
          <button
            onClick={() => setActiveTab('CREDITS')}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'CREDITS'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-emerald-400" />
            <span>Jeton Yükle</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Shopier 3D
            </span>
          </button>

          {/* Tab 7: Duyurular */}
          <button
            onClick={() => setActiveTab('ANNOUNCEMENTS')}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'ANNOUNCEMENTS'
                ? 'border-blue-400 text-blue-300 bg-blue-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-blue-400" />
            <span>Duyurular</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono">
              {announcementsList.length}
            </span>
          </button>

          {/* Tab 8: SSS & Kılavuz */}
          <button
            onClick={() => setActiveTab('FAQ')}
            className={`py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'FAQ'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>SSS & Kılavuz</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
              Rehber
            </span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* Global Notice Alert */}
          {globalNotice && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-fadeIn ${
                globalNotice.success
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 flex items-center justify-between">
                <span>{globalNotice.text}</span>
                <button
                  type="button"
                  onClick={() => setGlobalNotice(null)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: KULLANICI PROFİLİ                                                  */}
          {/* ========================================================================= */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg relative">
                    {user.name.charAt(0)}
                    <span className="absolute -bottom-1 -right-1 text-base">
                      {user.rankBadge || '🥉'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{user.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
                        {user.rankBadge || '🥉'} {user.rankTitle || 'Jeofizik Gözlemci'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                        VIP Seviyesi {user.vipLevel || 1}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Kayıt: {user.memberSince || '2026-09-01'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:text-right w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400">MEVCUT BAKİYE</div>
                    <div className="text-2xl font-black font-mono text-emerald-400">
                      {user.creditsRemaining} <span className="text-xs font-normal">Tera Jeton</span>
                    </div>
                  </div>

                  {(() => {
                    const isAct = hasActiveLicense(user.licenseExpires);
                    const daysLeft = getLicenseDaysLeft(user.licenseExpires);
                    const isUnlimited = (user.licenseExpires || '').toUpperCase().includes('SINIRSIZ') || (user.licenseExpires || '').toUpperCase().includes('UNLIMITED');
                    const label = isAct 
                      ? (isUnlimited ? 'Sınırsız VIP' : `${daysLeft} Gün Kaldı`)
                      : 'Lisanssız';

                    return (
                      <div className="px-3 py-1.5 rounded-xl border bg-slate-900/90 text-left sm:text-right border-slate-800">
                        <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 sm:justify-end">
                          <ShieldCheck className="w-3 h-3 text-blue-400" />
                          <span>LİSANS DURUMU</span>
                        </div>
                        <div className={`text-xs font-black font-mono mt-0.5 ${isAct ? 'text-blue-300' : 'text-slate-500'}`}>
                          {isAct ? `🛡️ ${label}` : 'Aktif Değil'}
                        </div>
                      </div>
                    );
                  })()}

                  {onSwitchAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playScanBeep();
                        onSwitchAccount();
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Çıkış Yap</span>
                    </button>
                  )}
                </div>
              </div>

              {/* HIZLI ERİŞİM KARTLARI (KULLANICININ İSTEDİĞİ 5 ANA MODÜL) */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Hızlı İşlemler & Modüller
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playAnomalyDiscovered();
                      document.getElementById('voxler-profile-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 hover:from-purple-900/70 hover:to-indigo-900/70 border border-purple-500/60 text-left transition-all flex flex-col justify-between group cursor-pointer shadow-sm sm:col-span-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Box className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold font-mono">
                          ⭐ PRO MODÜLÜ
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-400/60" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Voxler 3B Cihaz Çekimi (CSV/CVS) İnceleme</span>
                        <span className="text-[9px] text-cyan-300 font-mono">GPR / Gradiometre / Voxel</span>
                      </div>
                      <div className="text-[10px] text-purple-300/80">
                        Cihazlardan alınan CSV çekimlerini 3B Voxel, İzosörfıs ve OrthoSlice kesit düzleminde modeller.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('STUDIES')}
                    className="p-3.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-left transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Bookmark className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                      <ChevronRight className="w-4 h-4 text-purple-400/60" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Çalışma Kayıtları</div>
                      <div className="text-[10px] text-purple-300/80">Kayıtlı sahalar & yeni kayıt</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('SERVER')}
                    className="p-3.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/40 text-left transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Server className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <ChevronRight className="w-4 h-4 text-indigo-400/60" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🛡️ SUNUCU Masası</span>
                        <span className="text-[9px] px-1 rounded bg-indigo-500/30 text-indigo-300 font-mono">PIN</span>
                      </div>
                      <div className="text-[10px] text-indigo-300/80">Üye listesi, key ve yönetim</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('SUPPORT')}
                    className="p-3.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-left transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Headphones className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <ChevronRight className="w-4 h-4 text-emerald-400/60" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Canlı Destek</div>
                      <div className="text-[10px] text-emerald-300/80">7/24 Jeofizikçi destek hattı</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('REFERRAL')}
                    className="p-3.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 text-left transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Gift className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 font-bold">+15 KREDİ</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Arkadaşını Getir</div>
                      <div className="text-[10px] text-amber-300/80">Davet et, jeton kazan</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('CREDITS')}
                    className="p-3.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-left transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Coins className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <ChevronRight className="w-4 h-4 text-cyan-400/60" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Jeton Yükle</div>
                      <div className="text-[10px] text-emerald-300/80">Shopier 3D Güvenli Ödeme</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('ANNOUNCEMENTS')}
                    className="p-3.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/40 text-left transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Megaphone className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                      <ChevronRight className="w-4 h-4 text-blue-400/60" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Duyurular</div>
                      <div className="text-[10px] text-blue-300/80">Sistem & kampanya bildirimleri</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('FAQ')}
                    className="p-3.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-left transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <HelpCircle className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <ChevronRight className="w-4 h-4 text-cyan-400/60" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">SSS & Kılavuz</div>
                      <div className="text-[10px] text-cyan-300/80">Lisans, 2863 S.K., SAR & Voxler</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Rütbe ve VIP İlerlemesi */}
              {(() => {
                const scans = user.totalScansPerformed || user.scansConducted || 0;
                const rankProg = calculateRankProgression(scans, (currentLang || 'tr') as AppLanguage);
                const vipProg = calculateVipProgression(user.vipPoints || 0);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Rütbe İlerlemesi */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-400" />
                          <span className="font-bold text-white">Rütbe Seviyesi</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                            Seviye {user.rankLevel || rankProg.level}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Toplam: <strong className="text-cyan-400">{scans} Çekim</strong>
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, rankProg.progressPct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>{rankProg.currentXp} XP</span>
                        <span className="text-cyan-300 font-bold">{rankProg.title}</span>
                        <span>{rankProg.nextRankXp} XP</span>
                      </div>
                    </div>

                    {/* VIP Statüsü */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-yellow-400" />
                          <span className="font-bold text-white">VIP Statüsü</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                            VIP {user.vipLevel || vipProg.vipLevel}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Puan: <strong className="text-amber-400">{user.vipPoints || 0} Puan</strong>
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, vipProg.progressPct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>VIP {vipProg.vipLevel}</span>
                        <span className="text-amber-300 font-bold">VIP {vipProg.vipLevel + 1} İçin: {vipProg.pointsRemaining} Puan</span>
                        <span>{vipProg.nextVipPoints} Puan</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ========================================================================= */}
              {/* PRO SÜRÜM: VOXLER 3B CSV/CVS CİHAZ ÇEKİMİ İNCELEME SİSTEMİ                */}
              {/* ========================================================================= */}
              <div id="voxler-profile-section" className="pt-2">
                <VoxlerDeviceScanInspector isProUser={true} isEmbeddedInProfile={true} />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ÇALIŞMA KAYITLARI                                                  */}
          {/* ========================================================================= */}
          {activeTab === 'STUDIES' && (
            <div className="space-y-6">
              {/* Save Current Field Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300 font-mono">
                    <Bookmark className="w-4 h-4 text-purple-400" />
                    <span>MEVCUT HARİTA SAHASINI PROFİLİME KAYDET</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {scanArea ? `${scanArea.center.lat.toFixed(4)}, ${scanArea.center.lng.toFixed(4)}` : '38.4773, 29.7289'}
                  </span>
                </div>

                <form onSubmit={handleSaveStudyInTab} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">ÇALIŞMA BAŞLIĞI</label>
                      <input
                        type="text"
                        value={studyTitleInput}
                        onChange={(e) => setStudyTitleInput(e.target.value)}
                        placeholder="Örn: Uşak Eşme Saha Taraması"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-400 block mb-1">JEOFİZİK NOTLAR & AÇIKLAMA</label>
                      <input
                        type="text"
                        value={studyNotesInput}
                        onChange={(e) => setStudyNotesInput(e.target.value)}
                        placeholder="Örn: 2.2m derinlikte yapısal boşluk anomalisi tespit edildi"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      Aktif Uydu: <strong className="text-cyan-400">{activeSatelliteName || 'TerraSAR-X High-Res'}</strong>
                    </span>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{studySavedSuccess ? '✓ Kaydedildi!' : 'Mevcut Sahayı Kaydet'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Saved Studies List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-slate-300">
                    KAYITLI SAHA ÇALIŞMALARIM ({user.savedStudies?.length || 0})
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Tıklayarak harita üzerinde inceleyebilirsiniz
                  </span>
                </div>

                {(!user.savedStudies || user.savedStudies.length === 0) ? (
                  <div className="p-8 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-2">
                    <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">Henüz profilinize kayıtlı bir çalışma bulunmuyor.</p>
                    <p className="text-[11px] text-slate-500">
                      Yukarıdaki formu kullanarak veya haritadan tarama yaptıktan sonra çalışmanızı kaydedebilirsiniz.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {user.savedStudies.map((study) => (
                      <div
                        key={study.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-2"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-xs font-bold text-white line-clamp-1">{study.title}</h4>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300 font-mono shrink-0">
                              {study.date}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mb-1">
                            <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="truncate">{study.coordinates}</span>
                          </div>

                          {study.notes && (
                            <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 mb-2">
                              "{study.notes}"
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="text-emerald-400 font-bold">{study.hotspotCount} Anomali</span>
                            <span>•</span>
                            <span className="text-slate-300">{study.satelliteName}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                          <button
                            type="button"
                            onClick={() => {
                              sound.playScanBeep();
                              onSelectPastScan(study.coordinates);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Haritada Aç</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStudy(study.id)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Çalışmayı Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Referans Sahalar */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-mono font-bold text-slate-400">
                  REFERANS JEOFİZİK VE ANOMALİ SAHALARI ({PRESET_SCAN_SITES.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PRESET_SCAN_SITES.map((site) => (
                    <div
                      key={site.coords}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{site.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{site.coords}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playScanBeep();
                          onSelectPastScan(site.coords);
                          onClose();
                        }}
                        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 font-bold px-2.5 py-1 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                      >
                        İncele →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SUNUCU (YÖNETİCİ & SİSTEM MERKEZİ - GÜVENLİK PIN KORUMALI)         */}
          {/* ========================================================================= */}
          {activeTab === 'SERVER' && !isAdminAuthenticated && (
            <div className="max-w-md mx-auto my-6 p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-indigo-500/60 shadow-[0_0_60px_rgba(99,102,241,0.25)] text-center relative overflow-hidden backdrop-blur-xl animate-fadeIn">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-600"></div>

              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-indigo-400 mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                <Lock className="w-8 h-8 text-indigo-400 animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-[10px] font-mono text-indigo-300 font-bold mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>GÜVENLİK KONTROLÜ</span>
              </div>

              <h2 className="text-xl font-black text-white tracking-wide">
                YÖNETİCİ GÜVENLİK PIN KODU
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Yönetici Masası ve Kullanıcı Listesi yüksek güvenlik kilidi altındadır. Devam etmek için sunucu güvenlik PIN kodunuzu giriniz.
              </p>

              <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Key className="w-4 h-4 text-indigo-400" />
                  </div>
                  <input
                    type="password"
                    autoFocus
                    value={adminPin}
                    onChange={(e) => {
                      setAdminPin(e.target.value);
                      if (adminAuthError) setAdminAuthError(null);
                    }}
                    placeholder="Güvenlik PIN Kodunu Giriniz..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-indigo-500/50 rounded-2xl text-center font-mono text-base tracking-[0.2em] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-inner"
                  />
                </div>

                {adminAuthError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-medium flex items-center justify-center gap-2 animate-shake">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{adminAuthError}</span>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminPin('');
                      setAdminAuthError(null);
                      setActiveTab('PROFILE');
                    }}
                    className="w-full sm:w-1/3 py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>PIN'i Doğrula & Masayı Aç</span>
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Oturum: <strong className="text-slate-200">{user.email || user.name}</strong></span>
                <span className="text-indigo-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> PIN Korumalı
                </span>
              </div>
            </div>
          )}

          {activeTab === 'SERVER' && isAdminAuthenticated && (
            <AdminControlCenter
              onClose={() => {
                setIsAdminAuthenticated(false);
                logoutAdmin();
                setActiveTab('PROFILE');
              }}
              onNavigateToCoords={(lat, lng, name) => {
                if (onNavigateToCoords) onNavigateToCoords(lat, lng, name);
                if (onClose) onClose();
              }}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB 4: CANLI DESTEK (7/24 JEOFİZİK MÜHENDİS HATTI)                       */}
          {/* ========================================================================= */}
          {activeTab === 'SUPPORT' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/90 border border-emerald-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>7/24 Jeofizik Destek & Danışmanlık Hattı</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Uzman jeofizik mühendislerimiz anomali tespiti ve paket aktivasyonları için çevrimiçi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Message Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 min-h-[280px] max-h-[350px] overflow-y-auto">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-cyan-600 text-slate-950 font-medium rounded-tr-none'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 px-1">
                      {msg.time}
                    </span>
                  </div>
                ))}
              </div>

              {/* Quick FAQ Prompts */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🎁 Arkadaşımı getirince kaç kredi verilir?',
                  '🪙 1 Anomali çekimi kaç kredi?',
                  '💳 Google Play ile jeton nasıl yüklenir?',
                  '⚖️ 2863 Sayılı Kanun mevzuatı',
                  '🛰️ SAR radarı ne kadar derine iner?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setChatInput(prompt);
                    }}
                    className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendChat} className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Jeofizik uzmanına bir soru sorun..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gönder</span>
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: ARKADAŞINI GETİR 15 KREDİ KAZAN                                    */}
          {/* ========================================================================= */}
          {activeTab === 'REFERRAL' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/70 via-slate-900 to-purple-950/70 border border-amber-500/40 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 border border-amber-400/50 flex items-center justify-center text-white shadow-md shrink-0">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                        <span>Arkadaşını Getir, 15 Kredi Kazan!</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                          +15 KREDİ (1 TAM ÇEKİM)
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Davet kodunu arkadaşlarınla paylaş; hem sen hem arkadaşın anında <strong>15 Kredi</strong> kazanın!
                      </p>
                    </div>
                  </div>

                  {/* Referral Stats */}
                  <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-amber-500/30 text-center">
                      <div className="text-[10px] text-slate-400">Davet Edilen</div>
                      <div className="font-bold text-white text-sm">{user.referralsCount || 0} Kişi</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 text-center">
                      <div className="text-[10px] text-slate-400">Kazanılan Bakiye</div>
                      <div className="font-bold text-emerald-400 text-sm">+{user.referralCreditsEarned || 0} Kredi</div>
                    </div>
                  </div>
                </div>

                {referralNotice && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    referralNotice.success 
                      ? 'bg-emerald-950/90 border border-emerald-500/50 text-emerald-200' 
                      : 'bg-rose-950/90 border border-rose-500/50 text-rose-200'
                  }`}>
                    {referralNotice.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{referralNotice.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Box 1: Senin Davet Kodun */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-800/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5 text-amber-400" />
                        Senin Benzersiz Davet Kodun
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Her Davette +15 Kredi</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-amber-500/50 font-mono font-black text-amber-200 text-sm tracking-wider select-all text-center shadow-inner">
                        {myReferralCode}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyMyReferralCode}
                        className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
                      >
                        {copiedReferralCode ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedReferralCode ? 'Kopyalandı!' : 'Kopyala'}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCopyInviteLink}
                        className="flex-1 min-w-[130px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedReferralLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                        <span>{copiedReferralLink ? 'Link Kopyalandı' : 'Davet Linkini Kopyala'}</span>
                      </button>

                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                          `TerraScan AI Zemin & Uydu Radarı uygulamasında benim davet kodumu (${myReferralCode}) girerek anında 15 KREDİ (1 Ücretsiz Anomali Çekimi) kazan! Link: ${window.location.origin}${window.location.pathname}?ref=${myReferralCode}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp Paylaş</span>
                      </a>
                    </div>
                  </div>

                  {/* Box 2: Arkadaşının Kodunu Kullan */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-800/40 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-cyan-400" />
                          Arkadaşının Davet Kodunu Kullan
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">+15 Kredi</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Bir arkadaşından aldığın davet kodunu buraya girerek hesabına hemen <strong>15 Kredi</strong> tanımlayabilirsin.
                      </p>
                    </div>

                    {user.referredBy ? (
                      <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-mono">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold text-white">"{user.referredBy}"</span> davet kodu hesabınıza tanımlandı.
                          <div className="text-[10px] text-emerald-400/80 mt-0.5">15 Kredi bakiyenize eklendi.</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={friendReferralInput}
                            onChange={(e) => setFriendReferralInput(e.target.value.toUpperCase())}
                            placeholder="Örn: TERA-REF-AHME12"
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono uppercase focus:outline-none focus:border-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={handleApplyFriendReferral}
                            disabled={!friendReferralInput.trim()}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all shadow-md shrink-0 cursor-pointer"
                          >
                            15 Kredi Tanımla
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: TERA JETON YÜKLEME (SHOPIER 3D SECURE & LİSANS AKTİVASYONU)        */}
          {/* ========================================================================= */}
          {activeTab === 'CREDITS' && (
            <div className="space-y-6">
              {/* Product Catalog Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/40 shadow-lg flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Tera Jeton Bakiye Yükleme & Avantaj Paketleri</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono border border-emerald-500/30">
                      1 ÇEKİM = 15 KREDİ
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Yeraltı zemin anomalileri, 3D yapısal boşluk analizleri ve radargram kesitleri için Shopier 3D Secure ile anında bakiye yükleyebilir veya mevcut lisans anahtarınızı aktifleştirebilirsiniz.
                  </p>
                </div>
              </div>

              {/* Lisans Anahtarı ile Aktivasyon */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2 font-mono font-bold text-xs text-indigo-300">
                    <KeyRound className="w-4 h-4 text-indigo-400" />
                    <span>LİSANS KODU İLE AKTİVASYON</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Admin Onaylı ve Güvenli Doğrulama
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Yöneticinizden veya promosyon kodlarından aldığınız lisans anahtarını (Örn: <code className="text-indigo-300 font-mono font-bold">TERA-50J-XXXX-YYYY-TR</code>) girerek bakiyenizi anında aktifleştirebilirsiniz.
                </p>

                <form onSubmit={handleRedeemKey} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    placeholder="Lisans Kodu (TERA-XXXX-TR)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 uppercase"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Jetonları Aktifleştir</span>
                  </button>
                </form>
              </div>

              {/* Products Section Header & Switcher */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playScanBeep();
                      setPackageCategory('LICENSE');
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      packageCategory === 'LICENSE'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                    <span>Süreli Sınırsız Lisans</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-400/20 text-blue-200 font-mono">
                      5 Paket
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playScanBeep();
                      setPackageCategory('CREDITS');
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      packageCategory === 'CREDITS'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Tera Jeton (Kontörlü)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-200 font-mono">
                      3 Paket
                    </span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 px-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Shopier 3D Secure & 256-Bit SSL Anında Aktivasyon</span>
                </div>
              </div>

              {/* 1. SÜRELİ SINIRSIZ LİSANS PAKETLERİ (5 Paket) */}
              {packageCategory === 'LICENSE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                  {SHOPIER_LICENSE_PACKAGES.map((pkg, idx) => {
                    const theme = [
                      {
                        badge: '7 GÜN SINIRSIZ',
                        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
                        border: 'border-blue-500/60 bg-gradient-to-b from-blue-950/40 to-slate-900/95 hover:border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]',
                        button: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold',
                      },
                      {
                        badge: 'EN ÇOK TERCİH EDİLEN',
                        badgeColor: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/50',
                        border: 'border-cyan-500/80 bg-gradient-to-b from-cyan-950/40 to-slate-900/95 hover:border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.25)]',
                        button: 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold',
                      },
                      {
                        badge: '60 GÜN SINIRSIZ',
                        badgeColor: 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40',
                        border: 'border-indigo-500/70 bg-gradient-to-b from-indigo-950/35 to-slate-900/95 hover:border-indigo-400',
                        button: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold',
                      },
                      {
                        badge: 'SEZONLUK AVANTAJ',
                        badgeColor: 'bg-purple-500/25 text-purple-200 border-purple-400/40',
                        border: 'border-purple-500/70 bg-gradient-to-b from-purple-950/35 to-slate-900/95 hover:border-purple-400',
                        button: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold',
                      },
                      {
                        badge: '👑 YILLIK VIP LİSANS',
                        badgeColor: 'bg-amber-500/30 text-amber-200 border-amber-400/50',
                        border: 'border-amber-500/80 bg-gradient-to-b from-amber-950/40 to-slate-900/95 hover:border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.25)]',
                        button: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black',
                      },
                    ][idx] || {
                      badge: `${pkg.durationDays} GÜN SINIRSIZ`,
                      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
                      border: 'border-blue-500/60 bg-slate-900',
                      button: 'bg-blue-600 text-white font-bold',
                    };

                    return (
                      <div
                        key={pkg.id}
                        className={`relative p-5 rounded-2xl border transition-all flex flex-col justify-between ${theme.border}`}
                      >
                        <div className="absolute -top-2.5 right-4">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border shadow-sm ${theme.badgeColor}`}>
                            {theme.badge}
                          </span>
                        </div>

                        <div>
                          <div className="mb-1.5">
                            <h4 className="text-sm font-bold text-white tracking-wide">
                              {pkg.name}
                            </h4>
                          </div>

                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-2xl font-black text-white font-mono">
                              {pkg.price.toLocaleString('tr-TR')} TL
                            </span>
                            <span className="text-[11px] text-blue-300 font-mono">
                              ({pkg.durationDays} Gün Sınırsız)
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 mb-3.5 leading-relaxed">
                            {pkg.description}
                          </p>

                          <div className="space-y-1.5 mb-4 text-xs">
                            <div className="flex items-start gap-2 text-slate-300">
                              <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                              <span>{pkg.durationDays} Gün Boyunca Sınırsız Tarama & Analiz</span>
                            </div>
                            <div className="flex items-start gap-2 text-slate-300">
                              <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                              <span>Jeton Harcaması Yapmaz (0 Kredi)</span>
                            </div>
                            <div className="flex items-start gap-2 text-slate-300">
                              <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                              <span>3D Hacimsel Boşluk & Yeraltı Yapı Analizi</span>
                            </div>
                            <div className="flex items-start gap-2 text-slate-300">
                              <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                              <span>Tüm Radar & Uydu Sensörlerine Tam Erişim</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 space-y-2">
                          <a
                            href={pkg.shopierUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${theme.button}`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Shopier İle Satın Al ({pkg.price.toLocaleString('tr-TR')} TL)</span>
                            <ExternalLink className="w-3 h-3 opacity-75" />
                          </a>
                          <button
                            type="button"
                            onClick={() => scrollToIbanPanel(`${pkg.name} (${pkg.price.toLocaleString('tr-TR')} TL)`)}
                            className="w-full py-2 px-3 rounded-xl bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/50 text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>IBAN İle Ödeme (+50 Jeton Hediye)</span>
                          </button>
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                            <span className="flex items-center gap-1 text-blue-300">
                              <ShieldCheck className="w-3 h-3 text-blue-400" />
                              Sınırsız Lisans
                            </span>
                            <span className="text-blue-300 font-bold">
                              {pkg.durationDays} Gün Süre
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. JETON PAKETLERİ (3 Paket) */}
              {packageCategory === 'CREDITS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                  {SHOPIER_CREDIT_PACKAGES.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`relative p-5 rounded-2xl border transition-all flex flex-col justify-between ${pkg.borderTheme}`}
                    >
                      {pkg.badge && (
                        <div className="absolute -top-2.5 right-4">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border shadow-sm ${pkg.badgeColor}`}>
                            {pkg.badge}
                          </span>
                        </div>
                      )}

                      <div>
                        <div className="mb-1.5">
                          <h4 className="text-sm font-bold text-white tracking-wide">
                            {pkg.name}
                          </h4>
                        </div>

                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-black text-white font-mono">{pkg.price}</span>
                          {pkg.unitPriceDesc && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              ({pkg.unitPriceDesc})
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 mb-3.5 leading-relaxed">
                          {pkg.description}
                        </p>

                        <div className="space-y-1.5 mb-4 text-xs">
                          {pkg.features.map((feat, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-slate-300">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 space-y-2">
                        <a
                          href={pkg.shopierUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${pkg.buttonTheme}`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Shopier İle Satın Al ({pkg.price})</span>
                          <ExternalLink className="w-3 h-3 opacity-75" />
                        </a>
                        <button
                          type="button"
                          onClick={() => scrollToIbanPanel(`${pkg.name} (${pkg.price})`)}
                          className="w-full py-2 px-3 rounded-xl bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/50 text-amber-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>IBAN İle Ödeme (+50 Jeton Hediye)</span>
                        </button>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                          <span className="flex items-center gap-1 text-slate-300">
                            <KeyRound className="w-3 h-3 text-cyan-400" />
                            Lisans Destekli
                          </span>
                          <span className="text-cyan-300 font-bold">
                            +{pkg.credits} Kredi
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ===================================================================== */}
              {/* ÖZEL PANEL: IBAN İLE ÖDEME + 50 JETON HEDİYE                           */}
              {/* ===================================================================== */}
              <div
                ref={ibanPanelRef}
                className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-emerald-950/50 border-2 border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.2)] space-y-4 animate-fadeIn"
              >
                {/* Top Ribbon / Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-amber-500/30">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shrink-0">
                      <Building className="w-6 h-6 font-bold" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                          IBAN İLE ÖDEME + 50 JETON HEDİYE
                        </h4>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono font-black shadow-sm flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          +50 TERA JETON HEDİYE
                        </span>
                      </div>
                      <p className="text-xs text-amber-200/90 mt-0.5">
                        Shopier yerine doğrudan banka havalesi / FAST (IBAN) ile yapılan tüm ödemelerde paketinize ek <strong>+50 Tera Jeton</strong> hediye edilir!
                      </p>
                    </div>
                  </div>

                  {selectedIbanPackageName && (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-amber-400/50 text-amber-300 font-mono text-xs shrink-0">
                      Seçili Paket: <strong className="text-white">{selectedIbanPackageName}</strong>
                    </div>
                  )}
                </div>

                {/* IBAN Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. IBAN NUMARASI */}
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/40 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                        1. IBAN NUMARASI (FAST / HAVALE)
                      </span>
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="font-mono font-black text-xs sm:text-sm text-white tracking-wider select-all break-all bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
                      TR39 0001 0000 4494 3761 6350 13
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyIbanText('TR39 0001 0000 4494 3761 6350 13', 'IBAN')}
                      className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      {copiedIbanField === 'IBAN' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>IBAN Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>IBAN Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 2. ALICI İSİM SOYİSİM */}
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/40 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        2. ALICI İSİM SOYİSİM
                      </span>
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="font-mono font-black text-xs sm:text-sm text-white tracking-wide select-all bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
                      MUHAMMET ÖMER FARUK ŞİMŞEK
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyIbanText('MUHAMMET ÖMER FARUK ŞİMŞEK', 'NAME')}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      {copiedIbanField === 'NAME' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>İsim Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>İsim Soyisim Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 3. AÇIKLAMA KISMI */}
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/40 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                        3. AÇIKLAMA (ZORUNLU)
                      </span>
                      <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="font-mono font-bold text-xs text-white select-all bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-cyan-300 font-normal">TerraScan Kullanıcı Adı:</div>
                      <div className="truncate font-black text-amber-200">{user.name || user.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyIbanText(`TerraScan - ${user.name || user.email}`, 'DESC')}
                      className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      {copiedIbanField === 'DESC' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Açıklama Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Açıklamayı Kopyala</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Mandatory WhatsApp Notification Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/95 via-slate-950 to-amber-950/90 border border-emerald-400/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shrink-0">
                      <MessageCircle className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span>ÖDEMENİZİ WHATSAPP'TAN MUTLAKA BİLDİRİN!</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        Havale / EFT işleminizi tamamladıktan sonra açıklama kısmına <strong className="text-white">TerraScan kullanıcı adınızı</strong> yazmayı unutmayın ve ödeme dekontunuzu <strong className="text-emerald-300">WhatsApp üzerinden mutlaka bildirin</strong>. Paketiniz ve <strong className="text-amber-300">+50 Hediye Jetonunuz</strong> anında yüklenecektir.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: DUYURULAR                                                          */}
          {/* ========================================================================= */}
          {activeTab === 'ANNOUNCEMENTS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-blue-400" />
                  <span>SİSTEM VE UYGULAMA DUYURULARI ({announcementsList.length})</span>
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  Yönetici tarafından duyurulan son bildirimler
                </span>
              </div>

              <div className="space-y-3">
                {announcementsList.map((ann) => {
                  const typeColors = {
                    INFO: 'border-blue-500/40 bg-blue-950/20 text-blue-300',
                    UPDATE: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300',
                    PROMO: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
                    WARNING: 'border-rose-500/40 bg-rose-950/20 text-rose-300',
                  };

                  return (
                    <div
                      key={ann.id}
                      className={`p-4 rounded-xl border space-y-2 ${typeColors[ann.type] || typeColors.INFO}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-slate-900 border border-slate-700">
                            {ann.type}
                          </span>
                          <span>{ann.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{ann.createdAt}</span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {ann.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                        <span>Yayınlayan: {ann.author}</span>
                        {isAdminAuthenticated && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(ann.id)}
                            className="text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            Duyuruyu Sil
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 8: SIKÇA SORULAN SORULAR (SSS) & TEKNİK KILAVUZ                        */}
          {/* ========================================================================= */}
          {activeTab === 'FAQ' && (
            <div className="space-y-4">
              <FAQSection compact={false} onOpenSupport={() => setActiveTab('SUPPORT')} />
            </div>
          )}

        </div>

      </div>

      {/* Shopier Başarılı Ödeme Bildirim Penceresi */}
      {shopierSuccessModal?.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white tracking-wide">
                Ödemeniz Onaylandı!
              </h3>
              <p className="text-sm font-medium text-emerald-400">
                Bakiyeniz başarıyla güncellendi
              </p>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Sipariş No:</span>
                <span className="font-mono text-white font-bold">{shopierSuccessModal.orderId}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Paket:</span>
                <span className="font-semibold text-slate-200">{shopierSuccessModal.packageTitle}</span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-800/80 pt-2">
                <span>Eklenen Jeton:</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">+{shopierSuccessModal.tokensAdded} Jeton</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Güncel Toplam Bakiye:</span>
                <span className="font-mono text-amber-300 font-bold text-sm">{shopierSuccessModal.newTotal} Jeton</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShopierSuccessModal(null)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              Harika, Teşekkürler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
