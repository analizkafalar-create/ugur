/**
 * TerraScan AI - Advanced Anomaly Capture & Inversion Settings Modal
 * Allows switching scan algorithms, resolution, isocontour mapping, and calibration
 */

import React, { useState } from 'react';
import { ScanMode, ScanResolution } from '../types';
import { sound } from '../utils/anomalyEngine';
import { 
  Radio, 
  Layers, 
  Cpu, 
  Sparkles, 
  Check, 
  X, 
  Sliders, 
  Activity, 
  Compass, 
  Mountain, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';

interface ScanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: ScanMode;
  currentResolution: ScanResolution;
  isocontoursEnabled: boolean;
  onApplyScan: (options: {
    scanMode: ScanMode;
    scanResolution: ScanResolution;
    isocontoursEnabled: boolean;
    sensitivity: number;
  }) => void;
  isScanning: boolean;
}

export const ScanSettingsModal: React.FC<ScanSettingsModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  currentResolution,
  isocontoursEnabled,
  onApplyScan,
  isScanning,
}) => {
  const [mode, setMode] = useState<ScanMode>(currentMode || 'SAR_VELD');
  const [resolution, setResolution] = useState<ScanResolution>(currentResolution || 'HD');
  const [isocontours, setIsocontours] = useState<boolean>(isocontoursEnabled ?? true);
  const [sensitivity, setSensitivity] = useState<number>(85);

  if (!isOpen) return null;

  const modeOptions: Array<{
    id: ScanMode;
    title: string;
    badge: string;
    desc: string;
    depth: string;
    icon: any;
    color: string;
  }> = [
    {
      id: 'SAR_VELD',
      title: 'Veldscan Termal & SAR Radar',
      badge: 'Varsayılan',
      desc: 'Çok bantlı radar geri saçılımı ve termal koridor haritalama. Yeraltı tonozlu odalar ve dehlizler için en yüksek kontrast.',
      depth: '0.0 - 5.0m',
      icon: Activity,
      color: 'from-orange-500/20 to-amber-500/10 border-orange-500/40 text-orange-400',
    },
    {
      id: 'GPR_PULSE',
      title: '500 MHz Yer Radarı (GPR)',
      badge: 'Yüksek Frekans',
      desc: 'Yüksek frekanslı elektromanyetik darbe ve dielektrik yansıma hiperbolleri. Taş duvar tavanları ve boşluk sınırları.',
      depth: '0.2 - 4.5m',
      icon: Radio,
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-400',
    },
    {
      id: 'MAGNETIC_GRADIENT',
      title: 'Manyetik Çift Kutupluluk (Dipol)',
      badge: 'Ferromanyetik',
      desc: 'Pozitif (Kuzey +) ve Negatif (Güney -) dipol kutupluluğu tespiti. Metalik kütleler ve yanmış kil fırın/ocak kalıntıları.',
      depth: '0.0 - 4.8m',
      icon: Compass,
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/40 text-purple-400',
    },
    {
      id: 'LIDAR_BARE',
      title: 'LiDAR Çıplak Zemin (Bare-Earth)',
      badge: 'Mikro-Rölyef',
      desc: 'Bitki örtüsünü soyarak zemin mikro-morfolojisini açığa çıkarır. Jeolojik kırıklar, fay hatları, hendek ve zemin anomalileri.',
      depth: 'Yüzey & 0-1.5m',
      icon: Mountain,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-400',
    },
    {
      id: 'RESISTIVITY_ERT',
      title: 'Elektriksel Özdirenç Tomografisi (ERT)',
      badge: 'Tomografi',
      desc: 'Yüksek dirençli hava boşlukları (1500+ Ω·m) ile düşük dirençli iletken mineral/nemli kil damarlarını ayrıştırır.',
      depth: '0.5 - 5.0m',
      icon: Zap,
      color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/40 text-amber-400',
    },
  ];

  const handleApply = () => {
    sound.playRadarSwathSweep();
    onApplyScan({
      scanMode: mode,
      scanResolution: resolution,
      isocontoursEnabled: isocontours,
      sensitivity,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-950 border border-cyan-500/50 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border-t-2 border-t-cyan-400">
        
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Anomali Çekim & Sensör Motoru</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-[10px]">
                  İnversiyon v4.2
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Hedef sahaya uygulanacak jeofizik algılama modelini ve çekim çözünürlüğünü yapılandırın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 no-scrollbar">
          
          {/* Section 1: Scan Mode Selector */}
          <div>
            <label className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase block mb-2">
              1. Jeofizik Algılama / Çekim Modu
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {modeOptions.map((opt) => {
                const isSelected = mode === opt.id;
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      sound.playScanBeep();
                      setMode(opt.id);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <IconComponent className="w-4 h-4 text-cyan-400" />
                          <span className="font-bold text-xs text-white">{opt.title}</span>
                        </div>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                        {opt.desc}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800">
                      <span>Penetrasyon: <strong className="text-cyan-300">{opt.depth}</strong></span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">{opt.badge}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Resolution Selection */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
                2. Çekim Izgara Çözünürlüğü
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {resolution === 'ULTRA' ? 'Santimetrik Detay (0.2m)' : resolution === 'HD' ? 'Yüksek Çözünürlük (0.5m)' : 'Standart (1.0m)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'STANDARD', label: 'Standart (1.0m)', sub: 'Hızlı Genel Bakış' },
                { id: 'HD', label: 'HD Jeofizik (0.5m)', sub: 'Önerilen Standart' },
                { id: 'ULTRA', label: 'Ultra Spektral (0.2m)', sub: 'Milimetrik İnceleme' },
              ].map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => {
                    sound.playScanBeep();
                    setResolution(res.id as ScanResolution);
                  }}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    resolution === res.id
                      ? 'bg-cyan-500/15 border-cyan-400 text-white font-bold shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-semibold">{res.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{res.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Isocontours & Sensitivity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Isocontour Toggle */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-white">Eş-Yoğunluk İzokonturları</span>
                  <input
                    type="checkbox"
                    checked={isocontours}
                    onChange={(e) => setIsocontours(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer accent-cyan-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Isı haritasının üzerine profesyonel jeofizik kontur halkaları (20nT, 40nT, 60nT) çizer.
                </p>
              </div>
              <div className="mt-2 text-[10px] font-mono text-cyan-300">
                Durum: {isocontours ? 'Açık (İzogips Modu)' : 'Kapalı (Yumuşak Isı)'}
              </div>
            </div>

            {/* Sensitivity Slider */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-white">Çekim Hassasiyet Filtresi</span>
                  <span className="text-xs font-mono font-bold text-amber-400">%{sensitivity}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-400 flex justify-between">
                <span>Düşük Gürültü</span>
                <span>Maksimum Sinyal</span>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            İptal
          </button>
          
          <button
            type="button"
            onClick={handleApply}
            disabled={isScanning}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-500 hover:from-cyan-400 hover:to-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 disabled:opacity-50 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Bu Ayarlarla Canlı Çekim Yap</span>
          </button>
        </div>

      </div>
    </div>
  );
};
