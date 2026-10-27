import React from 'react';

interface TerraScanLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

export const TerraScanLogo: React.FC<TerraScanLogoProps> = ({
  className = '',
  size = 28,
  showText = true,
  textClassName = 'text-xs sm:text-sm font-black tracking-wider',
}) => {
  return (
    <div className={`flex items-center gap-1.5 shrink-0 ${className}`}>
      {/* Crisp Vector Logo Emblem */}
      <div 
        style={{ width: size, height: size }}
        className="relative shrink-0 rounded-lg overflow-hidden shadow-[0_0_12px_rgba(6,182,212,0.4)] ring-1 ring-cyan-500/40"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="tsBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0c1222"/>
              <stop offset="100%" stopColor="#03060c"/>
            </linearGradient>
            <linearGradient id="tsPulse" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff"/>
              <stop offset="100%" stopColor="#0284c7"/>
            </linearGradient>
          </defs>

          {/* Background */}
          <rect width="100" height="100" fill="url(#tsBg)"/>

          {/* Geological Earth Strata */}
          <path d="M12,50 Q28,45 40,54 Q50,62 60,54 Q72,45 88,50 L88,72 Q76,82 50,82 Q24,82 12,72 Z" fill="#1e293b"/>
          <path d="M12,46 Q28,41 40,49 Q50,57 60,49 Q72,41 88,46 L88,64 Q76,74 50,74 Q24,74 12,64 Z" fill="#c2410c"/>
          <path d="M12,42 Q28,37 40,45 Q50,53 60,45 Q72,37 88,42 L88,56 Q72,66 50,66 Q28,66 12,56 Z" fill="#a16207"/>
          <path d="M12,39 Q28,34 40,42 Q50,50 60,42 Q72,34 88,39 L88,48 Q72,44 60,51 Q50,58 40,51 Q28,44 12,48 Z" fill="#22c55e"/>

          {/* Radar Wave Arcs */}
          <g fill="none" stroke="url(#tsPulse)" strokeLinecap="round">
            <path d="M44,38 A 6 6 0 0 0 56,38" strokeWidth="2" opacity="0.95"/>
            <path d="M41,43 A 10 10 0 0 0 59,43" strokeWidth="2" opacity="0.9"/>
            <path d="M37,48 A 14 14 0 0 0 63,48" strokeWidth="2.2" opacity="0.85"/>
          </g>

          {/* T Probe */}
          <g fill="#ffffff">
            <rect x="24" y="14" width="52" height="9" rx="3"/>
            <path d="M45,23 L55,23 L55,33 L50,37 L45,33 Z"/>
          </g>
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex items-center">
          <span className={`${textClassName} leading-none`}>
            <span className="text-white font-black">TERRA</span>
            <span className="text-cyan-400 font-black">SCAN</span>
          </span>
        </div>
      )}
    </div>
  );
};
