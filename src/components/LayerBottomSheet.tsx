/**
 * TerraScan AI - Modern Bottom Sheet (Modal Drawer)
 * Replaces crowded map overlay buttons with a clean, touch-friendly bottom drawer
 */

import React from 'react';
import { DataLayerType, ActiveSensorType, MapTileStyle } from '../types';
import { 
  X, 
  Layers, 
  Map, 
  Camera, 
  Zap, 
  Sliders, 
  Sparkles, 
  Eye, 
  Grid, 
  Trash2, 
  Activity, 
  Cpu, 
  Check, 
  Globe,
  Mountain,
  Moon,
  Sun
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

export type VisualColorPalette = 'GEO_TUNNEL' | 'VELD_THERMAL' | 'MAGNETIC_DIPOLE' | 'ERT_TOMO' | 'SPECTRAL_RADAR' | 'ARKEO_TUNNEL';

interface LayerBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Map Base Tile
  mapTileStyle: MapTileStyle;
  onSelectMapTileStyle: (style: MapTileStyle) => void;
  // Heatmap Opacity
  heatmapOpacity: number;
  onChangeHeatmapOpacity: (opacity: number) => void;
  // Clarity & Tunnel Mode
  colorPalette: VisualColorPalette;
  onChangeColorPalette: (palette: VisualColorPalette) => void;
  clarityLevel: 'STANDARD' | 'SHARP' | 'ULTRA' | 'SUPER';
  onChangeClarityLevel: (clarity: 'STANDARD' | 'SHARP' | 'ULTRA' | 'SUPER') => void;
  // Snapshot
  onExportHDCapture?: () => void;
  isExportingSnapshot?: boolean;
  hasScanArea: boolean;
  // Spectral Layers
  activeLayer: DataLayerType;
  onSelectLayer: (layer: DataLayerType) => void;
  // Sensor
  activeSensor: ActiveSensorType;
  onSelectSensor: (sensor: ActiveSensorType) => void;
  // Quick Tools
  showGrid: boolean;
  onToggleGrid: () => void;
  onClearScan: () => void;
  onOpenRadargram?: () => void;
  onOpenScanSettings?: () => void;
}

