import React, { useState, useEffect } from 'react';
import { 
  ScanArea, 
  AnomalyHotspot 
} from '../types';
import { 
  ShieldAlert, 
  Compass, 
  Layers, 
  ExternalLink, 
  X, 
  Activity, 
  Scale, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Box,
  CheckCircle2
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

interface ScanSummaryBoxProps {
  scanArea: ScanArea | null;
  onOpenReport: () => void;
  onSwitchTo3D: () => void;
  onSelectHotspot?: (hotspot: AnomalyHotspot) => void;
}

export const ScanSummaryBox: React.FC<ScanSummaryBoxProps> = ({
  scanArea,
  onOpenReport,
  onSwitchTo3D,
  onSelectHotspot,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showFullLegalText, setShowFullLegalText] = useState<boolean>(false);

  // When a new scanArea arrives or updates, show the summary box
  useEffect(() => {
    if (scanArea) {
      setIsVisible(true);
      setIsMinimized(false);
    }
  }, [scanArea?.id, scanArea?.center.lat, scanArea?.center.lng]);

  if (!scanArea || !isVisible) {
    if (scanArea && !isVisible) {
      // Minimized floating launcher button in the corner
      return (
        <div className="absolute bottom-16 right-3 sm:right-4 z-40 pointer-events-auto">
          <button
            onClick={() => {
              sound.playScanBeep();
              setIsVisible(true);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/95 border border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-cyan-300 hover:text-white hover:bg-slate-850 hover:border-cyan-400 transition-all text-xs font-semibold backdrop-blur-md group"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span>Tarama Özeti: {scanArea.hotspots.length > 0 ? `${scanArea.hotspots.length} Anomali` : 'Temiz Zemin'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono flex items-center gap-1 border border-amber-500/30">
              <Scale className="w-2.5 h-2.5" /> 2863 S.K.
            </span>
          </button>
        </div>
      );
    }
    return null;
  }

  // Calculate dynamic summary message based on detected hotspots
  const hasHotspots = Array.isArray(scanArea.hotspots) && scanArea.hotspots.length > 0;
  const maxIntensitySpot = hasHotspots
    ? scanArea.hotspots.reduce((prev, current) => (current.intensity > prev.intensity ? current : prev), scanArea.hotspots[0])
    : null;

  let summaryTitle = 'Homojen Doğal Zemin (Anomali Saptanmadı)';
  let summarySubdesc = 'Yüzey altı katmanlarında yapay boşluk, oda veya manyetik alterasyon saptanmamıştır. Zemin doğal anakaya yapısını korumaktadır.';

  if (hasHotspots && maxIntensitySpot) {
    if (maxIntensitySpot.anomalyType === 'METAL') {
      summaryTitle = 'Bölgede Yüksek Manyetik Yoğunluk Tespit Edildi';
      summarySubdesc = 'Yüzey altı katmanlarında yüksek ferromanyetik/mineral yansıması ve kutupsal sapma algılandı.';
    } else if (maxIntensitySpot.anomalyType === 'CAVITY') {
      summaryTitle = 'Bölgede Yeraltı Boşluğu / Yapısal Anomali Tespit Edildi';
      summarySubdesc = 'Radar dalga geri saçılımında düşük dielektrik ve hacimsel yeraltı boşluk imzası belirlendi.';
    } else if (maxIntensitySpot.anomalyType === 'STRUCTURE') {
      summaryTitle = 'Bölgede Yeraltı Taş Formasyonu / Duvar Temeli Tespit Edildi';
      summarySubdesc = 'Düzgün hatlı kalıntı sınırları ve yüksek yoğunluklu zemin anomalisi kaydedildi.';
    } else {
      summaryTitle = 'Bölgede Jeolojik & Mineral Anomali Yoğunluğu Tespit Edildi';
      summarySubdesc = 'Çok bantlı spektral yansımada alterasyon zonu ve yoğun iletkenlik farkı gözlemlendi.';
    }
  }

  // Min and max depths
  const depths = (scanArea.hotspots || []).map(h => h.depthMeters);
  const minDepth = depths.length ? Math.min(...depths).toFixed(1) : '0.0';
  const maxDepth = depths.length ? Math.max(...depths).toFixed(1) : '5.0';

  return (
    <aside 
      aria-label="Tarama Sonuç Özeti ve Yasal Uyarı"
      className="absolute bottom-16 right-3 sm:right-4 z-40 w-[calc(100vw-24px)] max-w-sm pointer-events-auto transition-all duration-200 animate-fadeIn"
    >
      <div className="bg-slate-950/95 border border-cyan-500/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_25px_rgba(6,182,212,0.25)] backdrop-blur-md overflow-hidden text-slate-200 text-xs font-sans">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${hasHotspots ? 'bg-cyan-400' : 'bg-emerald-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${hasHotspots ? 'bg-cyan-400' : 'bg-emerald-500'}`}></span>
            </span>
            <span className="font-bold text-cyan-400 tracking-wider text-[11px] uppercase font-mono">
              TARAMA SONUÇ ÖZETİ
            </span>
            <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${
              hasHotspots 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              {hasHotspots ? `Puan: ${scanArea.overallScore}/10` : 'Temiz Zemin (1/10)'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isMinimized ? 'Genişlet' : 'Küçült'}
            >
              {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                sound.playScanBeep();
                setIsVisible(false);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isMinimized ? (
          <div className="p-3.5 space-y-3">
            
            {/* Primary Anomaly Headline */}
            <div className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
              hasHotspots 
                ? 'bg-slate-900/80 border-slate-800' 
                : 'bg-emerald-950/30 border-emerald-500/30'
            }`}>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                hasHotspots 
                  ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' 
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              }`}>
                {hasHotspots ? <Activity className="w-4 h-4 animate-pulse" /> : <CheckCircle2 className="w-4 h-4" />}
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-slate-100 text-[13px] leading-snug">
                  {summaryTitle}
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {summarySubdesc}
                </p>
              </div>
            </div>

            {/* Quick Metrics Chips */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">Sıcak Noktalar</div>
                <div className={`text-sm font-bold font-mono mt-0.5 ${hasHotspots ? 'text-cyan-400' : 'text-emerald-400'}`}>
                  {scanArea.hotspots.length} Adet
                </div>
                <div className="text-[9px] text-slate-500">
                  {hasHotspots ? 'Hedef Odak' : 'Doğal Zemin'}
                </div>
              </div>

              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">Zemin Kotu</div>
                <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                  {hasHotspots ? `${minDepth} - ${maxDepth} m` : '0 - 5.0 m'}
                </div>
                <div className="text-[9px] text-slate-500">
                  {hasHotspots ? 'Yüzey Altı' : 'Homojen Anakaya'}
                </div>
              </div>

              <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400">Konum</div>
                <div className="text-[11px] font-bold font-mono text-slate-200 truncate mt-0.5" title={scanArea.locationName}>
                  {scanArea.center.lat.toFixed(4)}, {scanArea.center.lng.toFixed(4)}
                </div>
                <div className="text-[9px] text-slate-500 truncate">
                  {scanArea.locationName.split(' ')[0]}
                </div>
              </div>
            </div>

            {/* MANDATORY TURKISH LEGISLATION WARNING & DISCLAIMER (2863 Sayılı Kanun) */}
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-amber-950/30 border border-rose-500/50 text-slate-300 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-rose-300">
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>TÜRKİYE MEVZUATI YASAL UYARI (2863 S.K.)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullLegalText(!showFullLegalText)}
                  className="text-[10px] text-rose-400 hover:text-rose-200 underline flex items-center gap-0.5 font-medium"
                >
                  {showFullLegalText ? 'Gizle' : 'Kanun Maddesi'}
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-snug">
                <strong className="text-rose-200 font-semibold">İzinsiz Araştırma ve Kazı Yapmak Kesinlikle Yasaktır:</strong> 
                {' '}Bu platform yalnızca akademik, jeolojik, tarımsal ve zemin mekaniği uzaktan algılama simülasyonudur.
              </p>

              {showFullLegalText && (
                <div className="p-2 rounded-lg bg-slate-950/90 border border-rose-900/60 text-[10px] leading-relaxed text-slate-300 space-y-1 font-sans">
                  <p>
                    <strong className="text-amber-300">2863 sayılı Kültür ve Tabiat Varlıklarını Koruma Kanunu Madde 74:</strong> 
                    {' '}"Kültür varlıklarını bulmak amacıyla, izinsiz olarak kazı veya sondaj yapan kişi, <strong>2 yıldan 5 yıla kadar hapis cezasıyla</strong> cezalandırılır."
                  </p>
                  <p className="text-slate-400">
                    Kültür katmanlarında araştırma ve kazı yapma yetkisi münhasıran <strong>T.C. Kültür ve Turizm Bakanlığı</strong>'na aittir. İzinsiz fiziki müdahale veya kazı girişiminde bulunulamaz.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  sound.playScanBeep();
                  onOpenReport();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Detaylı Raporu İncele</span>
              </button>

              <button
                onClick={() => {
                  sound.playScanBeep();
                  onSwitchTo3D();
                }}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs transition-colors flex items-center gap-1.5 border border-slate-700"
                title="3B Hacimsel Katman Moduna Geç"
              >
                <Box className="w-3.5 h-3.5" />
                <span>3B Görünüm</span>
              </button>
            </div>

          </div>
        ) : (
          /* Minimized Strip */
          <div className="px-3.5 py-2 flex items-center justify-between bg-slate-900/80 text-xs">
            <span className="font-semibold text-slate-200 truncate max-w-[240px]">
              {summaryTitle}
            </span>
            <button
              onClick={() => setIsMinimized(false)}
              className="text-[11px] text-cyan-400 hover:underline font-mono"
            >
              Genişlet
            </button>
          </div>
        )}

      </div>
    </aside>
  );
};
