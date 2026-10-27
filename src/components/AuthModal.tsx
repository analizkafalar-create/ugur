import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Coins, 
  ShieldCheck, 
  ShieldAlert,
  Scale, 
  ArrowRight, 
  Radio, 
  Loader2, 
  Ticket, 
  Sparkles, 
  CheckCircle2, 
  Key,
  HelpCircle,
  Box,
  Layers,
  FileCheck2,
  Globe2,
  Cpu,
  Activity,
  ChevronRight,
  Database,
  Satellite,
  Compass,
  Zap,
  MapPin,
  LockKeyhole,
  Radar,
  SlidersHorizontal,
  HardDrive,
  Waves,
  Eye,
  Check,
  Award
} from 'lucide-react';
import { UserProfile, AppLanguage } from '../types';
import { loginUser, registerNewUser, getActiveUser, updateUser } from '../utils/userManager';
import { redeemInviteCode, findInviteCodeInSupabase } from '../utils/inviteCodeManager';
import { redeemOrderOrLicenseCode } from '../utils/activationCodes';
import { TRANSLATIONS } from '../utils/i18n';
import { sound } from '../utils/anomalyEngine';
import { FAQSection } from './FAQSection';
import { RadarPortalVisualizer } from './RadarPortalVisualizer';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
  onAuthSuccess?: (user: UserProfile) => void;
  initialMode?: 'LOGIN' | 'REGISTER' | 'CODE' | 'FAQ';
  currentLang: AppLanguage;
  onSelectLang?: (lang: AppLanguage) => void;
  onOpenSupport?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onAuthSuccess,
  initialMode = 'LOGIN',
  currentLang,
  onSelectLang,
  onOpenSupport,
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER' | 'CODE' | 'FAQ'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [legalAccepted, setLegalAccepted] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warningNotice, setWarningNotice] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Invite / Promo / License Code State
  const [codeInputValue, setCodeInputValue] = useState<string>('');
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);
  const [codeFeedback, setCodeFeedback] = useState<{ text: string; success: boolean; isLicense?: boolean } | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; tokens: number } | null>(null);

  if (!isOpen) return null;

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.tr;
  const loggedInUser = getActiveUser();

  const notifySuccess = (authenticatedUser: UserProfile) => {
    if (typeof onAuthSuccess === 'function') {
      onAuthSuccess(authenticatedUser);
    }
    if (typeof onSuccess === 'function') {
      onSuccess(authenticatedUser);
    }
  };

  // Verify and Redeem Promo / License Code
  const handleVerifyAndRedeemCode = async () => {
    const raw = codeInputValue.trim().toUpperCase();
    if (!raw) {
      setCodeFeedback({ text: 'Lütfen bir lisans anahtarı veya davet kodu giriniz.', success: false });
      return;
    }

    setIsVerifyingCode(true);
    setCodeFeedback(null);

    try {
      const activeUser = getActiveUser();
      const isLicenseFormat = raw.startsWith('TERA-') || raw.startsWith('SP-');

      if (activeUser && activeUser.id) {
        // First attempt License / Order redeem
        const licRes = await redeemOrderOrLicenseCode(raw, activeUser);
        if (licRes.success) {
          sound.playAnomalyDiscovered();
          setCodeFeedback({
            text: `✅ ${licRes.message} (${licRes.creditsAdded || 0} Jeton hesabınıza eklendi)`,
            success: true,
            isLicense: true,
          });
          const updated = getActiveUser();
          if (updated) {
            notifySuccess(updated);
          }
          return;
        }

        // Try Invite / Promo code
        const promoRes = await redeemInviteCode(raw, activeUser);
        if (promoRes.success) {
          sound.playAnomalyDiscovered();
          setCodeFeedback({ text: promoRes.message, success: true });
          if (promoRes.updatedUser) {
            updateUser(promoRes.updatedUser);
            notifySuccess(promoRes.updatedUser);
          }
          return;
        }

        if (isLicenseFormat && !licRes.success) {
          sound.playScanBeep();
          setCodeFeedback({
            text: "Girilen lisans anahtarı formatı veya kodu geçersizdir. Lütfen 'TERA-XXXX-XXXX-XXXX-TR' formatındaki lisans kodunuzu kontrol ediniz.",
            success: false,
            isLicense: true,
          });
          return;
        }

        sound.playScanBeep();
        setCodeFeedback({ text: promoRes.message || 'Geçersiz veya kullanılmış kod!', success: false });
        return;
      }

      // If user is not logged in yet:
      const matched = await findInviteCodeInSupabase(raw);
      if (matched && matched.is_active && matched.used_count < matched.max_uses) {
        sound.playRadarBeep();
        setAppliedPromo({ code: matched.code, tokens: matched.tokens });
        setCodeFeedback({
          text: `🎟️ "${matched.code}" kodu hazır! Giriş veya kayıt sonrasında +${matched.tokens} Tera Jeton hesabınıza aktarılacaktır.`,
          success: true,
        });
        return;
      }

      if (isLicenseFormat) {
        sound.playRadarBeep();
        setCodeFeedback({
          text: "Lisans kodunuz algılandı. Kodunuzu aktifleştirmek için lütfen önce giriş yapın veya kayıt olun.",
          success: true,
          isLicense: true,
        });
        return;
      }

      sound.playScanBeep();
      setCodeFeedback({
        text: "Girilen lisans veya davet kodu bulunamadı. Lisans kodları 'TERA-XXXX-XXXX-XXXX-TR' formatındadır.",
        success: false,
      });
    } catch (err: any) {
      setCodeFeedback({ text: err.message || 'Kod kontrolü sırasında bir hata oluştu.', success: false });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarningNotice(null);
    setSuccessMsg(null);

    try {
      if (!legalAccepted) {
        setError('2863 Sayılı Kanun ve yasal sorumluluk taahhüdünü onaylamadan giriş veya kayıt yapılamaz.');
        return;
      }

      let authenticatedUser: UserProfile;

      if (activeTab === 'LOGIN') {
        if (!email.trim() || !password) {
          setError('Lütfen e-posta ve şifrenizi girin.');
          return;
        }
        setLoading(true);
        authenticatedUser = await loginUser(email, password);
        sound.playAnomalyDiscovered();
      } else {
        const nameInput = (name || (document.getElementById('page-reg-name') as HTMLInputElement)?.value || '').trim();
        const emailInput = (email || (document.getElementById('page-reg-email') as HTMLInputElement)?.value || '').trim();
        const passwordInput = password || (document.getElementById('page-reg-password') as HTMLInputElement)?.value || '';

        if (!nameInput) {
          setError('Lütfen ad ve soyadınızı girin.');
          return;
        }
        if (!emailInput || !emailInput.includes('@')) {
          setError('Lütfen geçerli bir e-posta adresi girin.');
          return;
        }
        if (passwordInput.length < 4) {
          setError('Şifreniz en az 4 karakter olmalıdır.');
          return;
        }
        setLoading(true);
        authenticatedUser = await registerNewUser(nameInput, emailInput, passwordInput, currentLang);
        sound.playAnomalyDiscovered();
      }

      // Automatically redeem pending promo code if applied
      const codeToRedeem = appliedPromo?.code || codeInputValue.trim().toUpperCase();
      if (codeToRedeem) {
        try {
          const promoRes = await redeemInviteCode(codeToRedeem, authenticatedUser);
          if (promoRes.success && promoRes.updatedUser) {
            authenticatedUser = promoRes.updatedUser;
            setSuccessMsg(`🎉 Tebrikler! ${promoRes.tokensAwarded} jeton hesabınıza yüklendi.`);
          }
        } catch (promoErr) {
          console.warn('[AuthPage] Post-auth promo redemption error:', promoErr);
        }
      }

      if (activeTab === 'REGISTER') {
        if (authenticatedUser.creditsRemaining === 0 || authenticatedUser.deviceBonusClaimed) {
          setWarningNotice('Bu cihazdan daha önce deneme kredisi kullanılmıştır.');
          setSuccessMsg((prev) => prev ? `${prev} - Hesabınız oluşturuldu.` : 'Hesabınız oluşturuldu (Başlangıç Jetonu: 0).');
          setTimeout(() => {
            notifySuccess(authenticatedUser);
            onClose();
          }, 2200);
        } else {
          setSuccessMsg((prev) => prev || `${t.accountCreated} +10 Tera Jeton hoş geldin hediyeniz tanımlandı!`);
          setTimeout(() => {
            notifySuccess(authenticatedUser);
            onClose();
          }, 1200);
        }
      } else {
        notifySuccess(authenticatedUser);
        onClose();
      }
    } catch (err: any) {
      sound.playScanBeep();
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#040814] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Sleek Atmospheric Ambient Background Lights */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/3 w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-1/4 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[160px]" />
        <div className="absolute top-1/2 left-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[140px]" />
        
        {/* Crisp Hexagonal / Dot Matrix Engineering Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.5) 1px, transparent 0)`,
            backgroundSize: '28px 28px'
          }}
        />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-2xl px-5 sm:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/10 to-transparent border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Radar className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-base sm:text-lg font-black tracking-wider text-white font-mono">TERRASCAN</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-semibold tracking-wider uppercase">
                Jeofizik İstasyonu
              </span>
            </div>
            <p className="text-[11px] text-slate-400">SAR Radar & Zemin Altı Modelleme Portalı</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 shadow-inner">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={currentLang}
              onChange={(e) => onSelectLang && onSelectLang(e.target.value as AppLanguage)}
              className="bg-transparent border-none text-slate-200 text-xs focus:outline-none cursor-pointer pr-1"
              title={t.changeLanguage}
            >
              <option value="tr" className="bg-slate-900 text-white">🇹🇷 Türkçe</option>
              <option value="en" className="bg-slate-900 text-white">🇬🇧 English</option>
              <option value="de" className="bg-slate-900 text-white">🇩🇪 Deutsch</option>
              <option value="ar" className="bg-slate-900 text-white">🇸🇦 العربية</option>
              <option value="ru" className="bg-slate-900 text-white">🇷🇺 Русский</option>
            </select>
          </div>

          {/* Close or Back to Map Button */}
          {loggedInUser && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:border-slate-600"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Haritaya Dön</span>
              <X className="w-4 h-4 sm:hidden" />
            </button>
          )}
        </div>
      </header>

      {/* Main Page Split-View */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* LEFT COLUMN: ELEGANT SCIENTIFIC WORKSTATION SHOWCASE & RADAR CANVAS */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-medium">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              <span>ELEKTROMANYETİK SAR İNTERFEROMETRİSİ</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Zemin Altı Anomali & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400">
                SAR Radar Analiz Portalı
              </span>
            </h1>

            <p className="text-slate-400 text-sm leading-relaxed">
              ESA Sentinel-1 SAR C-Band radar faz farkı ölçümleri, ALOS-2 L-Band zemin penetrasyonu ve Golden Software Voxler 3B CSV cihaz veri modelleme merkezi.
            </p>
          </div>

          {/* DYNAMIC RADAR PORTAL CANVAS VISUALIZER */}
          <RadarPortalVisualizer />

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center backdrop-blur-md">
              <div className="text-lg font-black text-cyan-400 font-mono">0.05m</div>
              <div className="text-[10px] text-slate-400 font-medium">Grid Çözünürlük</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center backdrop-blur-md">
              <div className="text-lg font-black text-emerald-400 font-mono">50m+</div>
              <div className="text-[10px] text-slate-400 font-medium">Zemin Penetrasyonu</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center backdrop-blur-md">
              <div className="text-lg font-black text-indigo-400 font-mono">256-Bit</div>
              <div className="text-[10px] text-slate-400 font-medium">SSL Şifreleme</div>
            </div>
          </div>

          {/* Feature Highlight Pills */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-slate-300">
              <Box className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Voxler 3B CSV zemin tarama verilerini hacimsel izoyüzey (Isosurface) ile işleme</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-slate-300">
              <Scale className="w-4 h-4 text-amber-400 shrink-0" />
              <span>2863 Sayılı Kanun mevzuatına tam uyumlu bilimsel zemin simülasyonu</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: REFINED AUTHENTICATION CONSOLE */}
        <div className="lg:col-span-7 bg-gradient-to-b from-slate-900/90 via-slate-900/95 to-slate-950 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-[0_10px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col min-h-[580px]">
          
          {/* Segmented Tab Navigation */}
          <div className="grid grid-cols-4 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 mb-6 gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setActiveTab('LOGIN');
                setError(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'LOGIN'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Giriş</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setActiveTab('REGISTER');
                setError(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'REGISTER'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Kayıt</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playRadarBeep();
                setActiveTab('CODE');
                setError(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'CODE'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black'
                  : 'text-amber-300 hover:text-amber-200 hover:bg-slate-900/60'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Lisans</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playRadarBeep();
                setActiveTab('FAQ');
                setError(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'FAQ'
                  ? 'bg-purple-400 text-slate-950 shadow-md shadow-purple-400/20 font-black'
                  : 'text-purple-300 hover:text-purple-200 hover:bg-slate-900/60'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Kılavuz</span>
            </button>
          </div>

          {/* TAB CONTENT AREAS */}
          <div className="flex-1 flex flex-col justify-between">
            
            {/* 1 & 2: LOGIN & REGISTER FORMS */}
            {(activeTab === 'LOGIN' || activeTab === 'REGISTER') && (
              <div className="space-y-4">
                
                {/* Header Subtitle */}
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    {activeTab === 'LOGIN' ? 'Oturum Aç' : 'Yeni Jeofizikçi Hesabı'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeTab === 'LOGIN' 
                      ? 'Kayıtlı e-posta adresiniz ve şifrenizle jeofizik tarama paneline bağlanın.' 
                      : 'Yeni hesap oluşturun; radar analizleri için sistem hesabınıza +10 Tera Jeton tanımlayacaktır.'}
                  </p>
                </div>

                {/* Promo Welcome Banner */}
                {activeTab === 'REGISTER' && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 flex items-center gap-3.5 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                      <Coins className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <span>+10 Tera Jeton Hoş Geldin Paketi</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-mono">Tanımlı</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Kayıt sonrası SAR uydu radar analizleri ve derinlik filtreleri hemen aktifleşir.
                      </p>
                    </div>
                  </div>
                )}

                {/* Feedback Alerts */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-medium flex items-center gap-2 animate-shake">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {warningNotice && (
                  <div className="p-3 rounded-xl bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs font-semibold flex items-center gap-2 animate-pulse">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>{warningNotice}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Form Controls */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {activeTab === 'REGISTER' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Ad & Soyad / Kurum Ünvanı
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          id="page-reg-name"
                          name="full_name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Ahmet Yılmaz (Saha Mühendisi)"
                          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      E-Posta Adresi
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        id={activeTab === 'REGISTER' ? 'page-reg-email' : 'page-login-email'}
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="muhendislik@kurum.com"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Giriş Şifresi
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        id={activeTab === 'REGISTER' ? 'page-reg-password' : 'page-login-password'}
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
                      />
                    </div>
                  </div>

                  {/* 2863 SAYILI KANUN & MEVZUAT TAAHHÜT ONAY KUTUSU */}
                  <div className={`p-3.5 rounded-2xl border transition-all ${
                    legalAccepted 
                      ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200' 
                      : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={legalAccepted}
                        onChange={(e) => setLegalAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-cyan-400 cursor-pointer shrink-0 accent-cyan-400"
                        required
                      />
                      <span className="text-xs leading-relaxed text-slate-300">
                        <strong className="text-cyan-400 font-bold">2863 Sayılı Kanun</strong> ve ilgili mevzuat uyarınca izinsiz araştırma veya kazı yapmayacağımı, platformun yalnızca bilimsel jeofizik zemin simülasyonu sunduğunu beyan ve taahhüt ederim.
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-3"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{activeTab === 'LOGIN' ? 'Oturum Açılıyor...' : 'Hesap Oluşturuluyor...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{activeTab === 'LOGIN' ? 'Portala Giriş Yap' : 'Hesabı Oluştur & Başla'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

              </div>
            )}

            {/* TAB 3: PROMO & LICENSE CODE REDEEM */}
            {activeTab === 'CODE' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2 font-mono">
                    <Key className="w-5 h-5 text-amber-400" />
                    <span>Lisans Anahtarı Doğrulama</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Yetkili sağlayıcınızdan veya yöneticinizden aldığınız lisans anahtarını girerek yetkilerinizi aktifleştirin.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950/80 border border-amber-500/40 space-y-3.5 shadow-xl shadow-amber-950/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-300 font-bold uppercase">Lisans Biçimi (Format):</span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-200 border border-amber-500/30">
                      TERA-XXXX-XXXX-XXXX-TR
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={codeInputValue}
                      onChange={(e) => setCodeInputValue(e.target.value.toUpperCase())}
                      placeholder="TERA-100J-4119-8802-TR"
                      className="flex-1 bg-slate-900 border border-amber-500/50 rounded-xl px-4 py-3 text-xs text-amber-200 uppercase font-mono tracking-wider placeholder-slate-600 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyAndRedeemCode}
                      disabled={isVerifyingCode || !codeInputValue.trim()}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-50 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
                    >
                      {isVerifyingCode ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Doğrula & Yükle</span>
                        </>
                      )}
                    </button>
                  </div>

                  {codeFeedback && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 animate-fadeIn ${
                        codeFeedback.success
                          ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-200'
                          : 'bg-rose-950/90 border border-rose-500/60 text-rose-200'
                      }`}
                    >
                      {codeFeedback.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-relaxed">{codeFeedback.text}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5 font-mono">
                      <FileCheck2 className="w-4 h-4 text-cyan-400" />
                      <span>Süresiz & VIP Lisanslar</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Onaylanan VIP lisanslar sınırsız SAR radar simülasyonu ve Voxler 3B cihaz aktarımı tanımlar.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5 font-mono">
                      <Ticket className="w-4 h-4 text-amber-400" />
                      <span>Davet & Referans Kodları</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Saha ekibinizden aldığınız referans kodunu girerek hesabınıza anında +15 Tera Jeton tanımlatabilirsiniz.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SSS / FAQ INTERACTIVE SECTION */}
            {activeTab === 'FAQ' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2 font-mono">
                    <HelpCircle className="w-5 h-5 text-purple-400" />
                    <span>Sıkça Sorulan Sorular & Teknik Kılavuz</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lisanslama, SAR radar analizleri, Voxler 3B CSV aktarımı ve 2863 S.K. mevzuat kılavuzu.
                  </p>
                </div>

                <div className="max-h-[480px] overflow-y-auto pr-1">
                  <FAQSection compact={true} onOpenSupport={onOpenSupport} />
                </div>
              </div>
            )}

          </div>

          {/* Bottom Footer */}
          <div className="pt-4 mt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono gap-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <LockKeyhole className="w-3.5 h-3.5" />
              <span>256-Bit SSL Şifreli Güvenli İletişim</span>
            </div>
            <div className="flex items-center gap-3">
              <span>TerraScan Jeofizik Mühendisliği</span>
              <span>•</span>
              <span className="text-cyan-400">v3.8</span>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
};
