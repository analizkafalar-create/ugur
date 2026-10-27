/**
 * TerraScan AI - Yandan Açılır LiDAR Isı Haritası & Akıllı Kontrol Çekmecesi
 * Matches the user's reference specification:
 * 1. Ne Arıyorsunuz? (Hedef Türü - 1 Tıkla Akıllı Ayar)
 * 2. Arama Derinliği (Metre)
 * 3. Haritada Nasıl Görmek İstersiniz? (Map Color Relief 26-Bant, Video Termal, Hibrit Mod, Röntgen Gri)
 * 4. Hassasiyet & Güç Seviyesi (Standart, Yüksek, Maksimum)
 * 5. Bölgesel 6'lı Sıralı Filtreleme (Sağ Tık İle Seç / Tek Tıkla Uygula)
 */

import React from 'react';
import {
  Sparkles,
  X,
  Target,
  Crown,
  Landmark,
  Flame,
  Zap,
  Sliders,
  Eye,
  Compass,
  Mountain,
  Check,
  Lightbulb,
  Layers,
  Scan,
  MapPin,
  Activity,
  Bookmark,
  Radio,
  ChevronLeft,
  ChevronRight,
  Crosshair,
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

export type LidarTargetPreset =
  | 'GOLD_COIN_METAL'
  | 'TOMB_SARCOPHAGUS'
  | 'ANCIENT_WALL'
  | 'CAVITY_TUNNEL'
  | 'GENERAL_TERRAIN';

export type LidarVisualMode =
  | 'MAP_COLOR_RELIEF' // 26-Bant Detaylı Isı (Surfer Pro / LiDAR Red-Yellow-Cyan-Blue)
  | 'VIDEO_THERMAL'    // Önceki Sarı-Mor Termal
  | 'HYBRID_MODE'      // İkisi bir arada (Uydu + LiDAR Rölyef)
  | 'XRAY_GRAY';       // Röntgen (Gri) Mat mikrokabartma

export type LidarPowerLevel = 'STANDARD' | 'HIGH' | 'MAXIMUM';

export interface LidarSmartConfig {
  enabled: boolean;
  targetPreset: LidarTargetPreset;
  searchDepthMeters: number;
  visualMode: LidarVisualMode;
  powerLevel: LidarPowerLevel;
  sequentialFilterStage: number; // 0 = All fused, 1..6 = specific stage
  isSequentialSelectionMode: boolean;
  opacity: number;
  showCalloutLabels: boolean;
}

interface LidarHeatmapDrawerProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  config: LidarSmartConfig;
  onChangeConfig: (next: LidarSmartConfig) => void;
  onTriggerRescan?: () => void;
  onRecenter?: () => void;
  onOpenRadargram?: () => void;
  onOpenSaveStudy?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  currentZoom?: number;
}

export const SEQUENTIAL_6_FILTERS = [
  { id: 1, name: '1. Ham LiDAR DEM', desc: 'Yüzey yükseklik modeli' },
  { id: 2, name: '2. Bitki & Ot Soyma', desc: 'Çıplak zemin (Bare-Earth)' },
  { id: 3, name: '3. Laplacian Kubbe', desc: 'Tümülüs & lahit izolasyonu' },
  { id: 4, name: '4. Sobel Duvar Hatları', desc: 'Antik temel & hendek konturu' },
  { id: 5, name: '5. VDI Metal Difüzyon', desc: 'Oksitlenme & iletkenlik halosu' },
  { id: 6, name: '6. Surfer Pro 26-Bant', desc: 'Tam spektrum mikro-rölyef ısı' },
];

