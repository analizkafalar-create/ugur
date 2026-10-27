/**
 * TerraScan AI - Spectral Layers & Filtering Modal
 * Accessible via the floating layers icon on the left
 */

import React from 'react';
import { DataLayerType, ActiveSensorType } from '../types';
import { X, Layers, Sliders, Eye, Check } from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

interface LayersModalProps {
  activeLayer: DataLayerType;
  onSelectLayer: (layer: DataLayerType) => void;
  activeSensor: ActiveSensorType;
  onSelectSensor: (sensor: ActiveSensorType) => void;
  onClose: () => void;
}

export const LayersModal: React.FC<LayersModalProps> = ({
  activeLayer,
  onSelectLayer,
  activeSensor,
  onSelectSensor,
  onClose,
}) => {
  const layerOptions: { id: DataLayerType; title: string; desc: string }[] = [
    {
      id: 'ANOMALY',
      title: 'Anomali Katmanı (Varsayılan)',
      desc: 'Toprak altı dielektrik farkları, sıcak noktalar ve yeraltı koridor hatları.',
    },
    {
      id: 'METAL_MINERAL',
      title: 'Metal & Mineral Spektrumu',
      desc: 'Yüksek iletkenlikli hedefler, hematit/manyetit cevheri ve soy metal kalıntıları.',
    },
    {
      id: 'VEGETATION',
      title: 'Bitki Örtüsü Stresi (NDVI & Kırmızı Kenar)',
      desc: 'Yeraltı duvar veya boşlukları üzerindeki bitki kök nem farklılıkları.',
    },
    {
      id: 'ADVANCED',
      title: 'Gelişmiş Çok Spektrumlu Birleşim',
      desc: 'Optik, Termal TIRS ve Sentetik Açıklıklı Radar (SAR) katmanlarının üst üste bindirilmesi.',
    },
    {
      id: 'MULTI',
      title: 'Çoklu Algılama Katmanı',
      desc: 'Eşzamanlı tüm spektral anomali filtrelerinin kompozit analizi.',
    },
    {
      id: 'NONE',
      title: 'Hiçbiri (Sadece Uydu Ortofoto)',
      desc: 'Ham uydu yer görüntüsü üzerinde filtre olmaksızın zemin incelemesi.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                SPEKTRAL VERİ KATMANLARI
              </h2>
              <p className="text-[11px] text-slate-400">
                Uydu Filtreleri ve Algılama Katmanları
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

        {/* Layer Options */}
        <div className="p-5 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {layerOptions.map((opt) => {
            const isSelected = activeLayer === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => {
                  sound.playScanBeep();
                  onSelectLayer(opt.id);
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/20 shadow-md'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div>
                  <h4 className="font-bold text-xs text-white flex items-center gap-2">
                    <span>{opt.title}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-sans">
                    {opt.desc}
                  </p>
                </div>

                <div className="shrink-0 mt-0.5">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-cyan-400 bg-cyan-500 text-slate-950' : 'border-slate-700 bg-slate-800'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={() => {
              sound.playScanBeep();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Tamam
          </button>
        </div>

      </div>
    </div>
  );
};
