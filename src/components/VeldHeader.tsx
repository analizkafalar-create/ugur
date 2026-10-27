/**
 * TerraScan AI - Top Control Header
 * Enhanced with City/District/Village search, Google Maps direct navigation,
 * unlimited VIP & Rank indicators, and multi-language support.
 * (Play Store references removed per user request)
 */

import React, { useState, useEffect, useRef } from 'react';
import { ViewDimension, UserProfile, RemoteSensingSatellite, AppLanguage } from '../types';
import { PRESET_SCAN_SITES } from '../data/satellites';
import { TURKISH_LOCATIONS, searchLocalLocations, parseCoordinates, GeoLocationItem } from '../data/turkishLocations';
import { 
  Search, 
  RotateCw, 
  Satellite as SatIcon, 
  FileText, 
  MapPin, 
  ChevronDown,
  MessageSquare,
  MessagesSquare,
  Server,
  Coins,
  Radio,
  Bookmark,
  Globe,
  Navigation,
  Compass,
  ExternalLink,
  Sparkles,
  Loader2,
  Smartphone,
  Crosshair,
  LogIn,
  HelpCircle,
  User,
  ShieldCheck,
  Key,
  Camera,
  Box,
  X
} from 'lucide-react';
import { TerraScanLogo } from './TerraScanLogo';
import { hasActiveLicense as checkHasActiveLicense, getLicenseDaysLeft as calcLicenseDaysLeft } from '../utils/licenseManager';
import { sound } from '../utils/anomalyEngine';
import { TRANSLATIONS, LANGUAGES } from '../utils/i18n';
import { isUserAdmin } from '../utils/adminManager';

interface VeldHeaderProps {
  viewMode: ViewDimension;
  onToggleViewMode: (mode: ViewDimension) => void;
  coordinatesInput: string;
  onCoordinatesSubmit: (coordsStr: string) => void;
  onRefreshScan: () => void;
  onOpenReport: () => void;
  onOpenMembership: (tab?: 'CREDITS' | 'SERVER' | 'PROFILE' | 'HISTORY' | 'PLANS' | 'FAQ') => void;
  onOpenSatelliteModal: () => void;
  onOpenLiveSupport: () => void;
  onOpenCommunityChat?: () => void;
  onOpenApkModal?: () => void;
  onOpenSaveStudy?: () => void;
  onOpenAuth?: () => void;
  onOpenGuide?: () => void;
  onOpenAICamera?: () => void;
  currentLang?: AppLanguage;
  onSelectLang?: (lang: AppLanguage) => void;
  userProfile: UserProfile;
  activeSatellite: RemoteSensingSatellite;
  showSatelliteHUD: boolean;
  onToggleSatelliteHUD: () => void;
}

