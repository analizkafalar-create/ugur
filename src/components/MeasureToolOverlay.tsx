/**
 * TerraScan AI - Field Distance & Angle Measurement Tool
 * Allows measuring exact distance in meters and azimuth between any two points or anomalies
 */

import React from 'react';
import { MeasurePoint } from '../types';
import { Ruler, X, Compass, ArrowRight, RotateCcw } from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

interface MeasureToolOverlayProps {
  isActive: boolean;
  points: MeasurePoint[];
  onClear: () => void;
  onClose: () => void;
}

// Calculate distance in meters using Haversine formula
function calculateDistanceMeters(p1: MeasurePoint, p2: MeasurePoint): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (p1.lat * Math.PI) / 180;
  const phi2 = (p2.lat * Math.PI) / 180;
  const deltaPhi = ((p2.lat - p1.lat) * Math.PI) / 180;
  const deltaLambda = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate bearing in degrees
function calculateBearingDegrees(p1: MeasurePoint, p2: MeasurePoint): number {
  const phi1 = (p1.lat * Math.PI) / 180;
  const phi2 = (p2.lat * Math.PI) / 180;
  const deltaLambda = ((p2.lng - p1.lng) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);

  return (theta * 180 / Math.PI + 360) % 360;
}

// Get cardinal direction name in Turkish
function getCardinalDirection(deg: number): string {
  const directions = [
    { name: 'K (Kuzey)', min: 337.5, max: 22.5 },
    { name: 'KD (Kuzeydoğu)', min: 22.5, max: 67.5 },
    { name: 'D (Doğu)', min: 67.5, max: 112.5 },
    { name: 'GD (Güneydoğu)', min: 112.5, max: 157.5 },
    { name: 'G (Güney)', min: 157.5, max: 202.5 },
    { name: 'GB (Güneybatı)', min: 202.5, max: 247.5 },
    { name: 'B (Batı)', min: 247.5, max: 292.5 },
    { name: 'KB (Kuzeybatı)', min: 292.5, max: 337.5 },
  ];

  for (const d of directions) {
    if (d.min > d.max) {
      if (deg >= d.min || deg < d.max) return d.name;
    } else if (deg >= d.min && deg < d.max) {
      return d.name;
    }
  }
  return 'K (Kuzey)';
}

export const MeasureToolOverlay: React.FC<MeasureToolOverlayProps> = ({
  isActive,
  points,
  onClear,
  onClose,
}) => {
  if (!isActive) return null;

  const distanceMeters =
    points.length >= 2 ? calculateDistanceMeters(points[0], points[1]) : 0;
  const bearingDeg =
    points.length >= 2 ? calculateBearingDegrees(points[0], points[1]) : 0;
  const directionName = getCardinalDirection(bearingDeg);

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-fadeIn">
      <div className="bg-slate-950/95 border border-cyan-500/80 rounded-2xl p-3 shadow-2xl backdrop-blur-xl flex flex-col gap-2 min-w-[280px] sm:min-w-[340px] text-xs font-sans text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Ruler className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white tracking-wide">
              ARAZİ MESAFE VE AÇI ÖLÇER
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                sound.playScanBeep();
                onClear();
              }}
              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
              title="Ölçümü Sıfırla"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                sound.playScanBeep();
                onClose();
              }}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Ölçer Aracını Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status Prompt */}
        {points.length === 0 && (
          <div className="text-amber-400 text-[11px] font-mono py-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Harita üzerinde başlangıç noktasını (Nokta A) tıklayın.</span>
          </div>
        )}

        {points.length === 1 && (
          <div className="text-cyan-300 text-[11px] font-mono py-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Harita üzerinde hedef noktasını (Nokta B) tıklayın.</span>
          </div>
        )}

        {/* Measurement Results */}
        {points.length >= 2 && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono">KUŞ UÇUŞU MESAFE</span>
              <span className="text-lg font-bold font-mono text-cyan-400">
                {distanceMeters < 1000
                  ? `${distanceMeters.toFixed(1)} m`
                  : `${(distanceMeters / 1000).toFixed(2)} km`}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {distanceMeters.toFixed(2)} metre
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono">PUSULA AÇISI (AZİMUT)</span>
              <span className="text-lg font-bold font-mono text-amber-400 flex items-center gap-1">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>{bearingDeg.toFixed(0)}°</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate">
                {directionName}
              </span>
            </div>
          </div>
        )}

        {/* Coordinates readout */}
        {points.length > 0 && (
          <div className="text-[10px] font-mono text-slate-400 pt-1 flex flex-col gap-0.5 border-t border-slate-800/80">
            {points[0] && (
              <div>
                <span className="text-cyan-400 font-bold">Nokta A:</span>{' '}
                {points[0].lat.toFixed(6)}, {points[0].lng.toFixed(6)}
              </div>
            )}
            {points[1] && (
              <div>
                <span className="text-amber-400 font-bold">Nokta B:</span>{' '}
                {points[1].lat.toFixed(6)}, {points[1].lng.toFixed(6)}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
