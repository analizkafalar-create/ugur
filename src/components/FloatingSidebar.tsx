/**
 * TerraScan AI - Floating Left Action Toolbar & Mobile FAB Speed Dial
 * Mobile: Collapses into a single FAB button with an expanding horizontal/speed-dial mini menu
 * Desktop: Elegant vertical tool stack along the left edge
 */

import React, { useState } from 'react';
import { 
  Layers, 
  Crosshair, 
  Clock, 
  Plus, 
  Minus, 
  Satellite as SatIcon,
  Ruler,
  Sliders,
  Volume2,
  VolumeX,
  Activity,
  Cpu,
  Coins,
  Wrench,
  Camera,
  Flame,
  X,
  ChevronRight
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

interface FloatingSidebarProps {
  onRecenter: () => void;
  onOpenLayersModal: () => void;
  onOpenSatelliteModal: () => void;
  onOpenHistoryModal: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  satelliteName: string;
  isMeasureActive?: boolean;
  onToggleMeasure?: () => void;
  isDepthSlicerOpen?: boolean;
  onToggleDepthSlicer?: () => void;
  isRadargramOpen?: boolean;
  onToggleRadargram?: () => void;
  isD3HeatmapOpen?: boolean;
  onToggleD3Heatmap?: () => void;
  onOpenScanSettings?: () => void;
  onOpenCredits?: () => void;
  onOpenAICamera?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export const FloatingSidebar: React.FC<FloatingSidebarProps> = ({
  onRecenter,
  onOpenLayersModal,
  onOpenSatelliteModal,
  onOpenHistoryModal,
  onZoomIn,
  onZoomOut,
  satelliteName,
  isMeasureActive,
  onToggleMeasure,
  isDepthSlicerOpen,
  onToggleDepthSlicer,
  isRadargramOpen,
  onToggleRadargram,
  isD3HeatmapOpen,
  onToggleD3Heatmap,
  onOpenScanSettings,
  onOpenCredits,
  onOpenAICamera,
  isMuted,
  onToggleMute,
}) => {
  // Mobile FAB speed dial state
  const [isFabOpen, setIsFabOpen] = useState(false);

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MOBILE RESPONSIVE FAB & HORIZONTAL SPEED DIAL (< md)                  */}
      {/* ========================================================================= */}
      <div className="md:hidden absolute left-3 top-16 z-30 pointer-events-auto flex items-center">
        {!isFabOpen ? (
          /* Single Collapsed FAB Button */
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              setIsFabOpen(true);
            }}
            className="w-9 h-9 rounded-full bg-slate-950/90 hover:bg-slate-900 border border-cyan-500/60 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.35)] backdrop-blur-md active:scale-95 transition-all relative"
            title="Jeofizik Araçları Menüsü"
          >
            <Wrench className="w-4 h-4 text-cyan-400" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          </button>
        ) : (
          /* Expanded Horizontal Scrollable Speed Dial */
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950/95 border border-cyan-500/60 shadow-[0_4px_25px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-fadeIn max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar">
            
            {/* Close Toggle */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setIsFabOpen(false);
              }}
              className="w-8 h-8 rounded-xl bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center shrink-0 border border-slate-700"
              title="Araçları Kapat"
            >
              <X className="w-4 h-4" />
            </button>

            {/* GPS Recenter */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                onRecenter();
              }}
              className="w-8 h-8 rounded-xl bg-purple-900/90 text-purple-200 border border-purple-400/40 flex items-center justify-center shrink-0 active:scale-95"
              title="Konuma Hizala"
            >
              <Crosshair className="w-4 h-4" />
            </button>

            {/* AI Kamera Butonu (Mobil Speed Dial) */}
            {onOpenAICamera && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenAICamera();
                }}
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-900/90 to-cyan-900/90 text-cyan-300 border border-cyan-400/60 flex items-center justify-center shrink-0 active:scale-95 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                title="AI Saha & Zemin Kamerası"
              >
                <Camera className="w-4 h-4 text-cyan-300 animate-pulse" />
              </button>
            )}

            {/* Ruler / Mesafe Ölçer */}
            {onToggleMeasure && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onToggleMeasure();
                }}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 active:scale-95 ${
                  isMeasureActive
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold'
                    : 'bg-purple-900/90 text-purple-200 border-purple-400/40'
                }`}
                title="Mesafe Cetveli"
              >
                <Ruler className="w-4 h-4" />
              </button>
            )}

            {/* Depth Slicer */}
            {onToggleDepthSlicer && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onToggleDepthSlicer();
                }}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 active:scale-95 ${
                  isDepthSlicerOpen
                    ? 'bg-purple-600 text-white border-purple-300'
                    : 'bg-purple-900/90 text-purple-200 border-purple-400/40'
                }`}
                title="Derinlik Dilimi"
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}

            {/* Radargram */}
            {onToggleRadargram && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onToggleRadargram();
                }}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 active:scale-95 ${
                  isRadargramOpen
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                    : 'bg-purple-900/90 text-cyan-300 border-purple-400/40'
                }`}
                title="Radargram Kesiti"
              >
                <Activity className="w-4 h-4" />
              </button>
            )}

            {/* D3 Anomaly Density Heatmap */}
            {onToggleD3Heatmap && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onToggleD3Heatmap();
                }}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 active:scale-95 ${
                  isD3HeatmapOpen
                    ? 'bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 border-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                    : 'bg-purple-900/90 text-amber-300 border-purple-400/40'
                }`}
                title="D3.js Anomali Yoğunluk Isı Haritası (KDE)"
              >
                <Flame className="w-4 h-4" />
              </button>
            )}

            {/* Scan Engine Settings */}
            {onOpenScanSettings && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenScanSettings();
                }}
                className="w-8 h-8 rounded-xl bg-purple-900/90 text-amber-300 border border-purple-400/40 flex items-center justify-center shrink-0 active:scale-95"
                title="Çekim Motoru Ayarları"
              >
                <Cpu className="w-4 h-4" />
              </button>
            )}

            {/* Credits */}
            {onOpenCredits && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenCredits();
                }}
                className="w-8 h-8 rounded-xl bg-emerald-900/90 text-yellow-300 border border-emerald-400/40 flex items-center justify-center shrink-0 active:scale-95"
                title="Kredi / Jeton Yükle"
              >
                <Coins className="w-4 h-4" />
              </button>
            )}

            {/* History */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                onOpenHistoryModal();
              }}
              className="w-8 h-8 rounded-xl bg-purple-900/90 text-purple-200 border border-purple-400/40 flex items-center justify-center shrink-0 active:scale-95"
              title="Geçmiş Taramalar"
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Satellite Modal */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                onOpenSatelliteModal();
              }}
              className="w-8 h-8 rounded-xl bg-purple-900/90 text-cyan-300 border border-purple-400/40 flex items-center justify-center shrink-0 active:scale-95"
              title={satelliteName}
            >
              <SatIcon className="w-4 h-4" />
            </button>

            {/* Mute Toggle */}
            {onToggleMute && (
              <button
                type="button"
                onClick={() => {
                  onToggleMute();
                  if (isMuted) sound.playScanBeep();
                }}
                className="w-8 h-8 rounded-xl bg-purple-900/90 text-purple-200 border border-purple-400/40 flex items-center justify-center shrink-0 active:scale-95"
                title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            )}

            {/* Zoom In & Out */}
            <div className="flex items-center bg-slate-900 rounded-xl border border-slate-700 p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onZoomIn();
                }}
                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white"
                title="Yakınlaştır"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onZoomOut();
                }}
                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white"
                title="Uzaklaştır"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP VERTICAL TOOL STACK (md: and above)                           */}
      {/* ========================================================================= */}
      <div className="hidden md:flex absolute left-3 top-20 z-20 flex-col items-center gap-2 pointer-events-auto">
        {/* 1. Layers Modal */}
        <button
          onClick={() => {
            sound.playScanBeep();
            onOpenLayersModal();
          }}
          className="w-10 h-10 rounded-full bg-purple-900/80 hover:bg-purple-800 border border-purple-400/40 text-purple-200 hover:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Spektral Veri Katmanları"
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* 2. GPS Recenter */}
        <button
          onClick={() => {
            sound.playScanBeep();
            onRecenter();
          }}
          className="w-10 h-10 rounded-full bg-purple-900/80 hover:bg-purple-800 border border-purple-400/40 text-purple-200 hover:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Konumu Hizala / GPS Hedef"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        {/* 2.5 AI Saha & Zemin Kamerası */}
        {onOpenAICamera && (
          <button
            onClick={() => {
              sound.playScanBeep();
              onOpenAICamera();
            }}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-700 to-cyan-600 hover:from-teal-600 hover:to-cyan-500 border border-cyan-300 text-slate-950 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] backdrop-blur-md transition-all active:scale-95 relative group"
            title="TerraScan AI Saha & Zemin Kamerası"
          >
            <Camera className="w-5 h-5 text-slate-950 animate-pulse" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-cyan-300 text-[10px] font-mono rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 pointer-events-none z-50">
              AI Saha Kamerası
            </span>
          </button>
        )}

        {/* 3. Ruler / Cetvel */}
        {onToggleMeasure && (
          <button
            onClick={() => {
              sound.playScanBeep();
              onToggleMeasure();
            }}
            className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 relative group ${
              isMeasureActive
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                : 'bg-purple-900/80 hover:bg-purple-800 border-purple-400/40 text-purple-200 hover:text-white'
            }`}
            title="Mesafe ve Azimut Ölçer (Cetvel)"
          >
            <Ruler className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-cyan-300 text-[10px] font-mono rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 pointer-events-none">
              {isMeasureActive ? 'Ölçer Açık' : 'Mesafe Ölçer'}
            </span>
          </button>
        )}

        {/* 4. Depth Slicer */}
        {onToggleDepthSlicer && (
          <button
            onClick={() => {
              sound.playScanBeep();
              onToggleDepthSlicer();
            }}
            className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 relative group ${
              isDepthSlicerOpen
                ? 'bg-purple-600 text-white border-purple-300 font-bold shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                : 'bg-purple-900/80 hover:bg-purple-800 border-purple-400/40 text-purple-200 hover:text-white'
            }`}
            title="GPR Derinlik Dilimi (0-5m)"
          >
            <Sliders className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-purple-300 text-[10px] font-mono rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 pointer-events-none">
              Derinlik Dilimi
            </span>
          </button>
        )}

        {/* 5. Radargram */}
        {onToggleRadargram && (
          <button
            onClick={() => {
              sound.playScanBeep();
              onToggleRadargram();
            }}
            className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 relative group ${
              isRadargramOpen
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold shadow-[0_0_15px_rgba(6,182,212,0.7)]'
                : 'bg-purple-900/80 hover:bg-purple-800 border-purple-400/40 text-cyan-300 hover:text-white'
            }`}
            title="GPR Radargram Kesiti (B-Scan)"
          >
            <Activity className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-cyan-300 text-[10px] font-mono rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 pointer-events-none">
              {isRadargramOpen ? 'Kesiti Kapat' : 'Radargram Kesiti'}
            </span>
          </button>
        )}

        {/* 5.5 D3 Anomaly Density Heatmap */}
        {onToggleD3Heatmap && (
          <button
            onClick={() => {
              sound.playScanBeep();
              onToggleD3Heatmap();
            }}
            className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 relative group ${
              isD3HeatmapOpen
                ? 'bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 border-amber-300 font-bold shadow-[0_0_15px_rgba(245,158,11,0.8)]'
                : 'bg-purple-900/80 hover:bg-purple-800 border-purple-400/40 text-amber-300 hover:text-white'
            }`}
            title="D3.js Anomali Yoğunluk Isı Haritası (KDE & İzo-intensite)"
          >
            <Flame className="w-5 h-5 animate-pulse" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-amber-300 text-[10px] font-mono rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 pointer-events-none z-50">
              {isD3HeatmapOpen ? 'D3 Isı Haritası (Açık)' : 'D3 Yoğunluk Isı Haritası'}
            </span>
          </button>
        )}

        {/* 6. Scan Engine Settings */}
        {onOpenScanSettings && (
          <button
            onClick={() => {
              sound.playScanBeep();
              onOpenScanSettings();
            }}
            className="w-10 h-10 rounded-full bg-purple-900/80 hover:bg-purple-800 border border-purple-400/40 text-amber-300 hover:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 relative group"
            title="Anomali Çekim & Sensör Motoru Ayarları"
          >
            <Cpu className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-amber-300 text-[10px] font-mono rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 pointer-events-none">
              Çekim Motoru Ayarları
            </span>
          </button>
        )}

        {/* 7. Credits */}
        {onOpenCredits && (
          <button
            onClick={() => {
              sound.playScanBeep();
              onOpenCredits();
            }}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 border border-emerald-300 text-yellow-300 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)] backdrop-blur-md transition-all active:scale-95 relative group"
            title="Tera Jeton Yükle"
          >
            <Coins className="w-5 h-5 animate-pulse" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-emerald-300 text-[10px] font-mono rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 pointer-events-none">
              Kredi Yükle
            </span>
          </button>
        )}

        {/* 8. History */}
        <button
          onClick={() => {
            sound.playScanBeep();
            onOpenHistoryModal();
          }}
          className="w-10 h-10 rounded-full bg-purple-900/80 hover:bg-purple-800 border border-purple-400/40 text-purple-200 hover:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Zaman Çizelgesi & Geçmiş Taramalar"
        >
          <Clock className="w-5 h-5" />
        </button>

        {/* 9. Satellite Modal */}
        <button
          onClick={() => {
            sound.playScanBeep();
            onOpenSatelliteModal();
          }}
          className="w-10 h-10 rounded-full bg-purple-900/80 hover:bg-purple-800 border border-purple-400/40 text-purple-200 hover:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95 relative group"
          title={`Aktif Uydu: ${satelliteName}`}
        >
          <SatIcon className="w-5 h-5 text-cyan-300" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-cyan-300 text-[10px] font-mono rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700 pointer-events-none">
            {satelliteName}
          </span>
        </button>

        {/* 10. Sound Mute */}
        {onToggleMute && (
          <button
            onClick={() => {
              onToggleMute();
              if (isMuted) sound.playScanBeep();
            }}
            className="w-10 h-10 rounded-full bg-purple-900/80 hover:bg-purple-800 border border-purple-400/40 text-purple-200 hover:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all active:scale-95"
            title={isMuted ? 'Radar Sesini Aç' : 'Radar Sesini Kapat'}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-slate-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            )}
          </button>
        )}

        {/* 11. Zoom Controls */}
        <div className="flex flex-col bg-purple-950/80 border border-purple-500/30 rounded-full overflow-hidden shadow-lg backdrop-blur-md mt-1">
          <button
            onClick={() => {
              sound.playScanBeep();
              onZoomIn();
            }}
            className="w-9 h-8 flex items-center justify-center text-purple-200 hover:bg-purple-800/80 hover:text-white transition-colors"
            title="Yakınlaştır"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-full h-px bg-purple-500/20" />
          <button
            onClick={() => {
              sound.playScanBeep();
              onZoomOut();
            }}
            className="w-9 h-8 flex items-center justify-center text-purple-200 hover:bg-purple-800/80 hover:text-white transition-colors"
            title="Uzaklaştır"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};