export const LayerBottomSheet: React.FC<LayerBottomSheetProps> = ({
  isOpen,
  onClose,
  mapTileStyle,
  onSelectMapTileStyle,
  heatmapOpacity,
  onChangeHeatmapOpacity,
  colorPalette,
  onChangeColorPalette,
  clarityLevel,
  onChangeClarityLevel,
  onExportHDCapture,
  isExportingSnapshot,
  hasScanArea,
  activeLayer,
  onSelectLayer,
  activeSensor,
  onSelectSensor,
  showGrid,
  onToggleGrid,
  onClearScan,
  onOpenRadargram,
  onOpenScanSettings,
}) => {
  if (!isOpen) return null;

  const isTunnelMode = colorPalette === 'GEO_TUNNEL' || colorPalette === 'ARKEO_TUNNEL';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Modern Bottom Sheet Drawer Container */}
      <div className="relative w-full max-w-xl mx-auto bg-slate-950 border-t border-cyan-500/40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] flex flex-col max-h-[85dvh] overflow-hidden animate-fadeIn pb-safe">
        
        {/* Drag Handle Bar & Header */}
        <div className="pt-2.5 pb-2 px-4 border-b border-slate-800/80 flex flex-col items-center shrink-0">
          <div className="w-12 h-1 rounded-full bg-slate-700 mb-2" />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">KATMAN & SENSÖR AYARLARI</h3>
                <p className="text-[10px] text-slate-400 font-mono">Uydu Tabanı, Netlik & Jeofizik Modları</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto no-scrollbar">
          
          {/* 1. HARİTA TABANI & UYDU SEÇİMİ */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold font-mono text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Harita Tabanı (Uydu Modu)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onSelectMapTileStyle('satellite');
                }}
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  mapTileStyle === 'satellite'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🛰️ Esri HD</span>
                <span className="text-[8px] font-normal opacity-80">0.3m Uydu</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onSelectMapTileStyle('hybrid');
                }}
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  mapTileStyle === 'hybrid'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🌐 Hibrit</span>
                <span className="text-[8px] font-normal opacity-80">Uydu + Yol</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onSelectMapTileStyle('googleSat');
                }}
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  mapTileStyle === 'googleSat'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🛰️ Google</span>
                <span className="text-[8px] font-normal opacity-80">HD Sat</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onSelectMapTileStyle('opentopo');
                }}
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  mapTileStyle === 'opentopo'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>⛰️ Topo</span>
                <span className="text-[8px] font-normal opacity-80">Eşyükselti</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onSelectMapTileStyle('dark');
                }}
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  mapTileStyle === 'dark'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>🌙 Gece</span>
                <span className="text-[8px] font-normal opacity-80">Karanlık Radar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onSelectMapTileStyle('light');
                }}
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  mapTileStyle === 'light'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>☀️ Jeodezi</span>
                <span className="text-[8px] font-normal opacity-80">Net Aydınlık</span>
              </button>
            </div>
          </div>

          {/* 2. ANOMALİ GÖRÜNÜRLÜĞÜ & OPAKLIĞI */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold font-mono text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Anomali Görünürlüğü (Opaklık)</span>
              </label>
              <span className="text-xs font-mono font-bold text-slate-300">
                %{Math.round(heatmapOpacity * 100)}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onChangeHeatmapOpacity(0.0);
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                  heatmapOpacity === 0
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-slate-900 border-slate-750 text-slate-400 hover:text-white'
                }`}
              >
                %0 Sadece Uydu
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onChangeHeatmapOpacity(0.55);
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                  heatmapOpacity > 0 && heatmapOpacity <= 0.65
                    ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-sm'
                    : 'bg-slate-900 border-slate-750 text-slate-400 hover:text-white'
                }`}
              >
                %55 Dengeli
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onChangeHeatmapOpacity(0.90);
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                  heatmapOpacity > 0.65
                    ? 'bg-rose-500 text-white border-rose-300 shadow-sm'
                    : 'bg-slate-900 border-slate-750 text-slate-400 hover:text-white'
                }`}
              >
                %90 Yoğun
              </button>
            </div>
          </div>

          {/* 3. ÖZEL İŞLEMLER: DEHLİZ MODU & HD FOTO KAYDET */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold font-mono text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Gelişmiş Çekim & Dehliz Modu</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Jeofizik Dehliz Toggle */}
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onChangeColorPalette(isTunnelMode ? 'VELD_THERMAL' : 'GEO_TUNNEL');
                }}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all shadow-md ${
                  isTunnelMode
                    ? 'bg-blue-600 border-blue-300 text-white shadow-blue-500/40 ring-1 ring-blue-300'
                    : 'bg-slate-900/90 border-slate-750 text-slate-300 hover:border-blue-400 hover:text-white'
                }`}
              >
                <Zap className={`w-4 h-4 ${isTunnelMode ? 'text-cyan-300' : 'text-blue-400'}`} />
                <span>{isTunnelMode ? '⚡ DEHLİZ: AKTİF' : '⚡ DEHLİZ MODU'}</span>
              </button>

              {/* HD Snapshot Export */}
              <button
                type="button"
                onClick={() => {
                  if (onExportHDCapture) {
                    onExportHDCapture();
                    onClose();
                  }
                }}
                disabled={isExportingSnapshot || !hasScanArea}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-40"
              >
                <Camera className="w-4 h-4 text-slate-950" />
                <span>{isExportingSnapshot ? 'KAYDEDİLİYOR...' : '📸 HD KAYDET'}</span>
              </button>
            </div>
          </div>

          {/* 4. NETLİK VE KESKİNLİK SEVİYESİ */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold font-mono text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Görüntü Keskinliği</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onChangeClarityLevel('SHARP');
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                  clarityLevel === 'SHARP'
                    ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                %75 Net
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onChangeClarityLevel('ULTRA');
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                  clarityLevel === 'ULTRA'
                    ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                %100 Ultra
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onChangeClarityLevel('SUPER');
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                  clarityLevel === 'SUPER'
                    ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                %125 Süper
              </button>
            </div>
          </div>

          {/* 5. VERİ KATMANLARI */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold font-mono text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Spektral Veri Katmanları</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'ADVANCED', label: 'Gelişmiş' },
                  { id: 'NONE', label: 'Hiçbiri' },
                  { id: 'METAL_MINERAL', label: 'Metal / Min.' },
                  { id: 'ANOMALY', label: 'Anomali' },
                  { id: 'VEGETATION', label: 'Bitki Örtüsü' },
                  { id: 'MULTI', label: 'Çoklu Spektral' },
                ] as const
              ).map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => {
                    sound.playScanBeep();
                    onSelectLayer(layer.id);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all border text-center truncate ${
                    activeLayer === layer.id
                      ? 'bg-cyan-400 text-slate-950 font-bold border-cyan-300 shadow-sm'
                      : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. AKTİF TARAMA SENSÖRLERİ */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold font-mono text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Aktif Tarama Sensörleri</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onSelectSensor('OPTICAL_RELIEF');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                  activeSensor === 'OPTICAL_RELIEF'
                    ? 'bg-indigo-950/90 border-indigo-400 text-indigo-200 shadow-sm font-bold'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Optik / Rölyef
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onSelectSensor('METAL_MINERAL');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                  activeSensor === 'METAL_MINERAL'
                    ? 'bg-purple-950/90 border-purple-400 text-purple-200 shadow-sm font-bold'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Metal / Mineral
              </button>
            </div>
          </div>

          {/* 7. HIZLI ARAÇLAR & EYLEMLER */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onToggleGrid();
                }}
                className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
                  showGrid
                    ? 'bg-slate-800 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>{showGrid ? 'Izgara Açık' : 'Izgara'}</span>
              </button>

              {onOpenRadargram && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playScanBeep();
                    onOpenRadargram();
                    onClose();
                  }}
                  className="py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 flex items-center justify-center gap-1.5 text-xs font-medium transition-all"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Kesit</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onClearScan();
                  onClose();
                }}
                className="py-2 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center gap-1.5 text-xs font-medium transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Temizle</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