export const VeldHeader: React.FC<VeldHeaderProps> = ({
  viewMode,
  onToggleViewMode,
  coordinatesInput,
  onCoordinatesSubmit,
  onRefreshScan,
  onOpenReport,
  onOpenMembership,
  onOpenSatelliteModal,
  onOpenLiveSupport,
  onOpenCommunityChat,
  onOpenApkModal,
  onOpenSaveStudy,
  onOpenAuth,
  onOpenGuide,
  onOpenAICamera,
  currentLang = 'tr',
  onSelectLang,
  userProfile,
  activeSatellite,
  showSatelliteHUD,
  onToggleSatelliteHUD,
}) => {
  const [inputVal, setInputVal] = useState(coordinatesInput);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<GeoLocationItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showUserQuickMenu, setShowUserQuickMenu] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.tr;

  // Calculate license status and days left
  const hasActiveLicense = checkHasActiveLicense(userProfile.licenseExpires);
  const licenseDaysLeft = calcLicenseDaysLeft(userProfile.licenseExpires);

  // Keep input in sync with external coordinate updates
  useEffect(() => {
    if (coordinatesInput) {
      setInputVal(coordinatesInput);
    }
  }, [coordinatesInput]);

  // Click outside to close search dropdowns, language dropdown and floating user menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setShowSearchResults(false);
        setShowPresetDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        const isTrigger = (target as HTMLElement).closest?.('[data-user-menu-trigger="true"]');
        if (!isTrigger) {
          setShowUserQuickMenu(false);
        }
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(target)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Live search handler for Province / District / Village / Place / Coordinates
  const handleInputChange = (val: string) => {
    setInputVal(val);
    setShowPresetDropdown(false);

    if (val.trim().length >= 2) {
      const parsed = parseCoordinates(val);
      if (parsed) {
        setSearchResults([
          {
            name: `GPS Koordinatı (${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)})`,
            type: 'JEOFIZIK',
            typeLabel: 'Koordinat',
            province: 'Doğrudan Konum',
            lat: parsed.lat,
            lng: parsed.lng,
            description: 'Kullanıcı tarafından girilen tam enlem ve boylam',
          },
        ]);
        setShowSearchResults(true);
        return;
      }

      const localMatches = searchLocalLocations(val);
      setSearchResults(localMatches);
      setShowSearchResults(true);

      // Debounced OpenStreetMap Nominatim live search if local list has few results
      if (localMatches.length < 3 && val.trim().length >= 3) {
        setIsSearchingOnline(true);
        const timer = setTimeout(async () => {
          try {
            const query = encodeURIComponent(`${val.trim()}, Türkiye`);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=tr&q=${query}&limit=5`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                const onlineItems: GeoLocationItem[] = data.map((item: any) => ({
                  name: item.name || item.display_name.split(',')[0],
                  type: 'KOY',
                  typeLabel: 'Yerleşim / Köy',
                  province: item.display_name.split(',').slice(1, 3).join(',').trim(),
                  lat: parseFloat(item.lat),
                  lng: parseFloat(item.lon),
                  description: item.display_name,
                }));
                // Merge without duplicates
                setSearchResults((prev) => {
                  const existingNames = new Set(prev.map((p) => p.name.toLowerCase()));
                  const filtered = onlineItems.filter((o) => !existingNames.has(o.name.toLowerCase()));
                  return [...prev, ...filtered].slice(0, 8);
                });
              }
            }
          } catch (err) {
            console.warn('Geocoding query error', err);
          } finally {
            setIsSearchingOnline(false);
          }
        }, 400);

        return () => clearTimeout(timer);
      }
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };

  const handleSelectLocation = (lat: number, lng: number, name: string) => {
    const coordsStr = `${lat.toFixed(6)} ${lng.toFixed(6)}`;
    setInputVal(coordsStr);
    setShowSearchResults(false);
    setShowPresetDropdown(false);
    setIsMobileSearchOpen(false);
    sound.playScanBeep();
    onCoordinatesSubmit(coordsStr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      sound.playScanBeep();
      onCoordinatesSubmit(inputVal.trim());
      setShowSearchResults(false);
      setShowPresetDropdown(false);
      setIsMobileSearchOpen(false);
    }
  };

  // Google Maps Navigation URL generator
  const currentCoords = parseCoordinates(inputVal) || { lat: 38.477309, lng: 29.728954 };
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${currentCoords.lat},${currentCoords.lng}&travelmode=driving`;

  const handleUseCurrentGPS = () => {
    if ('geolocation' in navigator) {
      sound.playScanBeep();
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coordsStr = `${pos.coords.latitude.toFixed(6)} ${pos.coords.longitude.toFixed(6)}`;
          setInputVal(coordsStr);
          onCoordinatesSubmit(coordsStr);
        },
        (err) => {
          console.warn('Geolocation failed', err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const renderSearchForm = (isMobile: boolean) => (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowSearchResults(true);
            }}
            placeholder={t.searchPlaceholder}
            className="w-full pl-8 sm:pl-9 pr-14 py-1.5 sm:py-2 rounded-full bg-white text-slate-900 placeholder-slate-500 text-xs sm:text-sm font-sans font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            autoFocus={isMobile}
          />
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2" />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearchingOnline && (
              <Loader2 className="w-3.5 h-3.5 text-cyan-600 animate-spin" />
            )}
            {inputVal && (
              <button
                type="button"
                onClick={() => {
                  setInputVal('');
                  setSearchResults([]);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                title="Temizle"
              >
                ✕
              </button>
            )}
            {/* Preset locations quick trigger */}
            <button
              type="button"
              onClick={() => {
                setShowPresetDropdown(!showPresetDropdown);
                setShowSearchResults(false);
              }}
              className="text-slate-500 hover:text-slate-800 p-0.5 rounded"
              title="Kayıtlı Jeofizik Örnek Sahaları"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Submit Button */}
        <button
          type="submit"
          className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shrink-0 active:scale-95 transition-all"
        >
          <Search className="w-3.5 h-3.5 text-slate-950" />
          <span className="hidden sm:inline">{t.search}</span>
        </button>

        {/* Current GPS Position Button */}
        <button
          type="button"
          onClick={handleUseCurrentGPS}
          className="p-1.5 sm:p-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 transition-colors shadow-sm shrink-0"
          title="Mevcut GPS Konumuma Git"
        >
          <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
        </button>

        {/* Refresh / Re-scan Button */}
        <button
          type="button"
          onClick={() => {
            sound.playScanBeep();
            onRefreshScan();
          }}
          className="p-1.5 sm:p-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 transition-colors shadow-sm shrink-0"
          title="Yeniden Tara / Güncelle"
        >
          <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Google Maps Directions Button (Desktop only) */}
        {!isMobile && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-sm transition-all shrink-0 border border-blue-400/40"
            title={`${t.openGoogleMaps} - ${t.directionsToPoint}`}
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-200" />
            <span className="hidden xl:inline">Yol Tarifi</span>
            <ExternalLink className="w-3 h-3 text-blue-200" />
          </a>
        )}

        {/* Mobile Close Search */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(false)}
            className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white shrink-0"
            title="Aramayı Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Live Search Auto-Complete Dropdown */}
      {showSearchResults && searchResults.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-cyan-500/40 rounded-xl shadow-2xl p-2 z-50 text-xs font-sans max-h-80 overflow-y-auto backdrop-blur-lg">
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800 text-[11px] text-cyan-400 font-bold uppercase tracking-wider">
            <span>📍 Yer / Köy / İlçe / Koordinat Sonuçları</span>
            <span className="text-slate-500 font-normal">{searchResults.length} sonuç</span>
          </div>
          <div className="space-y-1 mt-1.5">
            {searchResults.map((item, idx) => (
              <button
                key={`${item.name}-${idx}`}
                type="button"
                onClick={() => handleSelectLocation(item.lat, item.lng, item.name)}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-800/90 flex items-center justify-between text-slate-200 transition-colors border border-transparent hover:border-cyan-500/30 group"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-white truncate text-xs">{item.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30 shrink-0">
                      {item.typeLabel}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1.5">
                    <span className="text-slate-300 font-medium">{item.province}</span>
                    {item.district && <span>• {item.district}</span>}
                    {item.description && <span className="text-slate-500">({item.description})</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <code className="text-[10px] text-cyan-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 block">
                    {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                  </code>
                  <span className="text-[9px] text-emerald-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Taramayı Başlat →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preset Locations Dropdown */}
      {showPresetDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs font-mono">
          <div className="text-[10px] text-cyan-400 px-2 py-1 uppercase tracking-wider font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Örnek Jeofizik ve Anomali Sahaları:</span>
          </div>
          <div className="space-y-1 mt-1">
            {PRESET_SCAN_SITES.map((site) => (
              <button
                key={site.coords}
                type="button"
                onClick={() => {
                  setInputVal(site.coords);
                  sound.playScanBeep();
                  onCoordinatesSubmit(site.coords);
                  setShowPresetDropdown(false);
                  setIsMobileSearchOpen(false);
                }}
                className="w-full text-left p-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-slate-200 transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{site.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{site.description}</div>
                </div>
                <code className="text-[10px] text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {site.coords}
                </code>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* FLOATING USER QUICK MENU (INDEPENDENT FLOATING PANEL - NO BACKDROP OVERLAY) */}
      {showUserQuickMenu && (
        <div 
          ref={userMenuRef}
          onClick={(e) => e.stopPropagation()}
          className="fixed top-[80px] right-[20px] z-[10000] w-full max-w-[320px] max-h-[80vh] overflow-y-auto pointer-events-auto bg-slate-950/98 backdrop-blur-2xl border border-cyan-500/60 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.95)] p-3 text-xs space-y-2 animate-fadeIn"
          style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 10000 }}
        >
          {/* User Summary Header */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 font-bold text-sm shadow-sm shrink-0">
              {userProfile.rankBadge || '🥉'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{userProfile.name}</div>
              <div className="text-[10px] text-cyan-300 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">VIP {userProfile.vipLevel || 1}</span>
                <span>•</span>
                {hasActiveLicense ? (
                  <span className="text-blue-300 font-bold">Lisans: {licenseDaysLeft} Gün</span>
                ) : (
                  <span className="text-yellow-300 font-bold">{userProfile.creditsRemaining} Jeton</span>
                )}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="space-y-1.5 pt-0.5">
            {onOpenAICamera && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserQuickMenu(false);
                  sound.playScanBeep();
                  onOpenAICamera();
                }}
                className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl bg-gradient-to-r from-teal-950/90 via-cyan-950/90 to-blue-950/90 hover:from-teal-900/90 text-cyan-200 flex items-center justify-between font-bold border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-95 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-110 transition-transform">
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span>📷 AI Saha & Zemin Kamerası</span>
                    </div>
                    <div className="text-[10px] text-cyan-300/80 font-mono">Gerçek Zamanlı Spektral Görüş</div>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-black text-[9px] shadow-sm">
                  PRO AI
                </span>
              </button>
            )}

            {onOpenAuth && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserQuickMenu(false);
                  sound.playScanBeep();
                  onOpenAuth();
                }}
                className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-950/90 to-blue-950/90 hover:from-cyan-900/90 text-cyan-200 flex items-center gap-2.5 font-bold border border-cyan-500/50 shadow-sm active:scale-95 transition-all"
              >
                <LogIn className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>🔑 Giriş Yap / Hesap Değiştir</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUserQuickMenu(false);
                sound.playScanBeep();
                onOpenReport();
              }}
              className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/70 text-purple-200 flex items-center gap-2.5 border border-purple-500/40 active:scale-95 transition-all"
            >
              <FileText className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-bold">📄 Jeofizik Raporunu Görüntüle</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUserQuickMenu(false);
                sound.playScanBeep();
                onOpenMembership('PROFILE');
              }}
              className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-200 flex items-center gap-2.5 border border-slate-800/80 active:scale-95 transition-all"
            >
              <User className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>👤 Profilim & VIP İlerlemesi</span>
            </button>

            {/* Voxler 3B Cihaz Çekimi (CSV/CVS) İnceleme Sistemi - PRO */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUserQuickMenu(false);
                sound.playAnomalyDiscovered();
                onOpenMembership('PROFILE');
                setTimeout(() => {
                  document.getElementById('voxler-profile-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 250);
              }}
              className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/80 hover:from-purple-900/90 text-purple-200 flex items-center justify-between font-bold border border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.2)] active:scale-95 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-110 transition-transform">
                  <Box className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div>
                  <div className="font-bold text-xs text-white flex items-center gap-1.5">
                    <span>📦 3B Cihaz Çekimi (CSV/CVS)</span>
                  </div>
                  <div className="text-[10px] text-purple-300/80 font-mono">Voxler GPR & Gradiometre Voxel</div>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[9px] shadow-sm">
                PRO
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUserQuickMenu(false);
                sound.playScanBeep();
                onOpenMembership('CREDITS');
              }}
              className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-200 flex items-center gap-2.5 border border-slate-800/80 active:scale-95 transition-all"
            >
              <Coins className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-yellow-200 font-semibold">🪙 Jeton Yükle (+Paketler)</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUserQuickMenu(false);
                sound.playScanBeep();
                onOpenMembership('HISTORY');
              }}
              className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-200 flex items-center gap-2.5 border border-slate-800/80 active:scale-95 transition-all"
            >
              <Bookmark className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>📁 Kayıtlı Sahalarım (Çalışmalar)</span>
            </button>

            {/* Yönetici Masası (Sunucu) - Her zaman görünür ve PIN ile korunur */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUserQuickMenu(false);
                sound.playScanBeep();
                onOpenMembership('SERVER');
              }}
              className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/70 hover:from-indigo-900 hover:to-indigo-800 text-slate-100 flex items-center justify-between border border-indigo-500/50 hover:border-indigo-400 shadow-md active:scale-95 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <div className="font-bold text-xs text-indigo-200 group-hover:text-white flex items-center gap-1.5">
                    <span>🛡️ Yönetici Masası (Sunucu)</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Üye listesi & PIN korumalı masa</div>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                PIN
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUserQuickMenu(false);
                sound.playScanBeep();
                onOpenLiveSupport();
              }}
              className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-900 text-slate-200 flex items-center gap-2.5 border border-slate-800/80 active:scale-95 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-purple-400 shrink-0" />
              <span>💬 Canlı Destek (7/24 Uzman)</span>
            </button>

            {onOpenCommunityChat && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserQuickMenu(false);
                  sound.playScanBeep();
                  onOpenCommunityChat();
                }}
                className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900/80 text-cyan-200 flex items-center justify-between border border-cyan-500/40 shadow-sm active:scale-95 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-110 transition-transform">
                    <MessagesSquare className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-cyan-100 flex items-center gap-1.5">
                      <span>💬 Saha Topluluğu & Sohbet</span>
                    </div>
                    <div className="text-[10px] text-cyan-400/70">Anlık Saha Mesajlaşması</div>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}

            {onOpenGuide && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserQuickMenu(false);
                  sound.playScanBeep();
                  onOpenGuide();
                }}
                className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-200 flex items-center gap-2.5 border border-amber-500/30 active:scale-95 transition-all"
              >
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-bold">❓ Mobil Nasıl Kullanılır?</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowUserQuickMenu(false);
                sound.playScanBeep();
                onOpenMembership('FAQ');
              }}
              className="relative z-10 pointer-events-auto cursor-pointer w-full text-left px-3 py-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-200 flex items-center justify-between border border-cyan-500/30 active:scale-95 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-bold">❓ Sıkça Sorulan Sorular (SSS)</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                Rehber
              </span>
            </button>
          </div>

          {/* Language Selector */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-[10px] text-slate-400 px-1 py-0.5 font-semibold">Dil / Language</div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectLang) onSelectLang(lang.code);
                    setShowUserQuickMenu(false);
                    sound.playScanBeep();
                  }}
                  className={`relative z-10 pointer-events-auto cursor-pointer px-2 py-1.5 rounded-lg text-center text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                    currentLang === lang.code 
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/50' 
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="text-[11px]">{lang.code.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <header 
        className="fixed top-0 left-0 right-0 z-50 w-full shrink-0 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/90 px-3 sm:px-4 pb-2.5 shadow-2xl font-sans transition-all"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 36px)' }}
      >
        {/* ========================================================================= */}
        {/* MOBILE LAYOUT (2 ROWS) - Visible on screens < 768px (md:hidden)          */}
        {/* ========================================================================= */}
        <div className="flex md:hidden flex-col gap-2.5 w-full">
          
          {/* 1. SATIR: Sol Logo (TERRASCAN) | Sağ Kullanıcı Profili (İsim + Rozet) */}
          <div className="flex items-center justify-between w-full min-w-0 pt-0.5">
            {/* Sol: Logo */}
            <div className="flex items-center gap-1.5 shrink-0">
              <TerraScanLogo 
                size={24} 
                showText={true} 
                textClassName="text-sm font-black tracking-wider bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent" 
              />
            </div>

            {/* Sağ: Kullanıcı Profili (İsim + Rozet + VIP) */}
            <div className="relative shrink-0">
              <button
                type="button"
                data-user-menu-trigger="true"
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playScanBeep();
                  setShowUserQuickMenu((prev) => !prev);
                }}
                className="relative z-20 cursor-pointer pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-cyan-500/70 hover:border-cyan-400 transition-all shadow-md active:scale-95 shrink-0 max-w-[220px]"
                title={`Hesap & Menü: ${userProfile.name}`}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 font-bold text-[10px] shadow-sm shrink-0">
                  <span>{userProfile.rankBadge || '🥉'}</span>
                </div>
                <span className="text-xs text-cyan-300 font-bold truncate">
                  {userProfile.name || 'Giriş'}
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shrink-0">
                  V{userProfile.vipLevel || 1}
                </span>
              </button>
            </div>
          </div>

          {/* 2. SATIR: Kompakt Alt Bant: [ 2B | 3B ] , Arama İkonu , [ 📄 Rapor ] , [ 🪙 Jeton ] */}
          <div className="flex items-center justify-between w-full pt-0.5 gap-1.5">
            {/* [ 2B | 3B ] Switcher */}
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-full border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onToggleViewMode('2D');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  viewMode === '2D'
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2B
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onToggleViewMode('3D');
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  viewMode === '3D'
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3B
              </button>
            </div>

            {/* Arama İkonu & Hızlı Arama Butonu */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setIsMobileSearchOpen(!isMobileSearchOpen);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all active:scale-95 shrink-0 ${
                isMobileSearchOpen
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                  : 'bg-slate-900 text-cyan-300 border-slate-700 hover:border-cyan-500/50'
              }`}
              title="Konum ve Koordinat Ara"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Ara</span>
            </button>

            {/* AI Kamera Butonu (Mobilde hızlı erişim) */}
            {onOpenAICamera && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenAICamera();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-teal-950/90 to-cyan-950/90 border border-cyan-400/60 text-cyan-200 font-bold text-xs active:scale-95 transition-all shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                title="AI Saha & Zemin Kamerası"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>AI Kamera</span>
              </button>
            )}

            {/* Rapor Butonu (Mobilde hızlı erişim) */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                onOpenReport();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/90 border border-purple-500/60 text-purple-200 font-bold text-xs active:scale-95 transition-all shrink-0 shadow-sm"
              title="Jeofizik Raporu"
            >
              <FileText className="w-3.5 h-3.5 text-purple-300" />
              <span>Rapor</span>
            </button>

            {/* [ 🪙 Jeton / 🛡️ Lisans ] Pill */}
            {hasActiveLicense ? (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenMembership('CREDITS');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/90 border border-blue-400/60 text-blue-300 font-mono text-xs font-bold shadow-sm active:scale-95 transition-all shrink-0"
                title={`Sınırsız Lisans Aktif: ${licenseDaysLeft} Gün`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>Lisans: {licenseDaysLeft} Gün</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenMembership('CREDITS');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-400/60 text-emerald-300 font-mono text-xs font-bold shadow-sm active:scale-95 transition-all shrink-0"
                title="Tera Jeton Yükle"
              >
                <Coins className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                <span>{userProfile.creditsRemaining}</span>
              </button>
            )}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* DESKTOP LAYOUT (SINGLE ROW) - Visible on screens >= 768px (hidden md:flex) */}
        {/* ========================================================================= */}
        <div className="hidden md:flex items-center justify-between gap-2 w-full">
          {/* Brand & 2D/3D Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 py-0.5">
              <TerraScanLogo size={24} showText={true} textClassName="text-sm font-black tracking-wider bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent" />
            </div>

            {/* 2B / 3B Mode Switch Pills */}
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-full border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => onToggleViewMode('2D')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  viewMode === '2D'
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2B
              </button>
              <button
                type="button"
                onClick={() => onToggleViewMode('3D')}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  viewMode === '3D'
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3B
              </button>
            </div>
          </div>

          {/* Center: Desktop Search Bar */}
          <div ref={!isMobileSearchOpen ? searchContainerRef : undefined} className="flex-1 max-w-sm lg:max-w-md mx-2 relative">
            {renderSearchForm(false)}
          </div>

          {/* Right Status Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Rehber Butonu */}
            {onOpenGuide && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenGuide();
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-black text-xs shadow-sm active:scale-95 transition-all shrink-0"
                title="Kullanım Rehberi"
              >
                ?
              </button>
            )}

            {/* AI Kamera Butonu */}
            {onOpenAICamera && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenAICamera();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-teal-950 to-cyan-950 hover:from-teal-900 hover:to-cyan-900 text-cyan-200 font-bold text-xs border border-cyan-400/50 shadow-sm active:scale-95 transition-transform shrink-0"
                title="TerraScan AI Saha ve Zemin Kamerası"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>AI Kamera</span>
              </button>
            )}

            {/* Rapor Butonu */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                onOpenReport();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs shadow-sm active:scale-95 transition-transform shrink-0"
              title="Jeofizik Raporunu Aç"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="text-xs">{t.report}</span>
            </button>

            {/* Tera Jeton / Sınırsız Lisans Badge */}
            {hasActiveLicense ? (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenMembership('CREDITS');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/90 border border-blue-400/60 text-blue-300 font-mono text-xs font-bold shadow-sm active:scale-95 transition-transform shrink-0"
                title={`Sınırsız Lisans: ${licenseDaysLeft} Gün`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>Lisans: {licenseDaysLeft} Gün</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenMembership('CREDITS');
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/90 border border-emerald-400/50 text-emerald-300 font-mono text-xs font-bold shadow-sm active:scale-95 transition-transform shrink-0"
                title="Tera Jeton Yükle & VIP Puanı Kazan"
              >
                <Coins className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                <span>{userProfile.creditsRemaining}</span>
                <span className="hidden lg:inline text-[10px] text-emerald-400 font-normal">Jeton</span>
              </button>
            )}

            {/* Üst Bar: 🛡️ Yönetici Masası (Sunucu) Butonu - Her Zaman Görünür */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                onOpenMembership('SERVER');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/90 hover:bg-indigo-900/90 border border-indigo-500/60 text-indigo-200 font-bold text-xs shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
              title="🛡️ Yönetici Masası (Sunucu) - PIN Korumalı"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xl:inline">🛡️ Sunucu Masası</span>
              <span className="xl:hidden">Sunucu</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-mono">PIN</span>
            </button>

            {/* Multi-Language Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLangDropdown(!showLangDropdown);
                }}
                className="relative z-10 pointer-events-auto cursor-pointer px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300 flex items-center gap-1 transition-all"
                title="Dili Değiştir / Language"
              >
                <span>{LANGUAGES.find((l) => l.code === currentLang)?.flag || '🇹🇷'}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {showLangDropdown && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1.5 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-[9999] pointer-events-auto text-xs space-y-0.5"
                >
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectLang) onSelectLang(lang.code);
                        setShowLangDropdown(false);
                        sound.playScanBeep();
                      }}
                      className={`relative z-10 pointer-events-auto cursor-pointer w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                        currentLang === lang.code
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </span>
                      {currentLang === lang.code && <span className="text-[10px] text-cyan-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profil, Giriş & Menü Butonu */}
            <div className="relative shrink-0">
              <button
                type="button"
                data-user-menu-trigger="true"
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playScanBeep();
                  setShowUserQuickMenu((prev) => !prev);
                }}
                className="relative z-20 cursor-pointer pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-cyan-500/60 hover:border-cyan-400 transition-all shadow-sm active:scale-95 shrink-0"
                title={`Hesap & Menü: ${userProfile.name} | VIP ${userProfile.vipLevel || 1}`}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 font-bold text-[11px] shadow-sm shrink-0">
                  <span>{userProfile.rankBadge || '🥉'}</span>
                </div>
                <span className="text-xs text-cyan-300 font-bold whitespace-nowrap">
                  {userProfile.name || 'Giriş'}
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shrink-0">
                  V{userProfile.vipLevel || 1}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE SEARCH OVERLAY INPUT */}
        {isMobileSearchOpen && (
          <div ref={searchContainerRef} className="md:hidden pt-2 pb-1 border-t border-slate-800/80 mt-1.5 animate-fadeIn">
            {renderSearchForm(true)}
          </div>
        )}
      </header>
    </>
  );
};
