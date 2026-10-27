import React, { useEffect, useRef } from 'react';

export const RadarPortalVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const render = () => {
      time += 0.03;
      const width = canvas.width = canvas.offsetWidth * window.devicePixelRatio || 400;
      const height = canvas.height = canvas.offsetHeight * window.devicePixelRatio || 200;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Draw subtle background grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 24 * (window.devicePixelRatio || 1);
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 1. Concentric Expanding Radar Rings
      const maxRadius = Math.min(width, height) * 0.45;
      for (let i = 1; i <= 3; i++) {
        const r = ((time * 25 + i * (maxRadius / 3)) % maxRadius);
        const alpha = Math.max(0, 1 - r / maxRadius) * 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 2. Rotating Radar Sweep Beam
      const sweepAngle = time * 1.5;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, sweepAngle, sweepAngle + Math.PI / 4);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      // 3. Subsurface Stratigraphy Waves (C-Band & L-Band Signals)
      // Wave 1: C-Band Backscatter (Cyan)
      ctx.beginPath();
      for (let x = 0; x < width; x += 3) {
        const freq1 = Math.sin(x * 0.02 + time * 2) * 12;
        const freq2 = Math.sin(x * 0.05 - time) * 6;
        const y = height * 0.72 + freq1 + freq2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(6, 182, 212, 0.8)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Wave 2: L-Band Subsurface Penetration (Purple/Indigo)
      ctx.beginPath();
      for (let x = 0; x < width; x += 3) {
        const freq = Math.sin(x * 0.015 - time * 1.5) * 16;
        const y = height * 0.85 + freq;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 4. Simulated Anomaly Targets (Flashing blips)
      const blips = [
        { x: cx - maxRadius * 0.5, y: cy - maxRadius * 0.2, label: 'ANOMALY-A #01', depth: '-12.4m' },
        { x: cx + maxRadius * 0.4, y: cy + maxRadius * 0.15, label: 'VOXLER-CSV #02', depth: '-6.8m' },
        { x: cx + maxRadius * 0.1, y: cy - maxRadius * 0.5, label: 'SAR-PHASE #03', depth: '-18.2m' },
      ];

      blips.forEach((b, idx) => {
        const pulse = Math.sin(time * 4 + idx) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4 + pulse * 3, 0, Math.PI * 2);
        ctx.fillStyle = idx === 1 ? '#eab308' : idx === 2 ? '#a855f7' : '#22d3ee';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
        ctx.font = `${9 * (window.devicePixelRatio || 1)}px monospace`;
        ctx.fillText(`${b.label} [${b.depth}]`, b.x + 8, b.y + 3);
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative w-full h-[190px] sm:h-[210px] rounded-2xl overflow-hidden bg-slate-950/80 border border-cyan-500/30 shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* HUD Overlay Badges */}
      <div className="absolute top-2.5 left-3 flex items-center gap-2 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
          SENTINEL-1 SAR LIVE IN-ORBIT
        </span>
      </div>

      <div className="absolute top-2.5 right-3 flex items-center gap-1.5 pointer-events-none">
        <span className="text-[9px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
          C-BAND (5.4 GHz) • L-BAND (1.27 GHz)
        </span>
      </div>

      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[9px] font-mono text-slate-400 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold">■ DIELEKTRİK YÜKSEK</span>
          <span className="text-purple-400 font-bold">■ İZOYÜZEY 3B</span>
          <span className="text-yellow-400 font-bold">■ BOŞLUK/REZİSTİVİTE</span>
        </div>
        <span className="text-emerald-400">KALİBRASYON: %99.8</span>
      </div>
    </div>
  );
};
