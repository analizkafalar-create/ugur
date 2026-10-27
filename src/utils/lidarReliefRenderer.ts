/**
 * TerraScan AI - Real Topographic (DEM) 26-Band LiDAR Color Relief & Surfer Pro Renderer
 * Driven strictly by real elevation (DEM), Horn's 3x3 slope, multi-scale TPI, and Laplacian surface curvature.
 * Contains zero hardcoded/static shapes—every coordinate on Earth renders its genuine terrain relief.
 */

import { ScanArea } from '../types';
import { LidarSmartConfig } from '../components/LidarHeatmapDrawer';
import { RealDemGridResult } from './demTileLoader';

// 26-Band Surfer Pro / LiDAR Color Relief Lookup Table (RGB)
const SURFER_26_BANDS: [number, number, number][] = [
  [14, 3, 4],      // 0: Deepest Basin / Depression Shadow
  [26, 5, 7],      // 1: Dark Maroon Concave Trough
  [42, 8, 10],     // 2: Sub-trough Maroon
  [64, 11, 13],    // 3: Low Relief Shadow
  [92, 16, 16],    // 4: Dark Crimson Step
  [127, 23, 20],   // 5: Deep Terracotta Red
  [162, 26, 22],   // 6: Brick Red
  [188, 28, 24],   // 7: LiDAR Base Crimson
  [208, 34, 22],   // 8: Rich Vermilion
  [222, 38, 22],   // 9: Standard Terrain Red
  [232, 45, 18],   // 10: Bright Red-Orange
  [239, 54, 16],   // 11: Scarlet Relief
  [244, 67, 14],   // 12: Warm Vermilion
  [249, 85, 16],   // 13: Deep Orange Slope
  [251, 108, 18],  // 14: Orange Ridge
  [245, 138, 14],  // 15: Amber Transition
  [245, 166, 12],  // 16: Golden Ochre
  [238, 194, 16],  // 17: Vivid Gold
  [250, 214, 24],  // 18: Bright Yellow Halo
  [253, 232, 72],  // 19: High Lemon Yellow
  [254, 249, 155], // 20: Pale Yellow Crest
  [255, 255, 255], // 21: White-Hot Topographic Crest
  [165, 243, 252], // 22: Ice Cyan Rim
  [34, 211, 238],  // 23: Electric Cyan Scarp / Ridge
  [6, 182, 212],   // 24: Deep Cyan High Prominence
  [29, 78, 216],   // 25: Cobalt Blue Peak Core
];

// Video Thermal (Sarı-Mor) Lookup Table
const VIDEO_THERMAL_BANDS: [number, number, number][] = [
  [12, 7, 32],
  [24, 12, 58],
  [42, 16, 88],
  [64, 18, 115],
  [88, 22, 135],
  [114, 24, 142],
  [142, 26, 138],
  [168, 30, 122],
  [192, 38, 98],
  [212, 50, 74],
  [228, 66, 48],
  [240, 86, 28],
  [248, 110, 18],
  [252, 136, 16],
  [254, 164, 22],
  [254, 192, 34],
  [253, 218, 56],
  [253, 238, 98],
  [254, 250, 165],
  [255, 255, 255],
];

/**
 * Renders the full-viewport LiDAR heatmap directly from real DEM elevation, slope, TPI, and curvature.
 */
