/**
 * TerraScan AI - Bottom Control Dock & Integrated Scan Summary HUD
 * Mobile-first, compact (gap-1, p-1.5 to p-2), safe-area aware.
 * Integrates the Scan Summary HUD directly onto the top of the dock.
 */

import React from 'react';
import { DataLayerType, ActiveSensorType, ScanArea } from '../types';
import { 
  Grid, 
  Scan, 
  Layers, 
  Activity, 
  Cpu, 
  FileText, 
  Scale, 
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

interface BottomControlDockProps {
  activeLayer: DataLayerType;
  onSelectLayer: (layer: DataLayerType) => void;
  activeSensor: ActiveSensorType;
  onSelectSensor: (sensor: ActiveSensorType) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onClearScan: () => void;
  onTriggerScanArea: () => void;
  onOpenScanSettings?: () => void;
  onOpenRadargram?: () => void;
  isScanning: boolean;
  // Integrated Bottom Sheet & Scan Summary props
  onOpenBottomSheet: () => void;
  scanArea: ScanArea | null;
  onOpenReport?: () => void;
  onSwitchTo3D?: () => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  activeLayer,
  showGrid,
  onToggleGrid,
  onTriggerScanArea,
  onOpenScanSettings,
  onOpenRadargram,
  isScanning,
  onOpenBottomSheet,
  scanArea,
  onOpenReport,
  onSwitchTo3D,
}) => {
  const hotspotCount = scanArea?.hotspots?.length || 0;
  const hasHotspots = hotspotCount > 0;

  return (
    <div className="relative z-30 w-full max-w-xl mx-auto px-2 pb-1 sm:pb-2.5 pointer-events-auto">
      <div className="bg-slate-950/95 border border-cyan-500/30 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col font-sans overflow-hidden">
        
        {/* ========================================================================= */}
        {/* 1. INTEGRATED SCAN SUMMARY HUD (Directly atop the bottom dock)           */}
        {/* ========================================================================= */}
        {scanArea && (
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-gradient-to-r from-slate-900/90 via-slate-950 to-slate-900/90 border-b border-slate-800/90 text-xs">
            {/* Left: Anomaly Status & Depth */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  hasHotspots ? 'bg-rose-400' : 'bg-emerald-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  hasHotspots ? 'bg-rose-500' : 'bg-emerald-500'
                }`}></span>
              </span>

              <div className="flex items-center gap-1 truncate text-[11px] sm:text-xs">
                <span className="font-bold text-white truncate">
                  {hasHotspots ? `${hotspotCount} Anomali` : 'Doğal Zemin'}
                </span>
                <span className="text-slate-400 font-mono text-[10px] hidden xs:inline">
                  • {scanArea.estimatedDepthMin}m-{scanArea.estimatedDepthMax}m
                </span>
              </div>
            </div>

            {/* Right: Actions (Report & Legal Badge) */}
            <div className="flex items-center gap-1 shrink-0">
              {onSwitchTo3D && hasHotspots && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playScanBeep();
                    onSwitchTo3D();
                  }}
                  className="px-1.5 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold transition-all"
                  title="3B Hacimsel Görünüm"
                >
                  3B
                </button>
              )}

              {onOpenReport && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playScanBeep();
                    onOpenReport();
                  }}
                  className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-purple-900/80 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-400/40 text-[10px] font-bold transition-all"
                  title="Jeofizik Raporunu Aç"
                >
                  <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>Rapor</span>
                </button>
              )}

              <span 
                className="hidden sm:flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono border border-amber-500/20"
                title="2863 Sayılı Kültür ve Tabiat Varlıklarını Koruma Kanunu Uyarınca Bilgilendirme"
              >
                <Scale className="w-2.5 h-2.5" />
                <span>2863 S.K.</span>
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. MAIN BOTTOM CONTROL BAR (Compact: gap-1, p-1.5 to p-2)                */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between gap-1 p-1.5 sm:p-2 text-xs">
          
          {/* Left: KATMAN & SENSÖR Drawer Trigger */}
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onOpenBottomSheet();
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-bold text-[11px] sm:text-xs transition-all shadow-sm active:scale-95 shrink-0"
            title="Tüm Harita, Uydu, Netlik, Dehliz & Sensör Ayarları (Bottom Sheet)"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xs:inline">Katman & Sensör</span>
            <span className="xs:hidden">Katman</span>
          </button>

          {/* Center: Compact Action Icons + Active Layer Badge */}
          <div className="flex items-center gap-1 shrink-0">
            
            {/* Active Layer Pill */}
            <span className="hidden sm:inline text-[10px] px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              {activeLayer === 'ANOMALY' ? 'Anomali' : activeLayer === 'ADVANCED' ? 'Gelişmiş' : activeLayer === 'NONE' ? 'Katmansız' : 'Metal/Min'}
            </span>

            {/* Radargram Kesiti */}
            {onOpenRadargram && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenRadargram();
                }}
                className="p-1.5 sm:px-2 sm:py-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 text-[11px] font-mono flex items-center gap-1 transition-all"
                title="GPR Radargram Kesiti"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">Kesit</span>
              </button>
            )}

            {/* Çekim Motoru Ayarları */}
            {onOpenScanSettings && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenScanSettings();
                }}
                className="p-1.5 sm:px-2 sm:py-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 text-amber-300 text-[11px] font-mono flex items-center gap-1 transition-all"
                title="Çekim Motoru & Hassasiyet Ayarları"
              >
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Motor</span>
              </button>
            )}

            {/* Grid Toggle */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                onToggleGrid();
              }}
              className={`p-1.5 rounded-xl border text-[11px] transition-all ${
                showGrid 
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Izgara Aç/Kapat"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Primary Scan Trigger Button */}
          <button
            type="button"
            onClick={() => {
              sound.playAnomalyDiscovered();
              onTriggerScanArea();
            }}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-black text-xs shadow-[0_0_15px_rgba(79,70,229,0.5)] active:scale-95 disabled:opacity-50 shrink-0 transition-transform"
            title="Uydu Derinlik Taraması Başlat"
          >
            <Scan className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Taranıyor...' : 'TARA'}</span>
          </button>

        </div>

      </div>
    </div>
  );
};
