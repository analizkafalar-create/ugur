/**
 * TerraScan AI - Satellite Constellation & Sensor Modal
 * Fulfills Requirement #1: "Uydu olsun program içinde"
 */

import React from 'react';
import { RemoteSensingSatellite } from '../types';
import { REMOTE_SENSING_SATELLITES } from '../data/satellites';
import { 
  X, 
  Satellite as SatIcon, 
  Radio, 
  Layers, 
  Gauge, 
  Check, 
  ShieldCheck, 
  Sparkles,
  Compass
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

interface SatelliteSelectorModalProps {
  activeSatellite: RemoteSensingSatellite;
  onSelectSatellite: (satellite: RemoteSensingSatellite) => void;
  onClose: () => void;
}

export const SatelliteSelectorModal: React.FC<SatelliteSelectorModalProps> = ({
  activeSatellite,
  onSelectSatellite,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-300">
              <SatIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>UZAKTAN ALGILAMA & RADAR UYDULARI</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  {REMOTE_SENSING_SATELLITES.length} Aktif Platform
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Spektral Bantlar, Yere Nüfuz Eden SAR Radar ve Termal Sensörler
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

        {/* Satellite List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 text-xs">
          {REMOTE_SENSING_SATELLITES.map((sat) => {
            const isSelected = sat.id === activeSatellite.id;

            return (
              <div
                key={sat.id}
                onClick={() => {
                  sound.playScanBeep();
                  onSelectSatellite(sat);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Title row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: sat.color }} 
                    />
                    <h3 className="font-bold text-white text-sm tracking-wide">
                      {sat.name}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {sat.agency}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-900">
                      {sat.resolutionMeters}m Çözünürlük
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] text-cyan-300 font-bold bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/40">
                        <Check className="w-3 h-3" />
                        <span>Seçili</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Penetration Depth & Capabilities */}
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start gap-2">
                  <Gauge className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      Algılama & Yeraltı Nüfuz Kabiliyeti:
                    </div>
                    <div className="text-[11px] text-slate-200 mt-0.5 font-medium">
                      {sat.penetrationDepthDesc}
                    </div>
                  </div>
                </div>

                {/* Spectral Bands Tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-mono">Bantlar:</span>
                  {sat.spectralBands.map((band, idx) => (
                    <span
                      key={idx}
                      className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                    >
                      {band}
                    </span>
                  ))}
                </div>

              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/60">
          <div className="text-[11px] text-slate-400 font-mono">
            Aktif Uydu: <strong className="text-cyan-300">{activeSatellite.name}</strong>
          </div>
          <button
            onClick={() => {
              sound.playScanBeep();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-md"
          >
            Uygula & Kapat
          </button>
        </div>

      </div>
    </div>
  );
};