export function renderRealDemLidarCanvas(
  dem: RealDemGridResult,
  config: LidarSmartConfig,
  regionFilterBounds?: { minX: number; minY: number; maxX: number; maxY: number } | null,
  categoryFilter: 'ALL' | 'MAN_MADE_STRUCTURE' | 'NATURAL_GEOLOGICAL' = 'ALL',
  categoryColoringActive: boolean = false
): string {
  const GRID = dem.gridSize;
  const OUT_SIZE = 720;

  const field = new Float32Array(GRID * GRID);

  // Sensitivity / Power multiplier
  const powerMult =
    config.powerLevel === 'MAXIMUM' ? 1.32 : config.powerLevel === 'HIGH' ? 1.12 : 0.94;

  // Depth tuning factor: shallow emphasizes local TPI & curvature; deep emphasizes macro TPI & structural basins
  const depthMeters = Math.max(0.4, Math.min(4.5, config.searchDepthMeters));
  const shallowRatio = Math.max(0.25, 1.25 - depthMeters * 0.24);
  const deepRatio = Math.min(1.45, 0.55 + depthMeters * 0.25);

  const elevSpan = Math.max(2.0, dem.maxElevation - dem.minElevation);
  const localScale = Math.max(0.45, elevSpan * 0.045);
  const macroScale = Math.max(1.2, elevSpan * 0.14);

  // Compute target-specific real topographic field
  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let i = 0; i < GRID * GRID; i++) {
    const relElev = (dem.elevation[i] - dem.minElevation) / elevSpan;
    const sDeg = dem.slopeDeg[i];
    const sNorm = Math.tanh(sDeg / 18.0);
    const tLoc = Math.tanh(dem.tpiLocal[i] / localScale);
    const tMac = Math.tanh(dem.tpiMacro[i] / macroScale);
    const curv = Math.tanh(dem.curvature[i] * 14.0);
    const baseNorm = dem.normalizedField[i];

    let val = baseNorm;

    // 1. Target Preset Transformation on Real Terrain Derivatives
    switch (config.targetPreset) {
      case 'ANCIENT_WALL':
        // Emphasizes linear slope breaks, terrace edges, and sharp convex ridge lines
        val =
          baseNorm * 0.35 +
          sNorm * 0.34 * shallowRatio +
          Math.abs(curv) * 0.24 * shallowRatio +
          tLoc * 0.22;
        break;

      case 'TOMB_SARCOPHAGUS':
        // Emphasizes convex mounds/tumuli (positive TPI + positive curvature) at target depth
        val =
          baseNorm * 0.38 +
          Math.max(0, tLoc) * 0.34 * deepRatio +
          Math.max(0, tMac) * 0.24 * deepRatio +
          Math.max(0, curv) * 0.22;
        break;

      case 'CAVITY_TUNNEL':
        // Emphasizes concave depressions, sinkholes, and negative TPI basins
        val =
          (1.0 - baseNorm) * 0.30 +
          Math.max(0, -tLoc) * 0.38 * deepRatio +
          Math.max(0, -curv) * 0.24 +
          sNorm * 0.16;
        break;

      case 'GOLD_COIN_METAL':
        // Emphasizes shallow micro-relief inflection peaks and high-gradient pockets
        val =
          baseNorm * 0.36 +
          Math.abs(tLoc) * 0.32 * shallowRatio +
          sNorm * 0.22 * shallowRatio +
          curv * 0.20;
        break;

      case 'GENERAL_TERRAIN':
      default:
        val =
          relElev * 0.28 +
          baseNorm * 0.36 +
          tLoc * 0.20 * shallowRatio +
          tMac * 0.16 * deepRatio;
        break;
    }

    // 2. Sequential 6-Stage Filter Transformation (when active)
    if (config.sequentialFilterStage === 1) {
      // Stage 1: Ham LiDAR DEM (Pure elevation + hillshade)
      val = relElev * 0.65 + baseNorm * 0.35;
    } else if (config.sequentialFilterStage === 2) {
      // Stage 2: Bitki & Ot Soyma (Bare-earth TPI residual)
      val = 0.5 + tMac * 0.32 + tLoc * 0.28;
    } else if (config.sequentialFilterStage === 3) {
      // Stage 3: Laplacian Kubbe (Convex dome & mound isolation)
      val = 0.42 + Math.max(0, curv) * 0.45 + Math.max(0, tLoc) * 0.35;
    } else if (config.sequentialFilterStage === 4) {
      // Stage 4: Sobel Duvar Hatları (Horn/Sobel slope & scarp edges)
      val = 0.28 + sNorm * 0.52 + Math.abs(curv) * 0.28;
    } else if (config.sequentialFilterStage === 5) {
      // Stage 5: Metal & VDI Halo (High-curvature micro-peaks)
      val = 0.32 + Math.abs(tLoc) * 0.42 + Math.max(0, curv) * 0.36;
    }

    field[i] = val;
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }

  // Normalize field to 0..1 and apply sensitivity/power contrast curve
  const range = Math.max(1e-5, maxVal - minVal);
  for (let i = 0; i < GRID * GRID; i++) {
    const norm = (field[i] - minVal) / range;
    const contrasted = (norm - 0.46) * powerMult + 0.48;
    field[i] = Math.max(0.0, Math.min(0.999, contrasted));
  }

  // Render quantized 26-band Color Relief + real slope contour lines onto Canvas
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = GRID;
  smallCanvas.height = GRID;
  const sCtx = smallCanvas.getContext('2d');
  if (!sCtx) return '';

  const imgData = sCtx.createImageData(GRID, GRID);
  const data = imgData.data;

  const isVideoThermal = config.visualMode === 'VIDEO_THERMAL';
  const isHybrid = config.visualMode === 'HYBRID_MODE';
  const isXrayGray = config.visualMode === 'XRAY_GRAY';

  for (let iy = 0; iy < GRID; iy++) {
    const ny = iy / GRID;
    for (let ix = 0; ix < GRID; ix++) {
      const nx = ix / GRID;
      const idx = iy * GRID + ix;
      const v = field[idx];

      // Local gradient of the normalized field for crisp contour step lines
      const vx1 = field[iy * GRID + Math.min(GRID - 1, ix + 1)];
      const vx0 = field[iy * GRID + Math.max(0, ix - 1)];
      const vy1 = field[Math.min(GRID - 1, iy + 1) * GRID + ix];
      const vy0 = field[Math.max(0, iy - 1) * GRID + ix];
      const fgx = vx1 - vx0;
      const fgy = vy1 - vy0;
      const fieldSlope = Math.hypot(fgx, fgy);
      const realSlopeDeg = dem.slopeDeg[idx];

      const inRegion =
        !regionFilterBounds ||
        (nx >= regionFilterBounds.minX &&
          nx <= regionFilterBounds.maxX &&
          ny >= regionFilterBounds.minY &&
          ny <= regionFilterBounds.maxY);

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;

      if (isXrayGray) {
        // Röntgen (Gri) - Directional Topographic Micro-Relief Hillshade
        const hillshade = Math.max(
          0,
          Math.min(1, 0.54 + (fgx * 5.8 - fgy * 5.8) + (v - 0.45) * 0.65)
        );
        const quant = Math.floor(hillshade * 24) / 24;
        const lum = Math.round(quant * 235 + 12);
        r = lum;
        g = Math.min(255, lum + (v > 0.76 ? 12 : 0));
        b = Math.min(255, lum + (v > 0.76 ? 24 : 4));
        if (fieldSlope > 0.055) {
          r = Math.max(10, r - 42);
          g = Math.max(14, g - 38);
          b = Math.max(18, b - 32);
        }
      } else if (isVideoThermal) {
        // Video Termal (Sarı-Mor)
        const bandCount = VIDEO_THERMAL_BANDS.length;
        const bIdx = Math.min(bandCount - 1, Math.floor(v * bandCount));
        [r, g, b] = VIDEO_THERMAL_BANDS[bIdx];
        if (fieldSlope > 0.05) {
          r = Math.round(r * 0.58);
          g = Math.round(g * 0.58);
          b = Math.round(b * 0.58);
        }
      } else {
        // MAP_COLOR_RELIEF (26-Bant Surfer Pro / LiDAR Isı) & HYBRID_MODE
        const bandCount = SURFER_26_BANDS.length;
        const rawBand = v * bandCount;
        const bIdx = Math.min(bandCount - 1, Math.floor(rawBand));
        const bandFrac = rawBand - bIdx;
        [r, g, b] = SURFER_26_BANDS[bIdx];

        // 1. Real Isohypses / Topographic Contour Step Lines
        if (bandFrac < 0.115 && fieldSlope > 0.014 && v < 0.82) {
          r = Math.round(r * 0.36);
          g = Math.round(g * 0.28);
          b = Math.round(b * 0.28);
        }

        // 2. LiDAR Green Slope-Break Classification Micro-Stipple on real scarp/trough transitions
        const checker = (ix + iy * 3) % 5 === 0 || (ix * 7 + iy) % 11 === 0;
        if (
          inRegion &&
          ((fieldSlope > 0.038 && v > 0.16 && v < 0.54 && checker) ||
            (realSlopeDeg > 11.5 && bandFrac > 0.72 && checker))
        ) {
          r = 34;
          g = 197;
          b = 94;
        }

        // 3. Dim outside region slightly if user right-clicked a specific 6-stage regional filter box
        if (regionFilterBounds && !inRegion) {
          r = Math.round(r * 0.62);
          g = Math.round(g * 0.62);
          b = Math.round(b * 0.62);
        }

        // 4. Hybrid Mode: blend mid-elevation gentle slopes with underlying satellite imagery
        if (isHybrid) {
          if (v > 0.26 && v < 0.58 && fieldSlope < 0.036) {
            a = 140;
          } else {
            a = 235;
          }
        }
      }

      // 5. Category-Based Coloring ('İnsan Yapımı Yapı' vs 'Doğal Jeolojik')
      if (categoryColoringActive || categoryFilter !== 'ALL') {
        const isManMadeTerrain =
          (dem.tpiLocal[idx] > localScale * 0.22 && dem.curvature[idx] > 0.015) ||
          (realSlopeDeg >= 8.5 && Math.abs(dem.curvature[idx]) > 0.025) ||
          v >= 0.68;

        if (categoryFilter === 'MAN_MADE_STRUCTURE') {
          if (isManMadeTerrain) {
            // Boost Anthropogenic Gold / Amber / Crimson signature
            r = Math.min(255, Math.round(r * 0.65 + 245 * 0.35));
            g = Math.min(255, Math.round(g * 0.65 + 158 * 0.35));
            b = Math.min(255, Math.round(b * 0.5 + 11 * 0.5));
          } else {
            // Dim natural geological background
            const lum = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
            r = Math.round(lum * 0.45);
            g = Math.round(lum * 0.48);
            b = Math.round(lum * 0.52);
          }
        } else if (categoryFilter === 'NATURAL_GEOLOGICAL') {
          if (!isManMadeTerrain) {
            // Boost Natural Geological Emerald / Teal signature
            r = Math.min(255, Math.round(r * 0.35 + 16 * 0.65));
            g = Math.min(255, Math.round(g * 0.45 + 185 * 0.55));
            b = Math.min(255, Math.round(b * 0.45 + 129 * 0.55));
          } else {
            // Dim man-made peaks
            const lum = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
            r = Math.round(lum * 0.42);
            g = Math.round(lum * 0.45);
            b = Math.round(lum * 0.48);
          }
        } else if (categoryColoringActive) {
          // Both active with distinct category tinting
          if (isManMadeTerrain) {
            r = Math.min(255, Math.round(r * 0.72 + 245 * 0.28));
            g = Math.min(255, Math.round(g * 0.72 + 158 * 0.28));
            b = Math.min(255, Math.round(b * 0.65 + 11 * 0.35));
          } else {
            r = Math.min(255, Math.round(r * 0.55 + 16 * 0.45));
            g = Math.min(255, Math.round(g * 0.55 + 185 * 0.45));
            b = Math.min(255, Math.round(b * 0.55 + 129 * 0.45));
          }
        }
      }

      const p = idx * 4;
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = a;
    }
  }

  sCtx.putImageData(imgData, 0, 0);

  // Upscale to crisp 720x720 output canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = OUT_SIZE;
  outCanvas.height = OUT_SIZE;
  const oCtx = outCanvas.getContext('2d');
  if (!oCtx) return '';

  oCtx.imageSmoothingEnabled = false;
  oCtx.drawImage(smallCanvas, 0, 0, OUT_SIZE, OUT_SIZE);

  // Draw category-colored perimeter contours around detected DEM anomalies when category mode is active
  if ((categoryColoringActive || categoryFilter !== 'ALL') && Array.isArray(dem.anomalies)) {
    dem.anomalies.forEach((anom) => {
      if (categoryFilter !== 'ALL' && anom.category !== categoryFilter) return;
      const cx = anom.normX * OUT_SIZE;
      const cy = anom.normY * OUT_SIZE;
      const isManMade = anom.category === 'MAN_MADE_STRUCTURE';

      oCtx.save();
      const grad = oCtx.createRadialGradient(cx, cy, 4, cx, cy, 44);
      if (isManMade) {
        grad.addColorStop(0, 'rgba(245, 158, 11, 0.55)');
        grad.addColorStop(0.6, 'rgba(239, 68, 68, 0.30)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else {
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.55)');
        grad.addColorStop(0.6, 'rgba(6, 182, 212, 0.30)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      }
      oCtx.fillStyle = grad;
      oCtx.beginPath();
      oCtx.arc(cx, cy, 44, 0, Math.PI * 2);
      oCtx.fill();

      oCtx.strokeStyle = isManMade ? '#fbbf24' : '#34d399';
      oCtx.lineWidth = 2.5;
      if (isManMade) {
        oCtx.strokeRect(cx - 24, cy - 18, 48, 36);
      } else {
        oCtx.setLineDash([6, 4]);
        oCtx.beginPath();
        oCtx.arc(cx, cy, 26, 0, Math.PI * 2);
        oCtx.stroke();
        oCtx.setLineDash([]);
      }
      oCtx.restore();
    });
  }

  // Highlight regional 6-stage filter perimeter if active
  if (regionFilterBounds) {
    const rx = regionFilterBounds.minX * OUT_SIZE;
    const ry = regionFilterBounds.minY * OUT_SIZE;
    const rw = (regionFilterBounds.maxX - regionFilterBounds.minX) * OUT_SIZE;
    const rh = (regionFilterBounds.maxY - regionFilterBounds.minY) * OUT_SIZE;
    oCtx.strokeStyle = '#22d3ee';
    oCtx.lineWidth = 3;
    oCtx.setLineDash([8, 5]);
    oCtx.strokeRect(rx, ry, rw, rh);
    oCtx.setLineDash([]);
  }

  return outCanvas.toDataURL('image/png');
}

/**
 * Legacy compatibility helper if called synchronously with ScanArea before DEM resolves.
 */
export function renderLidarColorReliefCanvas(
  _scanArea: ScanArea,
  _config: LidarSmartConfig,
  _polygonNormalizedPts?: { x: number; y: number }[],
  _regionFilterBounds?: { minX: number; minY: number; maxX: number; maxY: number } | null
): string {
  return '';
}
