/**
 * TerraScan AI - Detailed Anomaly Analysis Report Modal
 * Accessible via the "Rapor" button
 */

import React from 'react';
import { AnomalyReport } from '../types';
import { 
  X, 
  FileDown, 
  Printer, 
  ShieldCheck, 
  ShieldAlert,
  Scale,
  Activity, 
  Layers, 
  MapPin, 
  Satellite, 
  BarChart3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

interface AnomalyReportModalProps {
  report: AnomalyReport | null;
  onClose: () => void;
}

export const AnomalyReportModal: React.FC<AnomalyReportModalProps> = ({
  report,
  onClose,
}) => {
  if (!report) return null;

  const handlePrint = () => {
    sound.playScanBeep();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>UYDU ANOMALİ ANALİZ RAPORU</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  {report.scanId}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Çok Spektrumlu ve Termal Yeraltı Algılama Raporu
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playScanBeep();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
          
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span>KOORDİNAT</span>
              </div>
              <div className="font-mono font-bold text-slate-200 truncate">
                {report.coordinates}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                <Satellite className="w-3 h-3 text-indigo-400" />
                <span>UYDU PLATFORMU</span>
              </div>
              <div className="font-semibold text-slate-200 truncate">
                {report.satelliteUsed}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>GÜVEN PUANI</span>
              </div>
              <div className="font-bold text-amber-400 font-mono text-sm">
                {report.confidenceScore} / 10
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                <BarChart3 className="w-3 h-3 text-rose-400" />
                <span>SICAK NOKTA ADEDİ</span>
              </div>
              <div className="font-bold text-rose-400 font-mono text-sm">
                {report.hotspotCount} Anomali
              </div>
            </div>

          </div>

          {/* Soil & Subsurface Mineral Composition Bar */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dielektrik & Spektral Maden/Boşluk Ayrıştırması</span>
            </h3>
            
            {/* Multi-segmented Progress Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800">
              <div 
                style={{ width: `${report.soilComposition.conductiveMineralPct}%` }}
                className="bg-amber-400 h-full" 
                title="İletken Mineral / Altın / Bakır" 
              />
              <div 
                style={{ width: `${report.soilComposition.cavityVoidPct}%` }} 
                className="bg-purple-500 h-full" 
                title="Yeraltı Boşluğu / Oda" 
              />
              <div 
                style={{ width: `${report.soilComposition.ferrousMetalPct}%` }} 
                className="bg-rose-500 h-full" 
                title="Demir Oksit / Manyetik Metal" 
              />
              <div 
                style={{ width: `${report.soilComposition.stoneMasonryPct}%` }} 
                className="bg-cyan-500 h-full" 
                title="Kalker / Taş Temel Duvarı" 
              />
              <div 
                style={{ width: `${report.soilComposition.organicSoilPct}%` }} 
                className="bg-emerald-600 h-full" 
                title="Organik Üst Toprak" 
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>İletken Mineral (%{report.soilComposition.conductiveMineralPct})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Yeraltı Boşluğu/Oda (%{report.soilComposition.cavityVoidPct})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Manyetik Metal/Demir (%{report.soilComposition.ferrousMetalPct})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span>Taş Yapı / Duvar (%{report.soilComposition.stoneMasonryPct})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Toprak Matrisi (%{report.soilComposition.organicSoilPct})</span>
              </div>
            </div>
          </div>

          {/* Depth Stratigraphy Table */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-200">
              Derinlik Katmanları ve Yansıma İmzası
            </h3>
            <div className="space-y-1.5 font-mono text-[11px]">
              {report.depthProfile.map((layer, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <span className="font-bold text-cyan-400 w-24">{layer.depthRangeM}</span>
                  <span className="text-slate-300 flex-1 font-sans">{layer.dominantFeature}</span>
                  <span className="text-slate-400 text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {layer.signalReflectivityDb} dB
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Soil Dielectric & Permittivity Physical Parameters */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>Zemin Elektromanyetik İletkenlik & Dielektrik Sabiti</span>
              <span className="text-[10px] font-mono text-cyan-400">GPR Veldscan Kalibrasyonu</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Dielektrik Sabiti (εr):</span>
                <span className="text-cyan-300 font-bold text-xs">6.4 - 8.2</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Elektriksel İletkenlik:</span>
                <span className="text-amber-300 font-bold text-xs">12.5 mS/m</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Radar Dalga Hızı (v):</span>
                <span className="text-purple-300 font-bold text-xs">0.108 m/ns</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block">Sinyal Zayıflaması:</span>
                <span className="text-emerald-300 font-bold text-xs">1.8 dB/m</span>
              </div>
            </div>
          </div>

          {/* Official Verification Certificate Stamp */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white font-mono block">
                  T.C. UZAKTAN ALGILAMA & JEOFİZİKSEL VERİ SERTİFİKASI
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Sertifika No: TR-GEO-{report.scanId}-CERT · Durum: ONAYLI VE GEÇERLİ
                </span>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/40 font-bold whitespace-nowrap">
              ✓ RESMİ SİSTEM MÜHRÜ
            </div>
          </div>

          {/* Expert Field Recommendation */}
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40 text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Saha Doğrulama & İnceleme Tavsiyesi</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-200/90 font-sans">
              {report.recommendation}
            </p>
          </div>

          {/* Legal Compliance & 2863 Sayılı Kanun Uyarısı */}
          <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/50 text-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <Scale className="w-3.5 h-3.5 text-rose-400" />
              <span>T.C. Mevzuatı & 2863 Sayılı Kanun Uyarınca Yasal Bildirim</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300 font-sans">
              <strong>İzinsiz Araştırma ve Kaçak Kazı Yapmak Kesinlikle Yasaktır:</strong> 2863 sayılı Kültür ve Tabiat Varlıklarını Koruma Kanunu Madde 74 gereğince, izinsiz kazı veya sondaj yapanlar <strong>2 yıldan 5 yıla kadar hapis cezası</strong> ile cezalandırılır. Bu rapor yalnızca bilimsel, akademik ve jeofiziksel uzaktan algılama modellemesidir; hiçbir şekilde arama veya kazı izni niteliği taşımaz. Her türlü resmi kazı yalnızca T.C. Kültür ve Turizm Bakanlığı yetkisi ve izniyle yürütülebilir.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-amber-300 font-sans leading-relaxed">
              ⚠️ YASAL BİLGİLENDİRME: TerraScan bir uzaktan algılama ve jeofizik yüzey simülasyon platformudur. İzinsiz kazı yapmak ve tescilli sit alanlarına müdahale etmek yasalara aykırıdır. Kullanıcıların sahadaki eylemlerinden platform ve geliştirici sorumlu tutulamaz.
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/60">
          <span className="text-[10px] text-slate-500 font-mono">
            Rapor Tarihi: {report.scanDate}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-md flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF Rapor İndir</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
