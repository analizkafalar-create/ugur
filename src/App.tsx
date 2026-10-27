/**
 * TerraScan AI - Satellite Remote Sensing & Subsurface Anomaly Detection
 * Built to Veldscan specifications
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ViewDimension, 
  DataLayerType, 
  ActiveSensorType, 
  ScanArea, 
  UserProfile, 
  RemoteSensingSatellite,
  AnomalyHotspot,
  MembershipPlanTier,
  DepthFilter,
  MeasurePoint,
  AppLanguage,
  ScanMode,
  ScanResolution
} from './types';
import { REMOTE_SENSING_SATELLITES, INITIAL_USER_PROFILE, PRESET_SCAN_SITES } from './data/satellites';
import { generateAnomalyScan, generateReportData, sound } from './utils/anomalyEngine';
import { getActiveUser, setActiveUser, logoutUser, updateUser, addCreditsAndVipPoints, calculateRankProgression, fetchUsers } from './utils/userManager';
import { hasActiveLicense } from './utils/licenseManager';
import { isUserAdmin } from './utils/adminManager';
import { TRANSLATIONS, getRankBadgeAndTitle } from './utils/i18n';
import { verifyShopierPayment, processConfirmedPayment, processIndependentDirectPayment, isShopierCheckoutAwaiting } from './utils/shopierClient';
import './utils/playBilling';
import { getSupabaseClient, isSupabaseAvailable } from './lib/supabase';
import {
  extractAndCleanPaymentUrlParams,
  isOrderIdAlreadyProcessed,
  markOrderIdAsProcessed,
} from './utils/paymentIdempotency';
import { ShieldAlert, X } from 'lucide-react';

import { VeldHeader } from './components/VeldHeader';
import { FloatingSidebar } from './components/FloatingSidebar';
import { BottomControlDock } from './components/BottomControlDock';
import { MapScannerCanvas } from './components/MapScannerCanvas';
import { AnomalyReportModal } from './components/AnomalyReportModal';
import { MembershipModal, MembershipTabType } from './components/MembershipModal';
import { SatelliteSelectorModal } from './components/SatelliteSelectorModal';
import { LayersModal } from './components/LayersModal';
import { SatelliteOrbitView } from './components/SatelliteOrbitView';
import { ScanSummaryBox } from './components/ScanSummaryBox';
import { LiveSupportModal } from './components/LiveSupportModal';
import { CommunityChatModal } from './components/CommunityChatModal';
import { PlayStoreModal } from './components/PlayStoreModal';
import { MeasureToolOverlay } from './components/MeasureToolOverlay';
import { DepthSlicerDock } from './components/DepthSlicerDock';
import { RadargramDock } from './components/RadargramDock';
import { ScanSettingsModal } from './components/ScanSettingsModal';
import { ScanTelemetryOverlay } from './components/ScanTelemetryOverlay';
import { AuthModal } from './components/AuthModal';
import { SaveStudyModal } from './components/SaveStudyModal';
import { MobileGuideModal } from './components/MobileGuideModal';
import { AICameraModal } from './components/AICameraModal';
import { D3HeatmapModal } from './components/D3HeatmapModal';
import { LidarHeatmapDrawer, LidarSmartConfig } from './components/LidarHeatmapDrawer';

export default function App() {
  // Active Remote Sensing Satellite
  const [activeSatellite, setActiveSatellite] = useState<RemoteSensingSatellite>(REMOTE_SENSING_SATELLITES[0]);

  // View Mode: '2D' (Kuşbakışı) or '3D' (Perspektif Yeraltı Odaları)
  const [viewMode, setViewMode] = useState<ViewDimension>('2D');

  // Search & Coordinates state (Defaulting to the user's screenshot coordinate in Uşak)
  const [coordinatesInput, setCoordinatesInput] = useState<string>('38.477309 29.728954');

  // Multi-Language Support
  const [currentLang, setCurrentLang] = useState<AppLanguage>('tr');

  // User Profile & Authentication State (Girişte Üyelik Zorunluluğu)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const existing = getActiveUser();
    if (existing) {
      return existing;
    }
    return INITIAL_USER_PROFILE;
  });

  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isSaveStudyOpen, setIsSaveStudyOpen] = useState<boolean>(false);
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState<boolean>(false);
  const [isAICameraOpen, setIsAICameraOpen] = useState<boolean>(false);

  // Check login on startup: user requested "girişte üyelik çıksın"
  useEffect(() => {
    fetchUsers(true).catch(() => {});
    const active = getActiveUser();
    if (!active) {
      setIsAuthOpen(true);
    } else {
      setUserProfile(active);
      if (active.preferredLanguage) {
        setCurrentLang(active.preferredLanguage);
      }
    }
  }, []);

  // Save profile state on change (guard against duplicate updates)
  const lastSavedUserJsonRef = useRef<string>('');
  useEffect(() => {
    if (userProfile && userProfile.id) {
      const currentJson = JSON.stringify(userProfile);
      if (lastSavedUserJsonRef.current !== currentJson) {
        lastSavedUserJsonRef.current = currentJson;
        updateUser(userProfile);
      }
    }
  }, [userProfile]);

  // Synchronize active user state in real-time when licenses or credits are updated from Admin Panel
  useEffect(() => {
    const handleActiveUserSync = () => {
      const active = getActiveUser();
      if (active && active.id) {
        const activeJson = JSON.stringify(active);
        if (lastSavedUserJsonRef.current !== activeJson) {
          lastSavedUserJsonRef.current = activeJson;
          setUserProfile(active);
        }
      }
    };

    window.addEventListener('terrascan_active_user_updated', handleActiveUserSync);
    window.addEventListener('terrascan_users_updated', handleActiveUserSync);
    window.addEventListener('storage', handleActiveUserSync);

    return () => {
      window.removeEventListener('terrascan_active_user_updated', handleActiveUserSync);
      window.removeEventListener('terrascan_users_updated', handleActiveUserSync);
      window.removeEventListener('storage', handleActiveUserSync);
    };
  }, []);

  const [membershipInitialTab, setMembershipInitialTab] = useState<MembershipTabType>('CREDITS');

  const handleOpenMembershipModal = (tab?: MembershipTabType) => {
    setMembershipInitialTab(tab || 'CREDITS');
    setIsMembershipOpen(true);
  };

  const handleAuthSuccess = (authedUser: UserProfile) => {
    setUserProfile(authedUser);
    setIsAuthOpen(false);
    if (authedUser.preferredLanguage) {
      setCurrentLang(authedUser.preferredLanguage);
    }
  };

  const handleSwitchAccount = () => {
    logoutUser();
    setIsMembershipOpen(false);
    setIsAuthOpen(true);
  };

  const handleSelectLang = (lang: AppLanguage) => {
    setCurrentLang(lang);
    setUserProfile((prev) => {
      const updated = {
        ...prev,
        preferredLanguage: lang,
        rankTitle: getRankBadgeAndTitle(prev.rank || 'OBSERVER', lang).title,
      };
      updateUser(updated);
      return updated;
    });
  };

  // Active Data Layer & Sensor
  const [activeLayer, setActiveLayer] = useState<DataLayerType>('ANOMALY');
  const [activeSensor, setActiveSensor] = useState<ActiveSensorType>('METAL_MINERAL');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Field Distance & Bearing Measurement State
  const [isMeasureActive, setIsMeasureActive] = useState<boolean>(false);
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);

  // Subsurface Depth Slicer & GPR Filter
  const [isDepthSlicerOpen, setIsDepthSlicerOpen] = useState<boolean>(false);
  const [depthFilter, setDepthFilter] = useState<DepthFilter>({ minDepth: 0.0, maxDepth: 5.0 });

  // Radargram (B-Scan Cross-Section) & Advanced Scan Settings
  const [isRadargramOpen, setIsRadargramOpen] = useState<boolean>(false);
  const [isScanSettingsOpen, setIsScanSettingsOpen] = useState<boolean>(false);
  const [currentScanMode, setCurrentScanMode] = useState<ScanMode>('SAR_VELD');
  const [currentScanResolution, setCurrentScanResolution] = useState<ScanResolution>('HD');
  const [isocontoursEnabled, setIsocontoursEnabled] = useState<boolean>(true);

  // Sound Engine Muted State
  const [isMuted, setIsMuted] = useState<boolean>(sound.getIsMuted());

  // Live 3D Satellite HUD visibility (Clean: closed by default so real satellite map is 100% visible)
  const [showSatelliteHUD, setShowSatelliteHUD] = useState<boolean>(false);

  // Active Scan Area (Initial default scan generated for Uşak)
  const [scanArea, setScanArea] = useState<ScanArea>(() => 
    generateAnomalyScan(
      { lat: 38.477309, lng: 29.728954 },
      'Uşak Jeofizik ve Zemin Araştırma Sahası',
      REMOTE_SENSING_SATELLITES[0].id,
      {
        scanMode: 'SAR_VELD',
        scanResolution: 'HD',
        isocontoursEnabled: true,
      }
    )
  );

  const [selectedHotspot, setSelectedHotspot] = useState<AnomalyHotspot | null>(null);

  // Modals state
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState<boolean>(false);
  const [isSatelliteModalOpen, setIsSatelliteModalOpen] = useState<boolean>(false);
  const [isLayersModalOpen, setIsLayersModalOpen] = useState<boolean>(false);
  const [isLiveSupportOpen, setIsLiveSupportOpen] = useState<boolean>(false);
  const [isCommunityChatOpen, setIsCommunityChatOpen] = useState<boolean>(false);
  const [isPlayStoreModalOpen, setIsPlayStoreModalOpen] = useState<boolean>(false);
  const [isD3HeatmapOpen, setIsD3HeatmapOpen] = useState<boolean>(false);
  const [isLidarDrawerOpen, setIsLidarDrawerOpen] = useState<boolean>(true);
  const [lidarConfig, setLidarConfig] = useState<LidarSmartConfig>({
    enabled: true,
    targetPreset: 'ANCIENT_WALL',
    searchDepthMeters: 3.0,
    visualMode: 'MAP_COLOR_RELIEF',
    powerLevel: 'HIGH',
    sequentialFilterStage: 0,
    isSequentialSelectionMode: false,
    opacity: 0.94,
    showCalloutLabels: true,
  });
  const [siteNoticeVisible, setSiteNoticeVisible] = useState<boolean>(false);

  // Shopier automated payment verification banner
  const [shopierGlobalToast, setShopierGlobalToast] = useState<{
    message: string;
    addedTokens: number;
  } | null>(null);

  // Single-execution idempotency flag to prevent multiple triggers on reload / re-render
  const hasProcessedPaymentRef = useRef<boolean>(false);

  // URL State Cleaning and Idempotent Payment Listener
  useEffect(() => {
    // 1. Immediately extract and clean payment query parameters from URL (window.history.replaceState)
    const urlPaymentInfo = extractAndCleanPaymentUrlParams();

    const processPaymentVerification = async (isUrlReturn = false) => {
      // Direct URL Return Handling: If URL contains payment confirmation (status=success, payment=success, order_id, platform_order_id, etc.)
      if (isUrlReturn && (urlPaymentInfo.isSuccess || urlPaymentInfo.hasPaymentParams)) {
        // React currentUser state'inin yüklenmesini BEKLEMEDEN, doğrudan kilitlenen localStorage değerlerini al:
        const payingUserId =
          localStorage.getItem('terrascan_paying_user_id') ||
          getActiveUser()?.id ||
          userProfile?.id;

        const pendingTokensStr = localStorage.getItem('terrascan_pending_tokens');
        let pendingTokens = pendingTokensStr ? parseInt(pendingTokensStr, 10) : 0;
        if (!pendingTokens || isNaN(pendingTokens) || pendingTokens <= 0) {
          pendingTokens = urlPaymentInfo.tokens || 50;
        }

        const orderId =
          urlPaymentInfo.orderId ||
          urlPaymentInfo.paymentId ||
          `SP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        if (payingUserId) {
          if (!isOrderIdAlreadyProcessed(orderId)) {
            try {
              // E-posta kontrolünü tamamen devre dışı bırakarak doğrudan User ID üzerinden Supabase bakiyesi bas:
              const directRes = await processIndependentDirectPayment({
                payingUserId,
                pendingTokens,
                orderId,
                rawParams: urlPaymentInfo.rawParams,
              });

              if (directRes.success && directRes.tokensAdded > 0) {
                sound.playAnomalyDiscovered();
                if (directRes.updatedUser) {
                  setUserProfile(directRes.updatedUser);
                } else {
                  setUserProfile((prev) => ({
                    ...prev,
                    creditsRemaining: directRes.yeniToplamJeton,
                  }));
                }
                setShopierGlobalToast({
                  message: 'Ödemeniz başarıyla tamamlandı, jetonlarınız yüklendi',
                  addedTokens: directRes.tokensAdded,
                });
                setTimeout(() => setShopierGlobalToast(null), 8000);
                return;
              }
            } catch (directErr) {
              console.warn('[App] Direct independent payment processing note:', directErr);
            }
          } else {
            console.log(`[App] Sipariş (#${orderId}) daha önce işlenmiş.`);
            localStorage.removeItem('terrascan_paying_user_id');
            localStorage.removeItem('terrascan_pending_tokens');
          }
        }
      }

      // Background Shopier Orders API Reconciliation (for logged in session)
      if (userProfile?.id && userProfile?.email) {
        try {
          const res = await verifyShopierPayment(userProfile);
          if (res.credited && res.creditedOrders.length > 0) {
            let lastUpdatedUser = userProfile;
            let totalAddedInBatch = 0;

            for (const order of res.creditedOrders) {
              if (!isOrderIdAlreadyProcessed(order.orderId, lastUpdatedUser)) {
                lastUpdatedUser = addCreditsAndVipPoints(
                  userProfile.id,
                  order.tokens,
                  order.orderId,
                  `Shopier Sipariş (#${order.orderId}) Onaylandı: +${order.tokens} Tera Jeton Yüklendi`
                );
                totalAddedInBatch += order.tokens;
              }
            }

            if (totalAddedInBatch > 0) {
              sound.playAnomalyDiscovered();
              setUserProfile(lastUpdatedUser);
              setShopierGlobalToast({
                message: 'Ödemeniz başarıyla tamamlandı, jetonlarınız yüklendi',
                addedTokens: totalAddedInBatch,
              });
              setTimeout(() => setShopierGlobalToast(null), 8000);
            }
          }
        } catch (err) {
          console.warn('[App] Shopier verification note:', err);
        }
      }
    };

    // Process single URL return verification if parameters were present
    if (urlPaymentInfo.hasPaymentParams && !hasProcessedPaymentRef.current) {
      hasProcessedPaymentRef.current = true;
      processPaymentVerification(true);
    }

    const handleWindowFocus = () => {
      // Yalnızca kullanıcı Shopier ödemesinden yeni döndüğünde veya beklemede ödeme varsa kontrol et
      if (isShopierCheckoutAwaiting() || localStorage.getItem('terrascan_paying_user_id')) {
        processPaymentVerification(false);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [userProfile?.email, userProfile?.id]);

  // Generate Report Data memoized
  const reportData = useMemo(() => {
    if (!scanArea) return null;
    return generateReportData(scanArea, activeSatellite.name);
  }, [scanArea, activeSatellite]);

  // Trigger scan generation at coordinates
  const triggerScanAtCoordinates = useCallback((
    lat: number, 
    lng: number, 
    name?: string,
    options?: {
      scanMode?: ScanMode;
      scanResolution?: ScanResolution;
      isocontoursEnabled?: boolean;
    }
  ) => {
    // Before triggering a scan, check if the user has an active license:
    const isUserLicensed = hasActiveLicense(userProfile.licenseExpires);

    // IF the user DOES NOT have an active license, fallback to legacy credit check:
    if (!isUserLicensed && userProfile.creditsRemaining < 15) {
      sound.playScanBeep();
      setMembershipInitialTab('CREDITS');
      setIsMembershipOpen(true);
      return;
    }

    setIsScanning(true);
    sound.playRadarSwathSweep();

    const mode = options?.scanMode || currentScanMode;
    const res = options?.scanResolution || currentScanResolution;
    const iso = options?.isocontoursEnabled !== undefined ? options.isocontoursEnabled : isocontoursEnabled;

    setTimeout(() => {
      const locName = name || `${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E`;
      const newScan = generateAnomalyScan(
        { lat, lng }, 
        locName, 
        activeSatellite.id,
        {
          scanMode: mode,
          scanResolution: res,
          isocontoursEnabled: iso,
        }
      );
      
      setScanArea(newScan);
      setCoordinatesInput(`${lat.toFixed(6)} ${lng.toFixed(6)}`);
      setIsScanning(false);
      sound.playAnomalyDiscovered();

      // Deduct 15 credits (if no active license) & increment scan count with dynamic rank progression
      setUserProfile((prev) => {
        const isLicenseActive = hasActiveLicense(prev.licenseExpires);
        const nextScans = (prev.totalScansPerformed || 0) + 1;
        const autoRank = nextScans >= 50 ? 'CHIEF_ENGINEER' : nextScans >= 20 ? 'ANALYST' : nextScans >= 5 ? 'OPERATOR' : (prev.rank || 'OBSERVER');
        const { badge, title } = getRankBadgeAndTitle(autoRank, currentLang);
        const updated: UserProfile = {
          ...prev,
          creditsRemaining: isLicenseActive ? prev.creditsRemaining : Math.max(0, prev.creditsRemaining - 15),
          totalScansPerformed: nextScans,
          scansConducted: nextScans,
          rank: autoRank,
          rankBadge: badge,
          rankTitle: title,
        };
        updateUser(updated);
        return updated;
      });
    }, 600);
  }, [activeSatellite, currentLang, currentScanMode, currentScanResolution, isocontoursEnabled, userProfile.creditsRemaining, userProfile.licenseExpires]);

  // Measure point handler
  const handleMeasurePointAdded = (pt: MeasurePoint) => {
    setMeasurePoints((prev) => {
      if (prev.length >= 2) {
        return [pt];
      }
      return [...prev, pt];
    });
  };

  // Click on Map to generate anomaly (Requirement #4: "Bakılacak noktanın üstüne tıklayınca anomali bu şekilde üretilsin")
  const handleMapClick = (lat: number, lng: number) => {
    triggerScanAtCoordinates(lat, lng);
  };

  // Coordinate Input submit
  const handleCoordinatesSubmit = (inputStr: string) => {
    const trimmed = inputStr.trim();
    // Try parsing lat lng format: "38.477309 29.728954" or "38.477309, 29.728954"
    const parts = trimmed.split(/[\s,]+/);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        triggerScanAtCoordinates(lat, lng);
        return;
      }
    }

    // Check if matching preset name
    const preset = PRESET_SCAN_SITES.find((p) => 
      p.name.toLowerCase().includes(trimmed.toLowerCase()) || 
      trimmed.toLowerCase().includes(p.name.toLowerCase())
    );

    if (preset) {
      triggerScanAtCoordinates(preset.lat, preset.lng, preset.name);
      return;
    }

    // Fallback: Default jitter around current
    const baseLat = scanArea ? scanArea.center.lat : 38.477309;
    const baseLng = scanArea ? scanArea.center.lng : 29.728954;
    triggerScanAtCoordinates(baseLat + (Math.random() - 0.5) * 0.002, baseLng + (Math.random() - 0.5) * 0.002, trimmed);
  };

  // User Membership Plan Update (Requirement #3)
  const handleUpdatePlan = (newPlan: MembershipPlanTier, newCredits: number) => {
    setUserProfile((prev) => ({
      ...prev,
      plan: newPlan,
      planNameTr: newPlan === 'PRO' ? 'Geo Pro Üyelik' : newPlan === 'ENTERPRISE' ? 'Kurumsal Üyelik' : 'Ücretsiz Keşif',
      creditsRemaining: newCredits,
    }));
  };

  // Select Past Scan / Preset
  const handleSelectPastScan = (coords: string) => {
    handleCoordinatesSubmit(coords);
  };

  // Geolocation (Find My Location)
  const handleRecenter = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          triggerScanAtCoordinates(pos.coords.latitude, pos.coords.longitude, 'Mevcut GPS Konumunuz');
        },
        () => {
          // Fallback to default Uşak site
          triggerScanAtCoordinates(38.477309, 29.728954, 'Uşak Jeofizik ve Zemin Araştırma Sahası');
        }
      );
    } else {
      triggerScanAtCoordinates(38.477309, 29.728954, 'Uşak Jeofizik ve Zemin Araştırma Sahası');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-slate-950 font-sans text-slate-100 select-none">
      
      {/* 1. TOP HEADER (Veldscan Search, 2D/3D toggle, Report, Membership, Satellite) */}
      <VeldHeader
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        coordinatesInput={coordinatesInput}
        onCoordinatesSubmit={handleCoordinatesSubmit}
        onRefreshScan={() => {
          if (scanArea) {
            triggerScanAtCoordinates(scanArea.center.lat, scanArea.center.lng, scanArea.locationName);
          }
        }}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenMembership={(tab) => handleOpenMembershipModal(tab)}
        onOpenSatelliteModal={() => setIsSatelliteModalOpen(true)}
        onOpenLiveSupport={() => setIsLiveSupportOpen(true)}
        onOpenCommunityChat={() => setIsCommunityChatOpen(true)}
        onOpenApkModal={() => setIsPlayStoreModalOpen(true)}
        onOpenSaveStudy={() => setIsSaveStudyOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenGuide={() => setIsMobileGuideOpen(true)}
        onOpenAICamera={() => setIsAICameraOpen(true)}
        currentLang={currentLang}
        onSelectLang={handleSelectLang}
        userProfile={userProfile}
        activeSatellite={activeSatellite}
        showSatelliteHUD={showSatelliteHUD}
        onToggleSatelliteHUD={() => setShowSatelliteHUD(!showSatelliteHUD)}
      />

      {/* 2. MAIN MAP / ANOMALY SCANNER CANVAS AREA */}
      <div className="relative flex-1 w-full h-full overflow-hidden pt-[118px] sm:pt-[110px] md:pt-[65px]">
        
        {/* Left Floating Action Sidebar */}
        <FloatingSidebar
          onRecenter={handleRecenter}
          onOpenLayersModal={() => setIsLayersModalOpen(true)}
          onOpenSatelliteModal={() => setIsSatelliteModalOpen(true)}
          onOpenHistoryModal={() => handleOpenMembershipModal('HISTORY')}
          onOpenCredits={() => handleOpenMembershipModal('CREDITS')}
          onOpenAICamera={() => setIsAICameraOpen(true)}
          onZoomIn={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.25))}
          onZoomOut={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.25))}
          satelliteName={activeSatellite.name}
          isMeasureActive={isMeasureActive}
          onToggleMeasure={() => {
            setIsMeasureActive((prev) => {
              if (prev) {
                setMeasurePoints([]);
              }
              return !prev;
            });
          }}
          isDepthSlicerOpen={isDepthSlicerOpen}
          onToggleDepthSlicer={() => setIsDepthSlicerOpen((prev) => !prev)}
          isRadargramOpen={isRadargramOpen}
          onToggleRadargram={() => setIsRadargramOpen((prev) => !prev)}
          isD3HeatmapOpen={isLidarDrawerOpen || lidarConfig.enabled}
          onToggleD3Heatmap={() => {
            setIsLidarDrawerOpen((prev) => !prev);
            setLidarConfig((prev) => ({ ...prev, enabled: true }));
          }}
          onOpenScanSettings={() => setIsLidarDrawerOpen(true)}
          isMuted={isMuted}
          onToggleMute={() => {
            const nextMuted = sound.toggleMute();
            setIsMuted(nextMuted);
          }}
        />

        {/* Global Shopier Payment Success Notification */}
        {shopierGlobalToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/80 shadow-2xl backdrop-blur-md text-white">
              <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold">
                ✓
              </div>
              <div>
                <p className="text-xs font-black text-emerald-300 tracking-wide">
                  {shopierGlobalToast.message}
                </p>
                <p className="text-[11px] text-slate-200">
                  Hesabınıza <strong className="text-emerald-400 font-mono">+{shopierGlobalToast.addedTokens} Tera Jeton</strong> eklendi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShopierGlobalToast(null)}
                className="ml-2 text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Real-Time Satellite Laser Swath & Telemetry Scanning Overlay */}
        <ScanTelemetryOverlay
          isScanning={isScanning}
          satelliteName={activeSatellite.name}
          coordinates={coordinatesInput}
        />

        {/* GPR Subsurface Radargram Dock (B-Scan Cross Section 0-5m) */}
        <RadargramDock
          isOpen={isRadargramOpen}
          onClose={() => setIsRadargramOpen(false)}
          data={scanArea?.radargramData}
          hotspots={scanArea?.hotspots || []}
          selectedHotspot={selectedHotspot}
          onSelectHotspot={setSelectedHotspot}
        />

        {/* Field Distance & Bearing Measurement Tool Floating Card */}
        <MeasureToolOverlay
          isActive={isMeasureActive}
          points={measurePoints}
          onClear={() => setMeasurePoints([])}
          onClose={() => {
            setIsMeasureActive(false);
            setMeasurePoints([]);
          }}
        />

        {/* Subsurface Depth Slicer & GPR Filter Dock */}
        <DepthSlicerDock
          isOpen={isDepthSlicerOpen}
          filter={depthFilter}
          onChangeFilter={setDepthFilter}
          onClose={() => setIsDepthSlicerOpen(false)}
        />

        {/* Live 3D Satellite Model & Orbit Visualizer (Clean Modal on demand) */}
        {showSatelliteHUD && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl h-[420px] rounded-3xl overflow-hidden border border-cyan-500/60 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
              <SatelliteOrbitView
                satellite={activeSatellite}
                targetCoords={scanArea ? scanArea.center : { lat: 38.477309, lng: 29.728954 }}
                isScanning={isScanning}
                onClose={() => setShowSatelliteHUD(false)}
              />
              <button
                type="button"
                onClick={() => setShowSatelliteHUD(false)}
                className="absolute top-2 right-2 z-40 px-3 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold border border-slate-700"
              >
                ✕ Kapat
              </button>
            </div>
          </div>
        )}

        {/* Interactive Map Canvas (Clicking generates anomaly) */}
        <MapScannerCanvas
          scanArea={scanArea}
          viewMode={viewMode}
          activeLayer={activeLayer}
          activeSensor={activeSensor}
          showGrid={showGrid}
          zoomLevel={zoomLevel}
          onMapClick={handleMapClick}
          onSelectHotspot={setSelectedHotspot}
          selectedHotspot={selectedHotspot}
          isScanning={isScanning}
          activeSatellite={activeSatellite}
          depthFilter={depthFilter}
          isMeasureActive={isMeasureActive}
          measurePoints={measurePoints}
          onMeasurePointAdded={handleMeasurePointAdded}
          onOpenRadargram={() => setIsRadargramOpen(true)}
          onOpenD3Heatmap={() => setIsLidarDrawerOpen(true)}
          onSwitchTo3D={() => setViewMode('3D')}
          lidarConfig={lidarConfig}
          onChangeLidarConfig={setLidarConfig}
        />

        {/* Yandan Açılır LiDAR Isı Haritası & Akıllı Kontrol Çekmecesi */}
        <LidarHeatmapDrawer
          isOpen={isLidarDrawerOpen}
          onToggleOpen={() => setIsLidarDrawerOpen((prev) => !prev)}
          config={lidarConfig}
          onChangeConfig={(next) => {
            setLidarConfig(next);
            setDepthFilter({
              minDepth: 0.0,
              maxDepth: Math.max(0.5, next.searchDepthMeters + 1.0),
              label: `0.0m - ${next.searchDepthMeters.toFixed(1)}m`,
            });
          }}
          onTriggerRescan={() => {
            const baseLat = scanArea ? scanArea.center.lat : 38.477309;
            const baseLng = scanArea ? scanArea.center.lng : 29.728954;
            triggerScanAtCoordinates(baseLat, baseLng, scanArea?.locationName, {
              scanMode: 'LIDAR_BARE',
              scanResolution: 'ULTRA',
              isocontoursEnabled: true,
            });
          }}
          onRecenter={handleRecenter}
          onOpenRadargram={() => setIsRadargramOpen(true)}
          onOpenSaveStudy={() => setIsSaveStudyOpen(true)}
          onZoomIn={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.25))}
          onZoomOut={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.25))}
          currentZoom={zoomLevel}
        />

        {/* 2863 Sayılı Kanun Sit Alanı ve Koordinat Uyarı Kalkanı Rozeti */}
        {siteNoticeVisible && (
          <div className="absolute top-14 sm:top-16 inset-x-0 mx-auto max-w-xl px-3 z-30 pointer-events-auto transition-all animate-fadeIn">
            <div className="px-3 py-2 sm:py-2.5 rounded-xl bg-slate-950/90 border border-amber-500/50 shadow-[0_4px_25px_rgba(245,158,11,0.25)] backdrop-blur-md flex items-start sm:items-center justify-between gap-2.5 text-slate-200">
              <div className="flex items-start sm:items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11px] sm:text-xs leading-snug font-sans text-slate-200">
                  <strong className="text-amber-300 font-bold">Bilgi:</strong> Tescilli arkeolojik sit alanları ve kamu arazilerinde fiziki müdahale kanunen yasaktır. Platform yalnızca yüzey topografya simülasyonu üretir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSiteNoticeVisible(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                title="Kapat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Corner Scan Summary & Turkish Legal Compliance Notice Box */}
        <ScanSummaryBox
          scanArea={scanArea}
          onOpenReport={() => setIsReportOpen(true)}
          onSwitchTo3D={() => setViewMode('3D')}
          onSelectHotspot={setSelectedHotspot}
        />

        {/* Floating Bottom Control Dock (VERİ KATMANLARI, AKTİF TARAMA SENSÖRLERİ, EYLEMLER) */}
        <div className="absolute bottom-6 sm:bottom-7 inset-x-0 pointer-events-auto">
          <BottomControlDock
            activeLayer={activeLayer}
            onSelectLayer={setActiveLayer}
            activeSensor={activeSensor}
            onSelectSensor={setActiveSensor}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(!showGrid)}
            onClearScan={() => setScanArea(null as unknown as ScanArea)}
            onTriggerScanArea={() => {
              const baseLat = scanArea ? scanArea.center.lat : 38.477309;
              const baseLng = scanArea ? scanArea.center.lng : 29.728954;
              triggerScanAtCoordinates(baseLat, baseLng, scanArea?.locationName);
            }}
            onOpenScanSettings={() => setIsScanSettingsOpen(true)}
            onOpenRadargram={() => setIsRadargramOpen(true)}
            isScanning={isScanning}
          />
        </div>

        {/* Harita Ekranı En Alt Sabit Yasal Bilgilendirme Çubuğu */}
        <div className="absolute bottom-0 inset-x-0 bg-slate-950/95 border-t border-slate-800/80 px-2 sm:px-3 py-1 z-30 pointer-events-auto backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-1 sm:gap-1.5 text-center text-[9px] sm:text-[10px] text-slate-400 font-sans leading-tight">
            <span className="text-amber-400 font-bold shrink-0">⚠️ YASAL BİLGİLENDİRME:</span>
            <span className="text-slate-300 truncate sm:whitespace-normal">
              TerraScan bir uzaktan algılama ve jeofizik yüzey simülasyon platformudur. İzinsiz kazı yapmak ve tescilli sit alanlarına müdahale etmek yasalara aykırıdır. Kullanıcıların sahadaki eylemlerinden platform ve geliştirici sorumlu tutulamaz.
            </span>
          </div>
        </div>

      </div>

      {/* 3. MODALS */}
      {/* Advanced Scan Engine & Inversion Settings Modal */}
      <ScanSettingsModal
        isOpen={isScanSettingsOpen}
        onClose={() => setIsScanSettingsOpen(false)}
        currentMode={currentScanMode}
        currentResolution={currentScanResolution}
        isocontoursEnabled={isocontoursEnabled}
        onApplyScan={(opts) => {
          setCurrentScanMode(opts.scanMode);
          setCurrentScanResolution(opts.scanResolution);
          setIsocontoursEnabled(opts.isocontoursEnabled);
          const baseLat = scanArea ? scanArea.center.lat : 38.477309;
          const baseLng = scanArea ? scanArea.center.lng : 29.728954;
          triggerScanAtCoordinates(baseLat, baseLng, scanArea?.locationName, opts);
        }}
        isScanning={isScanning}
      />
      {/* Detailed Anomaly Report Modal */}
      {isReportOpen && (
        <AnomalyReportModal
          report={reportData}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {/* Membership & Profile Modal (Requirement #3) */}
      {isMembershipOpen && (
        <MembershipModal
          user={userProfile}
          initialTab={membershipInitialTab}
          onClose={() => setIsMembershipOpen(false)}
          onUpdatePlan={handleUpdatePlan}
          onSelectPastScan={handleSelectPastScan}
          onSwitchAccount={handleSwitchAccount}
          onUpdateUser={(updated) => {
            setUserProfile(updated);
            updateUser(updated);
          }}
          currentLang={currentLang}
          onSelectLang={handleSelectLang}
        />
      )}

      {/* Satellite Platform & Constellation Selector (Requirement #1) */}
      {isSatelliteModalOpen && (
        <SatelliteSelectorModal
          activeSatellite={activeSatellite}
          onSelectSatellite={(sat) => {
            setActiveSatellite(sat);
            setIsSatelliteModalOpen(false);
          }}
          onClose={() => setIsSatelliteModalOpen(false)}
        />
      )}

      {/* Spectral Layers Modal */}
      {isLayersModalOpen && (
        <LayersModal
          activeLayer={activeLayer}
          onSelectLayer={setActiveLayer}
          activeSensor={activeSensor}
          onSelectSensor={setActiveSensor}
          onClose={() => setIsLayersModalOpen(false)}
        />
      )}

      {/* Live Support Modal (Canlı Destek) */}
      {isLiveSupportOpen && (
        <LiveSupportModal
          onClose={() => setIsLiveSupportOpen(false)}
          onOpenMembership={(tab) => {
            setIsLiveSupportOpen(false);
            handleOpenMembershipModal(tab);
          }}
          userProfile={userProfile}
        />
      )}

      {/* Saha Topluluğu & Canlı Sohbet Modalı */}
      {isCommunityChatOpen && (
        <CommunityChatModal
          isOpen={isCommunityChatOpen}
          onClose={() => setIsCommunityChatOpen(false)}
          userProfile={userProfile}
        />
      )}

      {/* Google Play Store & APK Modal */}
      {isPlayStoreModalOpen && (
        <PlayStoreModal
          isOpen={isPlayStoreModalOpen}
          onClose={() => setIsPlayStoreModalOpen(false)}
        />
      )}

      {/* Saha Çalışması Kaydetme Modalı */}
      <SaveStudyModal
        isOpen={isSaveStudyOpen}
        onClose={() => setIsSaveStudyOpen(false)}
        scanArea={scanArea}
        activeSatellite={activeSatellite}
        userProfile={userProfile}
        currentLang={currentLang}
        onSaveSuccess={(savedStudy) => {
          setUserProfile((prev) => {
            const updatedList = [savedStudy, ...(prev.savedStudies || [])];
            const updatedUser: UserProfile = {
              ...prev,
              savedStudies: updatedList,
              savedLocationsCount: updatedList.length,
            };
            updateUser(updatedUser);
            return updatedUser;
          });
        }}
      />

      {/* Üyelik ve Giriş Modalı (Girişte zorunlu) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          // Giriş yapılmışsa kapatabilir
          if (getActiveUser()) {
            setIsAuthOpen(false);
          }
        }}
        onAuthSuccess={handleAuthSuccess}
        onSuccess={handleAuthSuccess}
        currentLang={currentLang}
        onSelectLang={handleSelectLang}
        onOpenSupport={() => {
          setIsAuthOpen(false);
          setIsLiveSupportOpen(true);
        }}
      />

      {/* Mobil Kullanım Rehberi Modalı */}
      <MobileGuideModal
        isOpen={isMobileGuideOpen}
        onClose={() => setIsMobileGuideOpen(false)}
        onOpenAuth={() => {
          setIsMobileGuideOpen(false);
          setIsAuthOpen(true);
        }}
        onOpenMembership={(tab) => {
          setIsMobileGuideOpen(false);
          handleOpenMembershipModal(tab);
        }}
        onOpenReport={() => {
          setIsMobileGuideOpen(false);
          setIsReportOpen(true);
        }}
      />

      {/* TerraScan AI Saha & Zemin Kamerası Modalı */}
      <AICameraModal
        isOpen={isAICameraOpen}
        onClose={() => setIsAICameraOpen(false)}
        currentCoords={scanArea ? scanArea.center : { lat: 38.477309, lng: 29.728954 }}
        onApplyCoordinates={(coordsStr) => handleCoordinatesSubmit(coordsStr)}
        onAddAnomalyMarker={(marker) => {
          if (scanArea) {
            const newHotspot: AnomalyHotspot = {
              id: Date.now(),
              label: marker.label,
              relativeX: 0.5,
              relativeY: 0.5,
              sizeMeters: '3×2 m',
              intensity: 88,
              depthMeters: 2.2,
              anomalyType: 'STRUCTURE',
              anomalyTypeTr: 'Yapı / Boşluk',
              score: 9,
              colorHex: '#06b6d4',
              dimX: 3.0,
              dimY: 2.0,
              dimZ: 1.8,
              magneticDeltaNt: 54.2,
              resistivityOhmM: 1450,
            };
            setScanArea((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                hotspots: [newHotspot, ...(prev.hotspots || [])],
              };
            });
          }
        }}
      />

      {/* D3 Anomaly Density Heatmap Overlay Modal */}
      <D3HeatmapModal
        isOpen={isD3HeatmapOpen}
        onClose={() => setIsD3HeatmapOpen(false)}
        scanArea={scanArea}
        selectedHotspot={selectedHotspot}
        onSelectHotspot={setSelectedHotspot}
        depthFilter={depthFilter}
      />

    </div>
  );
}
