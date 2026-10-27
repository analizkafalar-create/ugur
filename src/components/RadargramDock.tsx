/**
 * TerraScan AI - Subsurface Radargram Dock (GPR B-Scan Cross-Section)
 * Visualizes true geophysical transect along the scan area with strata layers,
 * hyperbolic reflections, two-way-travel time (ns), and depth profiling (0-5m).
 */

import React, { useState, useRef, useEffect } from 'react';
import { RadargramData, AnomalyHotspot } from '../types';
import { sound } from '../utils/anomalyEngine';
import { Activity, X, Maximize2, Minimize2, Radio, Layers } from 'lucide-react';

interface RadargramDockProps {
  isOpen: boolean;
  onClose: () => void;
  data: RadargramData | undefined;
  hotspots: AnomalyHotspot[];
  selectedHotspot: AnomalyHotspot | null;
  onSelectHotspot: (hotspot: AnomalyHotspot) => void;
}

export const RadargramDock: React.FC<RadargramDockProps> = ({
  isOpen,
  onClose,
  data,
  hotspots,
  selectedHotspot,
  onSelectHotspot,
}) => {
  const [colorPalette, setColorPalette] = useState<'rainbow' | 'greyscale' | 'wiggle'>('rainbow');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ distM: number; depthM: number; timeNs: number; db: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen || !data) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Background (Dark Geophysical Display)
    ctx.fillStyle = colorPalette === 'greyscale' ? '#111827' : '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Margins
    const marginLeft = 54;
    const marginRight = 54;
    const marginTop = 24;
    const marginBottom = 28;
    const plotW = width - marginLeft - marginRight;
    const plotH = height - marginTop - marginBottom;

    // 2. Draw Geological Strata Bands
    if (data.strataLayers) {
      let prevY = marginTop;
      data.strataLayers.forEach((layer) => {
        const layerY = marginTop + (layer.depthM / data.maxDepthMeters) * plotH;
        ctx.fillStyle = layer.colorHex;
        ctx.globalAlpha = colorPalette === 'greyscale' ? 0.12 : 0.18;
        ctx.fillRect(marginLeft, prevY, plotW, layerY - prevY);
        ctx.globalAlpha = 1.0;

        // Strata divider line
        ctx.strokeStyle = layer.colorHex;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(marginLeft, layerY);
        ctx.lineTo(marginLeft + plotW, layerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px monospace';
        ctx.fillText(`${layer.nameTr} (-${layer.depthM}m)`, marginLeft + 6, layerY - 4);

        prevY = layerY;
      });
    }

    // 3. Grid Lines (Time & Distance)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    // Horizontal Depth/Time Grids
    for (let d = 1; d <= 5; d++) {
      const y = marginTop + (d / 5) * plotH;
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(marginLeft + plotW, y);
      ctx.stroke();
    }

    // Vertical Distance Grids (every 5 meters)
    for (let m = 0; m <= 40; m += 5) {
      const x = marginLeft + (m / 40) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, marginTop + plotH);
      ctx.stroke();
    }

    // 4. Draw Radar Traces / Noise Spektrumu
    const v = 0.108; // 0.108 m/ns (Soil radar wave speed)
    ctx.lineWidth = colorPalette === 'wiggle' ? 1.5 : 1.0;

    for (let i = 0; i < data.traces.length; i++) {
      const trace = data.traces[i];
      const traceX = marginLeft + (trace.distanceMeters / data.transectLengthMeters) * plotW;

      if (colorPalette === 'wiggle') {
        // Classic Geophysics Wiggle Trace display
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
        ctx.beginPath();
        ctx.moveTo(traceX, marginTop);
        for (let y = marginTop; y <= marginTop + plotH; y += 4) {
          const depthAtY = ((y - marginTop) / plotH) * data.maxDepthMeters;
          const diff = Math.abs(depthAtY - trace.depthMeters);
          const wiggle = diff < 0.6 ? Math.sin((y / 6)) * 6 * Math.exp(-diff * 3) : Math.sin(y / 4) * 1.2;
          ctx.lineTo(traceX + wiggle, y);
        }
        ctx.stroke();
      }
    }

    // 5. Draw Radar Reflection Hyperbolas (The definitive signature of cavities & metal bodies)
    data.hyperbolas.forEach((hyp) => {
      const isSelected = selectedHotspot?.id === hyp.hotspotId;
      const apexX = marginLeft + (hyp.distM / data.transectLengthMeters) * plotW;
      const apexY = marginTop + (hyp.depthM / data.maxDepthMeters) * plotH;

      ctx.save();
      ctx.beginPath();
      
      // Calculate hyperbola points: t^2 = t0^2 + (2*dx / v)^2
      const t0 = hyp.timeNs;
      const halfWidthM = 4.5;
      let first = true;

      for (let dx = -halfWidthM; dx <= halfWidthM; dx += 0.25) {
        const currentDistM = hyp.distM + dx;
        if (currentDistM < 0 || currentDistM > data.transectLengthMeters) continue;

        const timeNs = Math.sqrt(t0 * t0 + Math.pow((2 * dx) / v, 2));
        const depthM = (timeNs * v) / 2;
        if (depthM > data.maxDepthMeters) continue;

        const px = marginLeft + (currentDistM / data.transectLengthMeters) * plotW;
        const py = marginTop + (depthM / data.maxDepthMeters) * plotH;

        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
      }

      // Hyperbola styling
      if (colorPalette === 'rainbow') {
        ctx.strokeStyle = isSelected ? '#ffffff' : hyp.color;
        ctx.lineWidth = isSelected ? 3.5 : 2.5;
        ctx.shadowColor = hyp.color;
        ctx.shadowBlur = isSelected ? 16 : 8;
      } else {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.0;
      }
      ctx.stroke();
      ctx.restore();

      // Apex Target Marker & Number Pin
      ctx.fillStyle = hyp.color;
      ctx.beginPath();
      ctx.arc(apexX, apexY, isSelected ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Badge label
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(apexX - 12, apexY - 22, 24, 14);
      ctx.strokeStyle = hyp.color;
      ctx.strokeRect(apexX - 12, apexY - 22, 24, 14);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${hyp.hotspotId}`, apexX, apexY - 12);
      ctx.textAlign = 'left';
    });

    // 6. Draw Axes & Ticks
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';

    // Left Axis: Depth (Meters)
    ctx.textAlign = 'right';
    for (let d = 0; d <= 5; d++) {
      const y = marginTop + (d / 5) * plotH;
      ctx.fillText(`${d.toFixed(1)}m`, marginLeft - 8, y + 3);
    }
    ctx.save();
    ctx.translate(14, marginTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('DERİNLİK (m)', 0, 0);
    ctx.restore();

    // Right Axis: Two-Way Travel Time (TWT in Nanoseconds)
    ctx.textAlign = 'left';
    for (let t = 0; t <= 80; t += 16) {
      const y = marginTop + (t / 80) * plotH;
      ctx.fillText(`${t}ns`, marginLeft + plotW + 8, y + 3);
    }
    ctx.save();
    ctx.translate(width - 12, marginTop + plotH / 2);
    ctx.rotate(Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a855f7';
    ctx.fillText('TWT ZAMANI (ns)', 0, 0);
    ctx.restore();

    // Bottom Axis: Distance (Meters)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    for (let m = 0; m <= 40; m += 10) {
      const x = marginLeft + (m / 40) * plotW;
      ctx.fillText(`${m}m`, x, height - 10);
    }
    ctx.fillText('A ➔ B KESİT MESAFESİ (m)', marginLeft + plotW / 2, height - 1);

  }, [isOpen, data, colorPalette, selectedHotspot]);

  if (!isOpen || !data) return null;

  // Handle Mouse Over Canvas to read instant cross-section coordinates
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const marginLeft = 54;
    const marginRight = 54;
    const marginTop = 24;
    const marginBottom = 28;
    const plotW = canvas.width - marginLeft - marginRight;
    const plotH = canvas.height - marginTop - marginBottom;

    if (x >= marginLeft && x <= marginLeft + plotW && y >= marginTop && y <= marginTop + plotH) {
      const relX = (x - marginLeft) / plotW;
      const relY = (y - marginTop) / plotH;
      const distM = +(relX * data.transectLengthMeters).toFixed(1);
      const depthM = +(relY * data.maxDepthMeters).toFixed(2);
      const timeNs = Math.round((depthM / 0.108) * 2);
      const db = -Math.round(8 + relY * 24);
      setHoveredPoint({ distM, depthM, timeNs, db });
    } else {
      setHoveredPoint(null);
    }
  };

  return (
    <div
      className={`fixed z-40 transition-all duration-300 ${
        isExpanded
          ? 'inset-x-2 bottom-2 top-16 md:inset-x-12 md:bottom-6 md:top-20'
          : 'bottom-2 inset-x-2 sm:inset-x-6 sm:bottom-4 max-w-4xl mx-auto'
      }`}
    >
      <div className="bg-slate-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col h-full border-t-2 border-t-cyan-400">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block leading-tight flex items-center gap-1.5">
                <span>GPR Yeraltı Radargram Kesiti (B-Scan)</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-[10px]">
                  A-B Hattı: 40m
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Radar Frekansı: 500 MHz · Dalga Hızı: 0.108 m/ns · Çift Yönlü Gecikme: 0-80 ns
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Palette Mode Selector */}
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setColorPalette('rainbow')}
                className={`px-2 py-1 rounded transition-colors ${
                  colorPalette === 'rainbow' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Gökkuşağı
              </button>
              <button
                type="button"
                onClick={() => setColorPalette('greyscale')}
                className={`px-2 py-1 rounded transition-colors ${
                  colorPalette === 'greyscale' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Gri Skala
              </button>
              <button
                type="button"
                onClick={() => setColorPalette('wiggle')}
                className={`px-2 py-1 rounded transition-colors ${
                  colorPalette === 'wiggle' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Wiggle
              </button>
            </div>

            {/* Expand / Minimize */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={isExpanded ? 'Küçült' : 'Tam Ekran Büyüt'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-white transition-colors"
              title="Kesit Panelini Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Cursor Telemetry Bar */}
        <div className="px-3.5 py-1 bg-slate-950 border-b border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            {hoveredPoint ? (
              <>
                <span className="text-cyan-300">
                  Mesafe: <strong className="text-white">{hoveredPoint.distM} m</strong>
                </span>
                <span className="text-amber-300">
                  Derinlik: <strong className="text-white">-{hoveredPoint.depthM} m</strong>
                </span>
                <span className="text-purple-300">
                  TWT: <strong className="text-white">{hoveredPoint.timeNs} ns</strong>
                </span>
                <span className="text-emerald-300">
                  Genlik: <strong className="text-white">{hoveredPoint.db} dB</strong>
                </span>
              </>
            ) : (
              <span className="text-slate-500 text-[10px]">
                Radargram üzerinde fareyi gezdirerek anlık derinlik (m) ve seyahat gecikmesi (ns) okuyun.
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 shrink-0">
            Hiperbol Sayısı: <span className="text-cyan-400 font-bold">{data.hyperbolas.length}</span>
          </div>
        </div>

        {/* Interactive Radargram Canvas Area */}
        <div className="relative flex-1 min-h-[170px] sm:min-h-[220px] bg-slate-950 p-2 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={860}
            height={isExpanded ? 460 : 220}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredPoint(null)}
            className="w-full h-full object-contain rounded-lg border border-slate-800 cursor-crosshair"
          />
        </div>

        {/* Hotspots Quick Pill Selector */}
        <div className="px-3 py-1.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[10px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400" />
            Hiperbolik Odaklar:
          </span>
          {data.hyperbolas.map((hyp) => {
            const isSelected = selectedHotspot?.id === hyp.hotspotId;
            const spot = hotspots.find(h => h.id === hyp.hotspotId);
            return (
              <button
                key={hyp.hotspotId}
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  if (spot) onSelectHotspot(spot);
                }}
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-cyan-400 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: hyp.color }}
                />
                <span>#{hyp.hotspotId}</span>
                <span className="opacity-80">-{hyp.depthM.toFixed(1)}m</span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