export const LidarHeatmapDrawer: React.FC<LidarHeatmapDrawerProps> = ({
  isOpen,
  onToggleOpen,
  config,
  onChangeConfig,
  onTriggerRescan,
  onRecenter,
  onOpenRadargram,
  onOpenSaveStudy,
  onZoomIn,
  onZoomOut,
  currentZoom = 19,
}) => {
  const handleSelectTarget = (preset: LidarTargetPreset) => {
    sound.playScanBeep();
    let autoDepth = config.searchDepthMeters;
    let autoVisual = config.visualMode;
    let autoPower = config.powerLevel;

    if (preset === 'GOLD_COIN_METAL') {
      autoDepth = 0.8;
      autoVisual = 'MAP_COLOR_RELIEF';
      autoPower = 'MAXIMUM';
    } else if (preset === 'TOMB_SARCOPHAGUS') {
      autoDepth = 2.5;
      autoVisual = 'MAP_COLOR_RELIEF';
      autoPower = 'HIGH';
    } else if (preset === 'ANCIENT_WALL') {
      autoDepth = 3.0;
      autoVisual = 'MAP_COLOR_RELIEF';
      autoPower = 'HIGH';
    } else if (preset === 'CAVITY_TUNNEL') {
      autoDepth = 3.5;
      autoVisual = 'MAP_COLOR_RELIEF';
      autoPower = 'MAXIMUM';
    } else if (preset === 'GENERAL_TERRAIN') {
      autoDepth = 1.5;
      autoVisual = 'MAP_COLOR_RELIEF';
      autoPower = 'HIGH';
    }

    onChangeConfig({
      ...config,
      enabled: true,
      targetPreset: preset,
      searchDepthMeters: autoDepth,
      visualMode: autoVisual,
      powerLevel: autoPower,
    });
  };

  const handleDepthChange = (depth: number) => {
    onChangeConfig({
      ...config,
      enabled: true,
      searchDepthMeters: depth,
    });
  };

  const handleVisualModeChange = (mode: LidarVisualMode) => {
    sound.playScanBeep();
    onChangeConfig({
      ...config,
      enabled: true,
      visualMode: mode,
    });
  };

  const handlePowerChange = (power: LidarPowerLevel) => {
    sound.playScanBeep();
    onChangeConfig({
      ...config,
      enabled: true,
      powerLevel: power,
    });
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* SAĞ KENAR HIZLI ERİŞİM DOCK'U (Referans Görsel 1'deki Sağ Dikey Sütun)    */}
      {/* ========================================================================= */}
      <div className="fixed right-2.5 top-20 z-40 flex flex-col items-center gap-2 pointer-events-auto">
        {/* Zoom + / 19x / - Kutusu */}
        <div className="w-12 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-xl backdrop-blur-md flex flex-col items-center py-1.5 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onZoomIn?.();
            }}
            className="w-full py-1 text-slate-200 hover:text-white flex items-center justify-center text-base font-bold transition-colors"
            title="Yakınlaştır"
          >
            +
          </button>
          <div className="w-full py-1 bg-slate-950/90 text-cyan-400 font-mono font-bold text-[11px] text-center border-y border-slate-800 tabular-nums">
            {Math.round(16 + (currentZoom - 1) * 2)}x
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onZoomOut?.();
            }}
            className="w-full py-1 text-slate-200 hover:text-white flex items-center justify-center text-base font-bold transition-colors"
            title="Uzaklaştır"
          >
            −
          </button>
        </div>

        {/* Ana Dikey Kontrol Sütunu: Araçlar, Isı Haritası, Scan, Konum, Kesit, Kaydet */}
        <div className="w-14 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.75)] backdrop-blur-xl flex flex-col items-center py-2 gap-1.5">
          {/* 1. Araçlar (Yandan Açılır LiDAR Akıllı Kontrol) */}
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onToggleOpen();
            }}
            className={`w-11 py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              isOpen
                ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
            title="Araçlar & LiDAR Akıllı Kontrol Panelini Aç/Kapat"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-semibold leading-none tracking-tight">Araçlar</span>
          </button>

          {/* 2. LiDAR Isı Haritası Aktif/Pasif & Çekmece Tetikleyici */}
          <button
            type="button"
            onClick={() => {
              sound.playAnomalyDiscovered();
              if (!config.enabled) {
                onChangeConfig({ ...config, enabled: true });
                if (!isOpen) onToggleOpen();
              } else if (!isOpen) {
                onToggleOpen();
              } else {
                onChangeConfig({ ...config, enabled: !config.enabled });
              }
            }}
            className={`w-11 py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              config.enabled
                ? 'bg-gradient-to-b from-amber-500/25 to-rose-500/25 border border-amber-400/80 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
            title="LiDAR 26-Bant Isı Haritası"
          >
            <Flame className={`w-4 h-4 ${config.enabled ? 'text-amber-400' : 'text-amber-500/80'}`} />
            <span className="text-[9px] font-semibold leading-none tracking-tight whitespace-nowrap">Isı Haritası</span>
          </button>

          {/* 3. Scan (Yeniden LiDAR Taraması) */}
          <button
            type="button"
            onClick={() => {
              sound.playRadarSwathSweep();
              onChangeConfig({ ...config, enabled: true });
              onTriggerRescan?.();
            }}
            className="w-11 py-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white flex flex-col items-center justify-center gap-1 transition-all"
            title="LiDAR & Radar Taramasını Yenile"
          >
            <Scan className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-semibold leading-none">Scan</span>
          </button>

          {/* 4. Konum */}
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onRecenter?.();
            }}
            className="w-11 py-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white flex flex-col items-center justify-center gap-1 transition-all"
            title="GPS Konumuna Odaklan"
          >
            <MapPin className="w-4 h-4 text-sky-400" />
            <span className="text-[10px] font-semibold leading-none">Konum</span>
          </button>

          {/* 5. Kesit */}
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onOpenRadargram?.();
            }}
            className="w-11 py-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white flex flex-col items-center justify-center gap-1 transition-all"
            title="Yeraltı Radargram Kesiti"
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-semibold leading-none">Kesit</span>
          </button>

          {/* 6. Etiketler (Harita Üzeri LiDAR Anomali Etiketleri) */}
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onChangeConfig({ ...config, showCalloutLabels: !config.showCalloutLabels });
            }}
            className={`w-11 py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              config.showCalloutLabels
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                : 'hover:bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
            title="LiDAR Anomali Etiketlerini Göster/Gizle"
          >
            <Crosshair className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-semibold leading-none">Etiket</span>
          </button>

          {/* 7. Kaydet */}
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onOpenSaveStudy?.();
            }}
            className="w-11 py-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-white flex flex-col items-center justify-center gap-1 transition-all"
            title="Saha Çalışmasını Kaydet"
          >
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-semibold leading-none">Kaydet</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* YANDAN AÇILIR LİDAR ISI HARİTASI & AKILLI KONTROL ÇEKMECESİ               */}
      {/* ========================================================================= */}
      <div
        className={`fixed top-[68px] bottom-8 right-[72px] z-40 w-[calc(100vw-82px)] sm:w-[430px] max-w-[440px] transition-transform duration-200 ease-out pointer-events-auto ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full h-full rounded-3xl bg-[#131c27]/95 border-2 border-cyan-500/50 shadow-[0_12px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col overflow-hidden text-slate-100">
          
          {/* ÜST BAŞLIK: ARAÇLAR & AKILLI KONTROL (OTOMATİK) */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#162936] via-[#182d3b] to-[#162634] border-b border-cyan-500/30 flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5 shadow-inner">
                <Sparkles className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-[15px] font-black tracking-wide text-white uppercase">
                    ARAÇLAR & AKILLI KONTROL
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-extrabold tracking-wider uppercase">
                    OTOMATİK
                  </span>
                </div>
                <p className="text-[11px] text-slate-300/90 leading-snug mt-1">
                  Karmaşık ayarlar yerine sadece hedefinizi seçin, sistem tüm parametreleri otomatik ayarlar.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleOpen}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
              title="Paneli Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* KAYDIRILABİLİR İÇERİK GÖVDESİ */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
            
            {/* LiDAR Isı Haritası Hızlı Durum Çubuğu */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#0e1620] border border-cyan-500/30">
              <div className="flex items-center gap-2.5">
                <Flame className={`w-4 h-4 ${config.enabled ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-xs font-bold text-white">
                    LiDAR Mikro-Topografya Isı Haritası
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {config.enabled ? 'Harita üzerinde canlı 26-Bant LiDAR katmanı aktif' : 'LiDAR ısı katmanı kapalı'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onChangeConfig({ ...config, enabled: !config.enabled });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  config.enabled
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {config.enabled ? 'AÇIK' : 'KAPALI'}
              </button>
            </div>

            {/* ===================================================================== */}
            {/* 1. NE ARIYORSUNUZ? (HEDEF TÜRÜ)                                       */}
            {/* ===================================================================== */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-xs tracking-wide uppercase">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>1. NE ARIYORSUNUZ? (HEDEF TÜRÜ)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  1 Tıkla Akıllı Ayar
                </span>
              </div>

              {/* Üst Tam Genişlik Kart: Altın, Sikke & Değerli Metal */}
              <button
                type="button"
                onClick={() => handleSelectTarget('GOLD_COIN_METAL')}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all mb-2.5 flex items-start gap-3 cursor-pointer ${
                  config.targetPreset === 'GOLD_COIN_METAL'
                    ? 'bg-[#192838] border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                    : 'bg-[#18222f]/90 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs sm:text-[13px] text-amber-300">
                        Altın, Sikke & Değerli Metal
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/25 border border-amber-400/40 text-amber-300 text-[9px] font-black uppercase">
                        EN POPÜLER
                      </span>
                    </div>
                    {config.targetPreset === 'GOLD_COIN_METAL' && (
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 stroke-[2.5]" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                    Toprak ve otları soyar, metal difüzyon ve oksitlenme halolarını parlak renklendirir.
                  </p>
                </div>
              </button>

              {/* 2x2 Hedef Türü Kart Izgarası */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Kart 1: Mezar Odası & Lahit */}
                <button
                  type="button"
                  onClick={() => handleSelectTarget('TOMB_SARCOPHAGUS')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    config.targetPreset === 'TOMB_SARCOPHAGUS'
                      ? 'bg-[#192838] border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                      : 'bg-[#18222f]/90 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                        <span className="text-amber-400">⚱️</span>
                        <span>Mezar Odası & Lahit</span>
                      </span>
                      {config.targetPreset === 'TOMB_SARCOPHAGUS' && (
                        <Check className="w-4 h-4 text-cyan-400 shrink-0 stroke-[2.5]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300/90 leading-snug">
                      Tümülüs, taş sanduka ve dromos geçitlerini izole eder.
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono text-cyan-300 leading-tight">
                    • Renk: Surfer Pro • Filtre: Laplacian Kubbe / Lahit
                  </div>
                </button>

                {/* Kart 2: Antik Temel & Duvar */}
                <button
                  type="button"
                  onClick={() => handleSelectTarget('ANCIENT_WALL')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    config.targetPreset === 'ANCIENT_WALL'
                      ? 'bg-[#192838] border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                      : 'bg-[#18222f]/90 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-extrabold text-xs text-cyan-300 flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-slate-200 shrink-0" />
                        <span>Antik Temel & Duvar</span>
                      </span>
                      {config.targetPreset === 'ANCIENT_WALL' && (
                        <Check className="w-4 h-4 text-cyan-400 shrink-0 stroke-[2.5]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300/90 leading-snug">
                      Taş temel hatları, hendek ve kale duvar konturlarını belirginleştirir.
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono text-cyan-300 leading-tight">
                    • Renk: Surfer Pro • Filtre: Sobel Duvar & Hendek
                  </div>
                </button>

                {/* Kart 3: Boşluk & Tünel */}
                <button
                  type="button"
                  onClick={() => handleSelectTarget('CAVITY_TUNNEL')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    config.targetPreset === 'CAVITY_TUNNEL'
                      ? 'bg-[#192838] border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                      : 'bg-[#18222f]/90 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block shrink-0" />
                        <span>Boşluk & Tünel</span>
                      </span>
                      {config.targetPreset === 'CAVITY_TUNNEL' && (
                        <Check className="w-4 h-4 text-cyan-400 shrink-0 stroke-[2.5]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300/90 leading-snug">
                      Yeraltı hava odaları, kuyu, mahzen ve gizli tüneller.
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono text-cyan-300 leading-tight">
                    • Renk: Surfer Pro • Filtre: Ters Faz & Düşük Frekans
                  </div>
                </button>

                {/* Kart 4: Genel Arazi Keşfi */}
                <button
                  type="button"
                  onClick={() => handleSelectTarget('GENERAL_TERRAIN')}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    config.targetPreset === 'GENERAL_TERRAIN'
                      ? 'bg-[#192838] border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                      : 'bg-[#18222f]/90 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-extrabold text-xs text-cyan-300 flex items-center gap-1.5">
                        <span>🗺️</span>
                        <span>Genel Arazi Keşfi</span>
                      </span>
                      {config.targetPreset === 'GENERAL_TERRAIN' && (
                        <Check className="w-4 h-4 text-cyan-400 shrink-0 stroke-[2.5]" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300/90 leading-snug">
                      Tüm anomalileri dengeli genel spektrumda tarar.
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono text-cyan-300 leading-tight">
                    • Renk: 26-Bant LiDAR • Filtre: Dengeli Spektrum
                  </div>
                </button>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* 2. ARAMA DERİNLİĞİ (METRE)                                            */}
            {/* ===================================================================== */}
            <div className="p-3.5 rounded-2xl bg-[#18222f]/95 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-white uppercase tracking-wide">
                  <Mountain className="w-4 h-4 text-cyan-400" />
                  <span>2. ARAMA DERİNLİĞİ (METRE)</span>
                </div>
                <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-400/60 text-amber-300 font-mono font-extrabold text-xs tabular-nums">
                  -{config.searchDepthMeters.toFixed(1)} Metre
                </span>
              </div>

              {/* Sürgü (Slider) */}
              <div className="px-1">
                <input
                  type="range"
                  min="0.2"
                  max="5.0"
                  step="0.1"
                  value={config.searchDepthMeters}
                  onChange={(e) => handleDepthChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* 4 Hızlı Derinlik Seçim Butonu */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { val: 0.4, label: '0.4m (Yüzey)' },
                  { val: 0.8, label: '0.8m (Temeller)' },
                  { val: 1.5, label: '1.5m (Mezarlar)' },
                  { val: 2.5, label: '2.5m (Ana Kaya)' },
                ].map((preset) => {
                  const isActive = Math.abs(config.searchDepthMeters - preset.val) < 0.08;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        sound.playScanBeep();
                        handleDepthChange(preset.val);
                      }}
                      className={`py-1.5 px-1 rounded-xl border text-[10px] font-mono font-semibold transition-all cursor-pointer truncate ${
                        isActive
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-300/90 leading-snug pt-0.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Derinlik seçildiğinde radar frekansı ve zemin geçirgenliği arka planda otomatik dengelenir.
                </span>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* 3. HARİTADA NASIL GÖRMEK İSTERSİNİZ?                                  */}
            {/* ===================================================================== */}
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-white uppercase tracking-wide mb-2.5">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>3. HARİTADA NASIL GÖRMEK İSTERSİNİZ?</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {/* Mod 1: Map Color Relief (26-Bant Detaylı Isı) */}
                <button
                  type="button"
                  onClick={() => handleVisualModeChange('MAP_COLOR_RELIEF')}
                  className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-between gap-1.5 transition-all cursor-pointer ${
                    config.visualMode === 'MAP_COLOR_RELIEF'
                      ? 'bg-[#192838] border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                      : 'bg-[#18222f]/90 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <Radio className="w-5 h-5 text-cyan-300 mt-0.5" />
                  <div className="text-[11px] font-extrabold text-white leading-tight">
                    Map Color Relief
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight">
                    26-Bant Detaylı Isı
                  </div>
                </button>

                {/* Mod 2: Video Termal */}
                <button
                  type="button"
                  onClick={() => handleVisualModeChange('VIDEO_THERMAL')}
                  className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-between gap-1.5 transition-all cursor-pointer ${
                    config.visualMode === 'VIDEO_THERMAL'
                      ? 'bg-[#192838] border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                      : 'bg-[#18222f]/90 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <Flame className="w-5 h-5 text-orange-400 mt-0.5" />
                  <div className="text-[11px] font-extrabold text-white leading-tight">
                    Video Termal
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight">
                    Önceki Sarı-Mor
                  </div>
                </button>

                {/* Mod 3: Hibrit Mod */}
                <button
                  type="button"
                  onClick={() => handleVisualModeChange('HYBRID_MODE')}
                  className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-between gap-1.5 transition-all cursor-pointer ${
                    config.visualMode === 'HYBRID_MODE'
                      ? 'bg-[#192838] border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                      : 'bg-[#18222f]/90 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <Zap className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div className="text-[11px] font-extrabold text-white leading-tight">
                    Hibrit Mod
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight">
                    İkisi bir arada
                  </div>
                </button>

                {/* Mod 4: Röntgen (Gri) */}
                <button
                  type="button"
                  onClick={() => handleVisualModeChange('XRAY_GRAY')}
                  className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-between gap-1.5 transition-all cursor-pointer ${
                    config.visualMode === 'XRAY_GRAY'
                      ? 'bg-[#192838] border-2 border-slate-300 shadow-[0_0_15px_rgba(226,232,240,0.25)]'
                      : 'bg-[#18222f]/90 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <Layers className="w-5 h-5 text-indigo-300 mt-0.5" />
                  <div className="text-[11px] font-extrabold text-white leading-tight">
                    Röntgen (Gri)
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight">
                    Mat mikrokabartma
                  </div>
                </button>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* 4. HASSASİYET & GÜÇ SEVİYESİ                                          */}
            {/* ===================================================================== */}
            <div className="p-3.5 rounded-2xl bg-[#18222f]/95 border border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-white uppercase tracking-wide">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>4. HASSASİYET & GÜÇ SEVİYESİ</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Zemin Tipine Göre
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handlePowerChange('STANDARD')}
                  className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    config.powerLevel === 'STANDARD'
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-extrabold shadow-[0_0_15px_rgba(34,211,238,0.45)]'
                      : 'bg-slate-900/90 border-slate-700/80 text-white hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-extrabold">Standart</div>
                  <div className={`text-[10px] mt-0.5 ${config.powerLevel === 'STANDARD' ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                    Temiz arazi
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePowerChange('HIGH')}
                  className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    config.powerLevel === 'HIGH'
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-extrabold shadow-[0_0_15px_rgba(34,211,238,0.45)]'
                      : 'bg-slate-900/90 border-slate-700/80 text-white hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-extrabold">Yüksek</div>
                  <div className={`text-[10px] mt-0.5 ${config.powerLevel === 'HIGH' ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                    Önerilen mod
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePowerChange('MAXIMUM')}
                  className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    config.powerLevel === 'MAXIMUM'
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-extrabold shadow-[0_0_15px_rgba(34,211,238,0.45)]'
                      : 'bg-slate-900/90 border-slate-700/80 text-white hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-extrabold">Maksimum</div>
                  <div className={`text-[10px] mt-0.5 ${config.powerLevel === 'MAXIMUM' ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                    Zorlu mineral
                  </div>
                </button>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* 5. BÖLGESEL 6'LI SIRALI FİLTRELEME                                    */}
            {/* ===================================================================== */}
            <div className="p-3.5 rounded-2xl bg-[#162332] border border-cyan-500/40 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>BÖLGESEL 6&apos;LI SIRALI FİLTRELEME</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playScanBeep();
                    onChangeConfig({
                      ...config,
                      enabled: true,
                      isSequentialSelectionMode: !config.isSequentialSelectionMode,
                    });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-extrabold uppercase transition-all cursor-pointer border ${
                    config.isSequentialSelectionMode
                      ? 'bg-cyan-400 text-slate-950 border-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                      : 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50 hover:bg-cyan-900'
                  }`}
                >
                  {config.isSequentialSelectionMode ? 'SEÇİM AKTİF' : 'SAĞ TIK İLE SEÇ'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {SEQUENTIAL_6_FILTERS.map((f) => {
                  const isSelected = config.sequentialFilterStage === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        sound.playScanBeep();
                        onChangeConfig({
                          ...config,
                          enabled: true,
                          sequentialFilterStage: isSelected ? 0 : f.id,
                        });
                      }}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-cyan-300 truncate">{f.name}</div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5">{f.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Katman Saydamlık Ayarı */}
              <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between gap-3">
                <span className="text-[11px] font-mono text-slate-300">
                  LiDAR Katman Yoğunluğu: <strong className="text-cyan-300">%{Math.round(config.opacity * 100)}</strong>
                </span>
                <input
                  type="range"
                  min="0.25"
                  max="1.0"
                  step="0.05"
                  value={config.opacity}
                  onChange={(e) =>
                    onChangeConfig({
                      ...config,
                      enabled: true,
                      opacity: parseFloat(e.target.value),
                    })
                  }
                  className="w-28 h-1.5 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};
