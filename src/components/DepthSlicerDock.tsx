/**
 * TerraScan AI - Subsurface Depth Slicer & Layer Filter
 * Simulates real GPR (Ground Penetrating Radar) depth slicing from 0 to 5.0 meters
 */

import React from 'react';
import { DepthFilter } from '../types';
import { Layers, Sliders, Eye, ChevronRight, X } from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

interface DepthSlicerDockProps {
  filter: DepthFilter;
  onChangeFilter: (newFilter: DepthFilter) => void;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_DEPTHS: { label: string; min: number; max: number; desc: string }[] = [
  { label: 'Tümü (0 - 5.0 m)', min: 0.0, max: 5.0, desc: 'Tüm yüzey altı anomalileri' },
  { label: 'Yüzeyel (0 - 1.2 m)', min: 0.0, max: 1.2, desc: 'Üst toprak & yüzeye yakın saçılımlar' },
  { label: 'Temel / Taş (1.2 - 2.6 m)', min: 1.2, max: 2.6, desc: 'Mimari duvar, taş döşeme ve temel blokajı' },
  { label: 'Yapısal Boşluk / Galeri (2.6 - 4.2 m)', min: 2.6, max: 4.2, desc: 'Doğal/yapay boşluklar, gömülü galeri ve dehliz hatları' },
  { label: 'Derin Kütle (4.0 - 5.0 m)', min: 4.0, max: 5.0, desc: 'Taban kayası ve derin mineral damarları' },
];

export const DepthSlicerDock: React.FC<DepthSlicerDockProps> = ({
  filter,
  onChangeFilter,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-3 top-24 z-30 pointer-events-auto animate-fadeIn max-w-[280px]">
      <div className="bg-slate-950/95 border border-purple-500/70 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-2 font-sans text-xs text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-300 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-white tracking-wide block leading-tight">
                DERİNLİK DİLİMİ (GPR)
              </span>
              <span className="text-[9px] text-purple-300 font-mono">
                {filter.minDepth.toFixed(1)}m — {filter.maxDepth.toFixed(1)}m Dilim
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playScanBeep();
              onClose();
            }}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Slices */}
        <div className="flex flex-col gap-1 pt-1">
          {PRESET_DEPTHS.map((preset) => {
            const isSelected =
              Math.abs(filter.minDepth - preset.min) < 0.1 &&
              Math.abs(filter.maxDepth - preset.max) < 0.1;

            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onChangeFilter({
                    minDepth: preset.min,
                    maxDepth: preset.max,
                    label: preset.label,
                  });
                }}
                className={`w-full px-2.5 py-1.5 rounded-xl text-left transition-all border ${
                  isSelected
                    ? 'bg-purple-900/70 border-purple-400 text-white font-bold shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px]">{preset.label}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                </div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
                  {preset.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Depth Range Indicator Meter */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>0 m (Yüzey)</span>
            <span className="text-cyan-400 font-bold">Aktif: {filter.minDepth}m - {filter.maxDepth}m</span>
            <span>5.0 m</span>
          </div>

          <div className="relative w-full h-2 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 rounded-full"
              style={{
                left: `${(filter.minDepth / 5.0) * 100}%`,
                width: `${((filter.maxDepth - filter.minDepth) / 5.0) * 100}%`,
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
