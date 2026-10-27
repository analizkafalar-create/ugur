/**
 * TerraScan AI - Real-time Satellite Radar Swath & Laser Scan Overlay
 * Displays animated scanning beams, multi-frequency telemetry, and live status during anomaly capture
 */

import React, { useEffect, useState } from 'react';
import { Satellite, Radio, Compass, ShieldCheck, Zap } from 'lucide-react';

interface ScanTelemetryOverlayProps {
  isScanning: boolean;
  satelliteName: string;
  coordinates: string;
}

export const ScanTelemetryOverlay: React.FC<ScanTelemetryOverlayProps> = ({
  isScanning,
  satelliteName,
  coordinates,
}) => {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const steps = [
    { title: 'SAR Faz Kilidi ve Ephemeris Yörünge Hizalaması', code: 'SAR-PHASE-LOCK' },
    { title: 'Yeraltı Dielektrik Penetrasyonu & Geri Saçılım (500MHz)', code: 'GPR-BACKSCATTER' },
    { title: 'Manyetik Dipol ve Boşluk Gradyometre Ayrıştırması', code: 'MAG-GRADIENT-INVERT' },
    { title: 'Eş-Yoğunluk İzokonturları & 3B Hacim Rekonstrüksiyonu', code: 'ISOCONTOUR-3D-RENDER' },
  ];

  useEffect(() => {
    if (!isScanning) {
      setStepIndex(0);
      setProgressPercent(0);
      return;
    }

    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) return 100;
        const next = prev + 8;
        if (next > 75) setStepIndex(3);
        else if (next > 50) setStepIndex(2);
        else if (next > 25) setStepIndex(1);
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isScanning]);

  if (!isScanning) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
      
      {/* 1. Animated Laser Radar Swath Line that sweeps vertically */}
      <div 
        className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_25px_#06b6d4]"
        style={{
          animation: 'radarSwathSweep 1.6s ease-in-out infinite alternate',
        }}
      />
      <div 
        className="absolute inset-x-0 h-24 bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none"
        style={{
          animation: 'radarSwathGlow 1.6s ease-in-out infinite alternate',
        }}
      />

      {/* 2. Central High-Tech Telemetry HUD Card */}
      <div className="relative z-10 bg-slate-950/90 border-2 border-cyan-400/80 rounded-2xl p-5 shadow-[0_0_60px_rgba(6,182,212,0.45)] max-w-md w-11/12 text-center backdrop-blur-xl animate-scaleIn">
        
        {/* Pulsing Satellite Target Icon */}
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center text-cyan-400 relative">
          <Satellite className="w-7 h-7 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
          </span>
        </div>

        {/* Satellite Header & Coordinates */}
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 mb-1">
          <Radio className="w-3.5 h-3.5 animate-spin" />
          <span>CANLI UZAKTAN ALGILAMA ÇEKİMİ YAPILIYOR</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-1">
          {satelliteName}
        </h3>
        <p className="text-xs font-mono text-slate-400 mb-4 flex items-center justify-center gap-1">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>{coordinates}</span>
        </p>

        {/* Animated Progress Bar */}
        <div className="w-full bg-slate-900 rounded-full h-2.5 p-0.5 border border-slate-700 overflow-hidden mb-3">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-amber-400 rounded-full transition-all duration-150 relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute inset-0 bg-white/30 animate-pulse" />
          </div>
        </div>

        {/* Current Active Step */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 mb-3 flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <div>
              <div className="text-[10px] text-slate-400 font-mono">
                AŞAMA {stepIndex + 1}/4 · {steps[stepIndex]?.code}
              </div>
              <div className="text-xs font-bold text-cyan-300">
                {steps[stepIndex]?.title}
              </div>
            </div>
          </div>
          <div className="text-sm font-mono font-extrabold text-white">
            %{progressPercent}
          </div>
        </div>

        {/* Sensor Array Badges */}
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
            SAR L-Bant (1.2GHz)
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400">
            TIR Termal (10.8µm)
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400">
            Fluxgate Manyetometre
          </span>
        </div>

      </div>

      {/* CSS Keyframes for Scan Sweep */}
      <style>{`
        @keyframes radarSwathSweep {
          0% { top: 0%; }
          100% { top: 98%; }
        }
        @keyframes radarSwathGlow {
          0% { top: 0%; opacity: 0.6; }
          100% { top: 90%; opacity: 0.2; }
        }
      `}</style>
    </div>
  );
};
