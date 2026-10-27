/**
 * TerraScan AI - Voxler 3D CSV/CVS Jeofizik Cihaz Çekimi İnceleme Sistemi (PRO)
 * Golden Software Voxler benzeri 3B Voxel, İzosörfıs, Kesit (OrthoSlice) ve Grid Analiz Motoru
 * OKM, Conrad, Lorenz, Georesistivity, GPR ve Manyetometre CSV/CVS/TXT veri setlerini işler.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Box, 
  Layers, 
  Upload, 
  Sliders, 
  Maximize2, 
  Minimize2, 
  Download, 
  RefreshCw, 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  FileText, 
  RotateCw, 
  Grid, 
  Compass, 
  Crosshair, 
  Check, 
  AlertCircle,
  Play,
  Share2,
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

export interface VoxelDataPoint {
  x: number; // grid or meter X
  y: number; // grid or meter Y
  z: number; // depth in meters (0 to maxDepth)
  value: number; // raw device pulse / nT / Ohm-m / signal (normalized 0..100)
  rawVal?: number;
  type?: 'METAL' | 'CAVITY' | 'STRUCTURE' | 'MINERAL' | 'SOIL';
}

export interface VoxlerDataset {
  name: string;
  deviceType: string;
  sourceType: 'OKM_ROVER' | 'CONRAD_GR3' | 'LORENZ_DEEPMAX' | 'GEO_RESISTIVITY' | 'CUSTOM_CSV';
  gridX: number;
  gridY: number;
  gridZ: number;
  stepSizeMeters: number;
  maxDepthMeters: number;
  points: VoxelDataPoint[];
  metadata: {
    scanDate: string;
    operator: string;
    location: string;
    unit: string;
  };
}

// Pre-configured Realistic Device Scan Presets (OKM, Conrad, Lorenz, Resistivity)
export const PRESET_VOXLER_SCANS: VoxlerDataset[] = [
  {
    name: 'OKM Rover C4 - Mahzen & Metal Anomali Taraması',
    deviceType: 'OKM Rover C4 GPR & 3D Ground Scanner',
    sourceType: 'OKM_ROVER',
    gridX: 12,
    gridY: 12,
    gridZ: 8,
    stepSizeMeters: 0.5,
    maxDepthMeters: 4.0,
    metadata: {
      scanDate: '2026-09-15 14:30',
      operator: 'Jeofizik Uzmanı M. Kaya',
      location: 'Saha-A Parsel 104/12',
      unit: 'Pulse Değeri (0-100)',
    },
    points: (() => {
      const pts: VoxelDataPoint[] = [];
      const gx = 12, gy = 12, gz = 8;
      for (let z = 0; z < gz; z++) {
        const depth = (z / (gz - 1)) * 4.0;
        for (let y = 0; y < gy; y++) {
          for (let x = 0; x < gx; x++) {
            // Background soil noise
            let val = 20 + Math.sin(x * 0.5) * 5 + Math.cos(y * 0.5) * 5 + (Math.random() * 6);
            
            // Artificial Chamber Cavity (Low value ~ 5-15) around center (x: 4..8, y: 4..8, z: 2..5)
            const dxC = x - 6;
            const dyC = y - 6;
            const dzC = z - 3.5;
            const distChamber = Math.sqrt(dxC * dxC + dyC * dyC + (dzC * 1.5) * (dzC * 1.5));
            if (distChamber < 2.5) {
              val = Math.max(4, 12 - (2.5 - distChamber) * 4);
            }

            // High Conductivity Metal Anomaly (High value ~ 85-98) inside cavity (x: 6, y: 6, z: 4)
            const dxM = x - 6.2;
            const dyM = y - 5.8;
            const dzM = z - 4.2;
            const distMetal = Math.sqrt(dxM * dxM + dyM * dyM + dzM * dzM);
            if (distMetal < 1.4) {
              val = Math.min(99, 88 + (1.4 - distMetal) * 8);
            }

            // Mineralized Stone Wall boundary
            if ((x === 3 || x === 9) && y >= 3 && y <= 9 && z >= 2 && z <= 5) {
              val = Math.max(val, 65 + Math.random() * 8);
            }

            let type: VoxelDataPoint['type'] = 'SOIL';
            if (val > 80) type = 'METAL';
            else if (val < 16) type = 'CAVITY';
            else if (val > 60) type = 'STRUCTURE';
            else if (val > 45) type = 'MINERAL';

            pts.push({ x, y, z: depth, value: Math.round(val), rawVal: val, type });
          }
        }
      }
      return pts;
    })(),
  },
  {
    name: 'Conrad GR-3 - Manyetik Gradiometre Tünel Analizi',
    deviceType: 'Conrad GR-3 Plus 3D Gradiometer',
    sourceType: 'CONRAD_GR3',
    gridX: 14,
    gridY: 10,
    gridZ: 6,
    stepSizeMeters: 0.6,
    maxDepthMeters: 3.6,
    metadata: {
      scanDate: '2026-09-18 10:15',
      operator: 'Arazi Ekibi Lideri',
      location: 'Uşak Karahallı Vadisi',
      unit: 'Manyetik Gradyan (nT)',
    },
    points: (() => {
      const pts: VoxelDataPoint[] = [];
      const gx = 14, gy = 10, gz = 6;
      for (let z = 0; z < gz; z++) {
        const depth = (z / (gz - 1)) * 3.6;
        for (let y = 0; y < gy; y++) {
          for (let x = 0; x < gx; x++) {
            let val = 30 + (Math.random() * 8);
            // Elongated Tunnel corridor across X axis at y=5, z=3
            const distTunnel = Math.sqrt((y - 5) * (y - 5) + (z - 2.8) * (z - 2.8));
            if (distTunnel < 1.8) {
              val = Math.max(5, 14 - (1.8 - distTunnel) * 5);
            }
            // Metal target near entrance
            if (Math.abs(x - 3) < 1 && Math.abs(y - 5) < 1 && Math.abs(z - 3) < 1) {
              val = 92;
            }
            pts.push({ x, y, z: depth, value: Math.round(val), rawVal: val });
          }
        }
      }
      return pts;
    })(),
  },
  {
    name: 'Lorenz Deepmax Z1 - Darbeli İndüksiyon Metal Taraması',
    deviceType: 'Lorenz Deepmax Z1 Pulse Induction',
    sourceType: 'LORENZ_DEEPMAX',
    gridX: 10,
    gridY: 10,
    gridZ: 6,
    stepSizeMeters: 0.4,
    maxDepthMeters: 2.4,
    metadata: {
      scanDate: '2026-09-20 16:45',
      operator: 'Metal Arama Birimi',
      location: 'Kırsal Parsel 88',
      unit: 'İndüksiyon Gecikmesi (µs)',
    },
    points: (() => {
      const pts: VoxelDataPoint[] = [];
      const gx = 10, gy = 10, gz = 6;
      for (let z = 0; z < gz; z++) {
        const depth = (z / (gz - 1)) * 2.4;
        for (let y = 0; y < gy; y++) {
          for (let x = 0; x < gx; x++) {
            let val = 15 + Math.random() * 6;
            // High metal target at (7, 3, z: 1.2m)
            const dM = Math.sqrt((x - 7) * (x - 7) + (y - 3) * (y - 3) + ((z - 3) * 0.8) ** 2);
            if (dM < 1.8) {
              val = 96 - dM * 20;
            }
            pts.push({ x, y, z: depth, value: Math.round(val), rawVal: val });
          }
        }
      }
      return pts;
    })(),
  },
];

interface VoxlerInspectorProps {
  isProUser?: boolean;
  onUpgradePrompt?: () => void;
  isEmbeddedInProfile?: boolean;
}

export const VoxlerDeviceScanInspector: React.FC<VoxlerInspectorProps> = ({
  isProUser = true,
  onUpgradePrompt,
  isEmbeddedInProfile = true,
}) => {
  const [selectedDataset, setSelectedDataset] = useState<VoxlerDataset>(PRESET_VOXLER_SCANS[0]);
  const [viewMode, setViewMode] = useState<'3D_VOXEL' | 'ISOSURFACE' | 'ORTHO_SLICE' | 'RAW_TABLE'>('3D_VOXEL');
  const [colorMap, setColorMap] = useState<'VOXLER_CLASSIC' | 'TURBO' | 'THERMAL' | 'BIPOLAR' | 'RESISTIVITY'>('VOXLER_CLASSIC');
  
  // 3D Orbit & Camera state
  const [rotationX, setRotationX] = useState<number>(28); // Pitch in degrees
  const [rotationY, setRotationY] = useState<number>(-45); // Yaw in degrees
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Slicer & Threshold Filters
  const [thresholdMin, setThresholdMin] = useState<number>(0);
  const [thresholdMax, setThresholdMax] = useState<number>(100);
  const [slicePlaneZ, setSlicePlaneZ] = useState<number>(2.0); // Z Depth in meters
  const [slicePlaneX, setSlicePlaneX] = useState<number>(6);   // X Grid Line
  const [slicePlaneY, setSlicePlaneY] = useState<number>(6);   // Y Grid Line
  const [sliceOrientation, setSliceOrientation] = useState<'XY' | 'XZ' | 'YZ'>('XY');
  const [voxelSize, setVoxelSize] = useState<number>(14);
  const [showGridCage, setShowGridCage] = useState<boolean>(true);
  const [showAnomalyLabels, setShowAnomalyLabels] = useState<boolean>(true);
  const [isolateCavityMetal, setIsolateCavityMetal] = useState<boolean>(false);

  // CSV Import State
  const [csvInputText, setCsvInputText] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Selected Voxel Probe Inspector
  const [inspectedVoxel, setInspectedVoxel] = useState<VoxelDataPoint | null>(null);

  // Color mapper helper
  const getVoxelColor = (val: number, alpha: number = 1.0) => {
    const t = Math.max(0, Math.min(100, val)) / 100;

    switch (colorMap) {
      case 'VOXLER_CLASSIC':
        // Voxler standard: Deep Blue (Cavity 0-25) -> Cyan -> Green (Soil 40-60) -> Yellow -> Red/Magenta (Metal 80-100)
        if (t < 0.25) {
          const ratio = t / 0.25;
          return `rgba(${Math.round(20 * (1 - ratio))}, ${Math.round(80 * ratio + 30)}, ${Math.round(220 + 35 * ratio)}, ${alpha})`;
        } else if (t < 0.55) {
          const ratio = (t - 0.25) / 0.3;
          return `rgba(${Math.round(30 + 120 * ratio)}, ${Math.round(180 + 50 * (1 - ratio))}, ${Math.round(100 * (1 - ratio))}, ${alpha})`;
        } else if (t < 0.8) {
          const ratio = (t - 0.55) / 0.25;
          return `rgba(${Math.round(220 + 35 * ratio)}, ${Math.round(180 - 60 * ratio)}, ${Math.round(20)}, ${alpha})`;
        } else {
          const ratio = (t - 0.8) / 0.2;
          return `rgba(${Math.round(240 + 15 * ratio)}, ${Math.round(30 + 30 * ratio)}, ${Math.round(80 + 140 * ratio)}, ${alpha})`;
        }

      case 'THERMAL':
        // Black -> Red -> Orange -> Yellow -> White
        if (t < 0.3) {
          return `rgba(${Math.round(t / 0.3 * 180)}, 10, 20, ${alpha})`;
        } else if (t < 0.7) {
          const ratio = (t - 0.3) / 0.4;
          return `rgba(235, ${Math.round(ratio * 180)}, 20, ${alpha})`;
        } else {
          const ratio = (t - 0.7) / 0.3;
          return `rgba(255, 230, ${Math.round(ratio * 255)}, ${alpha})`;
        }

      case 'BIPOLAR':
        // Magnetometer +/- Dipole (Blue -> Grey -> Red)
        if (t < 0.5) {
          const ratio = t / 0.5;
          return `rgba(40, ${Math.round(80 + 100 * ratio)}, ${Math.round(240 * (1 - ratio * 0.3))}, ${alpha})`;
        } else {
          const ratio = (t - 0.5) / 0.5;
          return `rgba(${Math.round(180 + 75 * ratio)}, ${Math.round(160 * (1 - ratio))}, ${Math.round(50 * (1 - ratio))}, ${alpha})`;
        }

      case 'RESISTIVITY':
        // High Conductance (Blue) -> Medium (Green/Brown) -> High Resistive Rock (Magenta/Red)
        return `rgba(${Math.round(t * 240)}, ${Math.round((1 - Math.abs(t - 0.5) * 2) * 200)}, ${Math.round((1 - t) * 240)}, ${alpha})`;

      case 'TURBO':
      default:
        // Google Turbo
        if (t < 0.25) return `rgba(48, 18, 59, ${alpha})`;
        if (t < 0.5) return `rgba(26, 228, 182, ${alpha})`;
        if (t < 0.75) return `rgba(251, 180, 26, ${alpha})`;
        return `rgba(228, 70, 10, ${alpha})`;
    }
  };

  // Filtered dataset points based on threshold and isolated filters
  const filteredPoints = useMemo(() => {
    return selectedDataset.points.filter((pt) => {
      if (isolateCavityMetal) {
        // Isolate strong cavities (val <= 18) or strong metals/structures (val >= 75)
        if (pt.value > 18 && pt.value < 75) return false;
      }
      return pt.value >= thresholdMin && pt.value <= thresholdMax;
    });
  }, [selectedDataset, thresholdMin, thresholdMax, isolateCavityMetal]);

  // Statistical summary of scan
  const stats = useMemo(() => {
    const pts = selectedDataset.points;
    if (pts.length === 0) return { min: 0, max: 100, avg: 50, metalCount: 0, cavityCount: 0, anomalyVolM3: 0 };

    let min = 1000, max = -1000, sum = 0;
    let metalCount = 0, cavityCount = 0;

    pts.forEach((p) => {
      if (p.value < min) min = p.value;
      if (p.value > max) max = p.value;
      sum += p.value;
      if (p.value >= 78) metalCount++;
      if (p.value <= 16) cavityCount++;
    });

    const voxelVol = (selectedDataset.stepSizeMeters ** 2) * (selectedDataset.maxDepthMeters / selectedDataset.gridZ);
    const anomalyVolM3 = ((metalCount + cavityCount) * voxelVol).toFixed(2);

    return {
      min: Math.round(min),
      max: Math.round(max),
      avg: Math.round(sum / pts.length),
      metalCount,
      cavityCount,
      anomalyVolM3,
      totalPoints: pts.length,
    };
  }, [selectedDataset]);

  // 3D Canvas Projection & Rendering
  useEffect(() => {
    if (viewMode !== '3D_VOXEL' && viewMode !== 'ISOSURFACE') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Coordinate Center
    const cx = width / 2;
    const cy = height / 2 + 10;

    // Convert angles to radians
    const radX = (rotationX * Math.PI) / 180;
    const radY = (rotationY * Math.PI) / 180;

    const cosX = Math.cos(radX), sinX = Math.sin(radX);
    const cosY = Math.cos(radY), sinY = Math.sin(radY);

    const gx = selectedDataset.gridX;
    const gy = selectedDataset.gridY;
    const gz = selectedDataset.gridZ;
    const scale = (Math.min(width, height) / Math.max(gx, gy, gz * 1.5)) * 0.75 * zoom;

    // 3D Point projection function
    const project = (x: number, y: number, z: number) => {
      // Center coordinates around (0,0,0)
      const nx = (x - gx / 2) * scale;
      const ny = (y - gy / 2) * scale;
      const nz = (z - gz / 2) * scale * 1.2;

      // Rotate around Y axis (Yaw)
      const x1 = nx * cosY + ny * sinY;
      const y1 = -nx * sinY + ny * cosY;
      const z1 = nz;

      // Rotate around X axis (Pitch)
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      return {
        px: cx + x2,
        py: cy + y2,
        depthOrder: z2,
      };
    };

    // 1. Draw 3D Grid Cage / Bounding Box (Voxler Style)
    if (showGridCage) {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      const corners = [
        [0, 0, 0], [gx, 0, 0], [gx, gy, 0], [0, gy, 0], // Top surface
        [0, 0, gz], [gx, 0, gz], [gx, gy, gz], [0, gy, gz], // Bottom depth
      ];

      const projCorners = corners.map(([x, y, z]) => project(x, y, z));

      // Draw Top & Bottom rectangles
      const drawBoxLoop = (indices: number[]) => {
        ctx.beginPath();
        ctx.moveTo(projCorners[indices[0]].px, projCorners[indices[0]].py);
        for (let i = 1; i < indices.length; i++) {
          ctx.lineTo(projCorners[indices[i]].px, projCorners[indices[i]].py);
        }
        ctx.closePath();
        ctx.stroke();
      };

      drawBoxLoop([0, 1, 2, 3]);
      drawBoxLoop([4, 5, 6, 7]);

      // Connect 4 vertical pillars
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(projCorners[i].px, projCorners[i].py);
        ctx.lineTo(projCorners[i + 4].px, projCorners[i + 4].py);
        ctx.stroke();
      }

      ctx.setLineDash([]);

      // Axis Metric Labels
      ctx.font = '9px monospace';
      ctx.fillStyle = '#38bdf8';
      const originProj = project(0, 0, 0);
      const xEndProj = project(gx, 0, 0);
      const yEndProj = project(0, gy, 0);
      const zEndProj = project(0, 0, gz);

      ctx.fillText(`X: ${(gx * selectedDataset.stepSizeMeters).toFixed(1)}m`, xEndProj.px + 4, xEndProj.py);
      ctx.fillText(`Y: ${(gy * selectedDataset.stepSizeMeters).toFixed(1)}m`, yEndProj.px + 4, yEndProj.py);
      ctx.fillText(`Z: -${selectedDataset.maxDepthMeters.toFixed(1)}m`, zEndProj.px + 4, zEndProj.py);
    }

    // 2. Sort & Render Voxels / Points from Back to Front
    const renderedList = filteredPoints.map((pt) => {
      // Map z depth in meters back to grid layer index
      const zIdx = (pt.z / selectedDataset.maxDepthMeters) * (gz - 1);
      const proj = project(pt.x, pt.y, zIdx);
      return {
        ...pt,
        zIdx,
        px: proj.px,
        py: proj.py,
        depthOrder: proj.depthOrder,
      };
    });

    // Sort by depthOrder for correct painter's algorithm rendering
    renderedList.sort((a, b) => a.depthOrder - b.depthOrder);

    renderedList.forEach((pt) => {
      const isHighAnomaly = pt.value > 80 || pt.value < 15;
      const alpha = isHighAnomaly ? 0.95 : Math.max(0.18, (pt.value / 100) * 0.6);
      const color = getVoxelColor(pt.value, alpha);
      const r = (voxelSize / 10) * scale * 0.35;

      if (viewMode === 'ISOSURFACE') {
        // Isosurface Mode: Render only anomaly cores with connected volumetric aura
        if (pt.value >= 75 || pt.value <= 18) {
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, r * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.shadowColor = pt.value > 75 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(6, 182, 212, 0.8)';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else {
        // 3D Voxel Cube / Bubble Mode
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, Math.max(2, r), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // White core highlight for high metal
        if (pt.value >= 88) {
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, Math.max(1, r * 0.4), 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }

      // Anomaly Label Pins
      if (showAnomalyLabels && (pt.value >= 90 || pt.value <= 8)) {
        ctx.fillStyle = pt.value >= 90 ? '#f87171' : '#38bdf8';
        ctx.font = 'bold 8px monospace';
        const lbl = pt.value >= 90 ? `M:${pt.value}` : `C:${pt.value}`;
        ctx.fillText(lbl, pt.px + r + 2, pt.py - 2);
      }
    });

    // Highlight inspected voxel
    if (inspectedVoxel) {
      const zIdx = (inspectedVoxel.z / selectedDataset.maxDepthMeters) * (gz - 1);
      const proj = project(inspectedVoxel.x, inspectedVoxel.y, zIdx);
      ctx.beginPath();
      ctx.arc(proj.px, proj.py, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [
    viewMode,
    filteredPoints,
    rotationX,
    rotationY,
    zoom,
    colorMap,
    voxelSize,
    showGridCage,
    showAnomalyLabels,
    selectedDataset,
    inspectedVoxel,
  ]);

  // Handle Mouse Drag for 3D Orbiting
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotationY((prev) => (prev + dx * 0.8) % 360);
    setRotationX((prev) => Math.max(-85, Math.min(85, prev - dy * 0.8)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Parse Raw CSV/TXT String into Voxler Dataset
  const handleParseCsvData = () => {
    setImportError(null);
    setImportSuccess(null);

    if (!csvInputText.trim()) {
      setImportError('Lütfen CSV veya TXT verisi yapıştırınız veya dosya seçiniz.');
      return;
    }

    try {
      const lines = csvInputText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      const points: VoxelDataPoint[] = [];

      let maxX = 0, maxY = 0, maxZ = 0;

      lines.forEach((line, idx) => {
        // Skip header if contains words
        if (idx === 0 && /[a-zA-Z]/.test(line)) return;

        // Split by comma, semicolon, tab or space
        const parts = line.split(/[,;\t\s]+/).map((p) => parseFloat(p.trim())).filter((n) => !isNaN(n));
        
        if (parts.length >= 3) {
          // Format 1: X, Y, Value (2D slice) or X, Y, Z, Value
          let x = 0, y = 0, z = 0, val = 0;
          if (parts.length >= 4) {
            x = Math.round(parts[0]);
            y = Math.round(parts[1]);
            z = parts[2];
            val = parts[3];
          } else {
            x = Math.round(parts[0]);
            y = Math.round(parts[1]);
            val = parts[2];
            z = 1.0;
          }

          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          if (z > maxZ) maxZ = z;

          // Normalize val to 0..100 if raw pulse is large
          const normVal = Math.max(0, Math.min(100, val));
          points.push({ x, y, z, value: normVal, rawVal: val });
        }
      });

      if (points.length < 4) {
        throw new Error('Geçerli veri satırı bulunamadı. Format: X, Y, Z (Derinlik), Değer (Pulse)');
      }

      const newDataset: VoxlerDataset = {
        name: `Özel CSV Çekimi (${points.length} Nokta)`,
        deviceType: 'Kullanıcı İçe Aktarılan CSV / CVS Cihaz Kaydı',
        sourceType: 'CUSTOM_CSV',
        gridX: Math.max(8, maxX + 1),
        gridY: Math.max(8, maxY + 1),
        gridZ: Math.max(4, Math.ceil(maxZ) + 1),
        stepSizeMeters: 0.5,
        maxDepthMeters: Math.max(2.0, maxZ),
        points,
        metadata: {
          scanDate: new Date().toLocaleString('tr-TR'),
          operator: 'Aktif Kullanıcı',
          location: 'Özel Veri Seti',
          unit: 'Ölçülen Sinyal',
        },
      };

      setSelectedDataset(newDataset);
      sound.playAnomalyDiscovered();
      setImportSuccess(`✅ ${points.length} adet 3B jeofizik ölçüm noktası başarıyla modellendi!`);
      setTimeout(() => setIsImportModalOpen(false), 1200);
    } catch (err: any) {
      setImportError(err.message || 'CSV biçimlendirme hatası.');
      sound.playScanBeep();
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvInputText(text);
      sound.playScanBeep();
    };
    reader.readAsText(file);
  };

  // Export current Voxler scene as PNG image
  const handleExportImage = () => {
    sound.playRadarSwathSweep();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `TerraScan_Voxler_3D_Scan_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="w-full bg-slate-950 border border-purple-500/40 rounded-2xl overflow-hidden shadow-2xl font-sans text-slate-200">
      
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border-b border-purple-500/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Box className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-purple-300 uppercase font-mono">
                VOXLER 3B JEOFİZİK CİHAZ ÇEKİMİ İNCELEME
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm">
                ⭐ PRO SÜRÜM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              GPR, Gradiometre & EM cihazlarının CSV / CVS grid ölçümlerini 3B Voxel, İzosörfıs ve Kesit olarak modeller.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-400/50 text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>CSV / Cihaz Çekimi Yükle</span>
          </button>

          <button
            type="button"
            onClick={handleExportImage}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="3B Görüntüyü PNG Olarak İndir"
          >
            <Download className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Preset Cihaz Çekimleri Seçim Şeridi */}
      <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
          ÖRNEK SAHA ÇEKİMLERİ:
        </span>
        {PRESET_VOXLER_SCANS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              sound.playAnomalyDiscovered();
              setSelectedDataset(preset);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono shrink-0 transition-all cursor-pointer border ${
              selectedDataset.name === preset.name
                ? 'bg-purple-600/30 border-purple-400 text-purple-200 font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {preset.sourceType === 'OKM_ROVER' && '📡 OKM Rover C4'}
            {preset.sourceType === 'CONRAD_GR3' && '🧲 Conrad GR-3'}
            {preset.sourceType === 'LORENZ_DEEPMAX' && '⚡ Lorenz Z1'}
          </button>
        ))}
      </div>

      {/* Main Workbench Layout: 3D Viewport + Analysis Dock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[460px]">
        
        {/* Left/Center: 3D Canvas / Ortho Slicer (Col 8) */}
        <div className="lg:col-span-8 p-3 sm:p-4 bg-slate-950/90 flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-r border-slate-800">
          
          {/* View Mode Switcher Pills */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setViewMode('3D_VOXEL');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === '3D_VOXEL'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3B Voxel Hacim
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setViewMode('ISOSURFACE');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'ISOSURFACE'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              İzosörfıs (Aura)
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setViewMode('ORTHO_SLICE');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'ORTHO_SLICE'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              OrthoSlice (Kesit)
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setViewMode('RAW_TABLE');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'RAW_TABLE'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Grid Tablosu
            </button>
          </div>

          {/* 3D Camera Controls Info & Reset */}
          {(viewMode === '3D_VOXEL' || viewMode === 'ISOSURFACE') && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRotationX(28);
                  setRotationY(-45);
                  setZoom(1.0);
                  sound.playScanBeep();
                }}
                className="px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-cyan-300 hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer"
                title="Açıyı Sıfırla"
              >
                <RotateCw className="w-3 h-3" />
                <span>Sıfırla</span>
              </button>
            </div>
          )}

          {/* View 1 & 2: 3D Voxel / Isosurface Canvas */}
          {(viewMode === '3D_VOXEL' || viewMode === 'ISOSURFACE') && (
            <div className="relative w-full max-w-[560px] aspect-square flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={560}
                height={560}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-full h-full cursor-grab active:cursor-grabbing select-none"
              />

              {/* Interactive Rotate Hint */}
              <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-500 pointer-events-none flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-purple-400 animate-spin" style={{ animationDuration: '8s' }} />
                <span>Döndürmek için fareyle sürükleyin · Pitch: {Math.round(rotationX)}° Yaw: {Math.round(rotationY)}°</span>
              </div>
            </div>
          )}

          {/* View 3: OrthoSlice 2D Geophysical Cross-Section Plane */}
          {viewMode === 'ORTHO_SLICE' && (
            <div className="w-full max-w-lg space-y-4 py-4">
              <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-300 font-bold">ORTHOSLICE KESİT DÜZLEMİ</span>
                  <div className="flex items-center gap-1">
                    {(['XY', 'XZ', 'YZ'] as const).map((orient) => (
                      <button
                        key={orient}
                        type="button"
                        onClick={() => {
                          sound.playScanBeep();
                          setSliceOrientation(orient);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sliceOrientation === orient
                            ? 'bg-cyan-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {orient} Düzlemi
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slicer Slider */}
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>
                      {sliceOrientation === 'XY' && `Z Derinlik Düzlemi: -${slicePlaneZ.toFixed(1)} Metre`}
                      {sliceOrientation === 'XZ' && `Y Profil Hattı: Hat #${slicePlaneY}`}
                      {sliceOrientation === 'YZ' && `X Profil Hattı: Hat #${slicePlaneX}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={sliceOrientation === 'XY' ? '0' : '0'}
                    max={
                      sliceOrientation === 'XY' 
                        ? selectedDataset.maxDepthMeters.toString() 
                        : (sliceOrientation === 'XZ' ? (selectedDataset.gridY - 1).toString() : (selectedDataset.gridX - 1).toString())
                    }
                    step={sliceOrientation === 'XY' ? '0.2' : '1'}
                    value={
                      sliceOrientation === 'XY' 
                        ? slicePlaneZ 
                        : (sliceOrientation === 'XZ' ? slicePlaneY : slicePlaneX)
                    }
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (sliceOrientation === 'XY') setSlicePlaneZ(v);
                      else if (sliceOrientation === 'XZ') setSlicePlaneY(Math.round(v));
                      else setSlicePlaneX(Math.round(v));
                    }}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 2D Raster Matrix Slice Preview */}
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center">
                  <div 
                    className="grid gap-0.5 p-1 bg-black rounded-lg border border-slate-800"
                    style={{
                      gridTemplateColumns: `repeat(${selectedDataset.gridX}, minmax(0, 1fr))`,
                    }}
                  >
                    {selectedDataset.points
                      .filter((p) => {
                        if (sliceOrientation === 'XY') {
                          return Math.abs(p.z - slicePlaneZ) < (selectedDataset.maxDepthMeters / selectedDataset.gridZ);
                        }
                        if (sliceOrientation === 'XZ') return p.y === slicePlaneY;
                        return p.x === slicePlaneX;
                      })
                      .map((pt, i) => (
                        <div
                          key={i}
                          onClick={() => setInspectedVoxel(pt)}
                          className="w-5 h-5 rounded-xs flex items-center justify-center text-[7px] font-mono cursor-pointer hover:scale-125 transition-transform"
                          style={{
                            backgroundColor: getVoxelColor(pt.value, 0.9),
                            color: pt.value > 80 || pt.value < 20 ? '#ffffff' : '#000000',
                          }}
                          title={`(${pt.x}, ${pt.y}) Derinlik: ${pt.z.toFixed(1)}m Değer: ${pt.value}`}
                        >
                          {pt.value >= 85 ? '⚡' : (pt.value <= 15 ? '🕳️' : '')}
                        </div>
                      ))}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-2">
                    Kutu üzerine tıklayarak noktasal değer ve anomali türünü inceleyebilirsiniz.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View 4: Raw CSV Grid Data Table */}
          {viewMode === 'RAW_TABLE' && (
            <div className="w-full max-h-[380px] overflow-auto rounded-xl border border-slate-800 bg-slate-900/90 text-xs font-mono">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-950 text-cyan-300 border-b border-slate-800">
                  <tr>
                    <th className="p-2"># İndeks</th>
                    <th className="p-2">X (Grid / Metre)</th>
                    <th className="p-2">Y (Grid / Metre)</th>
                    <th className="p-2">Z (Derinlik m)</th>
                    <th className="p-2">Pulse / nT</th>
                    <th className="p-2">Sınıflandırma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {selectedDataset.points.slice(0, 100).map((pt, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50">
                      <td className="p-2 text-slate-500">{idx + 1}</td>
                      <td className="p-2">{pt.x} ({(pt.x * selectedDataset.stepSizeMeters).toFixed(1)}m)</td>
                      <td className="p-2">{pt.y} ({(pt.y * selectedDataset.stepSizeMeters).toFixed(1)}m)</td>
                      <td className="p-2 text-cyan-400">-{pt.z.toFixed(2)}m</td>
                      <td className="p-2 font-bold" style={{ color: getVoxelColor(pt.value) }}>
                        {pt.value}
                      </td>
                      <td className="p-2">
                        {pt.value >= 80 && <span className="text-red-400 font-bold">İletken Metal</span>}
                        {pt.value <= 16 && <span className="text-blue-400 font-bold">Yapısal Boşluk</span>}
                        {pt.value > 16 && pt.value < 80 && <span className="text-slate-400">Zemin / Toprak</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedDataset.points.length > 100 && (
                <div className="p-2 text-center text-slate-500 bg-slate-950">
                  ... Toplam {selectedDataset.points.length} veri noktasından ilk 100 satır listeleniyor.
                </div>
              )}
            </div>
          )}

          {/* Bottom Colormap Legend Bar */}
          <div className="w-full max-w-[560px] mt-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold">RENK SKALASI:</span>
              <div 
                className="w-28 sm:w-36 h-2 rounded border border-slate-700"
                style={{
                  background: colorMap === 'VOXLER_CLASSIC' 
                    ? 'linear-gradient(to right, #1450dc, #1ae4b6, #e4b414, #e61e14, #f0288c)'
                    : 'linear-gradient(to right, #000000, #ff1414, #ffb400, #ffffff)'
                }}
              />
              <span className="text-[10px] text-slate-400">0 (Boşluk) → 100 (Metal)</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="text-cyan-400">Boyut: {selectedDataset.gridX}×{selectedDataset.gridY}×{selectedDataset.gridZ}</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400">Nokta: {selectedDataset.points.length}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Voxler Parameter Dock & Anomaly Telemetry (Col 4) */}
        <div className="lg:col-span-4 p-4 bg-slate-900/80 space-y-4 overflow-y-auto max-h-[580px] lg:max-h-none text-xs font-mono">
          
          {/* Cihaz Bilgisi Kartı */}
          <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-purple-300 font-bold">
              <span className="text-[11px] uppercase">{selectedDataset.deviceType}</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-200 text-[9px]">
                3B GRID
              </span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-0.5">
              <div className="flex justify-between">
                <span>Tarih & Saat:</span>
                <span className="text-slate-200">{selectedDataset.metadata.scanDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Saha / Operatör:</span>
                <span className="text-slate-200">{selectedDataset.metadata.operator}</span>
              </div>
              <div className="flex justify-between">
                <span>Maksimum Derinlik:</span>
                <span className="text-cyan-300 font-bold">{selectedDataset.maxDepthMeters.toFixed(1)} Metre</span>
              </div>
            </div>
          </div>

          {/* Jeofizik Anomali İstatistikleri */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              JEOFİZİK ANOMALİ TELEMETRİSİ
            </span>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-red-950/40 border border-red-500/30">
                <div className="text-red-400 text-[9px] uppercase">İletken Metal</div>
                <div className="text-base font-black text-red-300">{stats.metalCount} Nokta</div>
                <div className="text-[9px] text-slate-400">Sinyal: %78 - %100</div>
              </div>

              <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
                <div className="text-cyan-400 text-[9px] uppercase">Yapısal Boşluk</div>
                <div className="text-base font-black text-cyan-300">{stats.cavityCount} Nokta</div>
                <div className="text-[9px] text-slate-400">Sinyal: %0 - %16</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-slate-300 text-[11px]">
              <span>Tahmini Anomali Hacmi:</span>
              <span className="text-amber-400 font-bold font-mono">~{stats.anomalyVolM3} m³</span>
            </div>
          </div>

          {/* Voxler Renk Paleti Seçici */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              VOXLER RENK TRANSFER FONKSİYONU
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'VOXLER_CLASSIC', label: 'Voxler GPR / Manyetik' },
                { id: 'THERMAL', label: 'Termal / Isı' },
                { id: 'BIPOLAR', label: 'Manyetik Dipol (+/-)' },
                { id: 'RESISTIVITY', label: 'Rezistivite / Ohm' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    sound.playScanBeep();
                    setColorMap(p.id as any);
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                    colorMap === p.id
                      ? 'bg-purple-600/30 border-purple-400 text-purple-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sinyal Eşik Değeri Filtresi (Gürültü Ayıklama) */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
              <span>SİNYAL EŞİK DEĞERİ (THRESHOLD)</span>
              <span className="text-purple-300 font-mono">%{thresholdMin} - %{thresholdMax}</span>
            </div>
            <div className="space-y-1.5">
              <input
                type="range"
                min="0"
                max="60"
                value={thresholdMin}
                onChange={(e) => setThresholdMin(parseInt(e.target.value, 10))}
                className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                title="Minimum Zemin Gürültüsü Filtresi"
              />
            </div>
          </div>

          {/* Voxel Boyutu & Yakınlaştırma */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>VOXEL ÇAPI</span>
                <span className="text-cyan-400">{voxelSize}px</span>
              </div>
              <input
                type="range"
                min="6"
                max="26"
                value={voxelSize}
                onChange={(e) => setVoxelSize(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>YAKINLAŞTIRMA</span>
                <span className="text-cyan-400">{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Görünüm Seçenekleri */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              FİLTRE & GÖRÜNÜM KATMANLARI
            </span>

            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setIsolateCavityMetal(!isolateCavityMetal);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                isolateCavityMetal
                  ? 'bg-purple-950 border-purple-400 text-purple-200 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span>Sadece Boşluk & Metalleri İyileştir</span>
              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                isolateCavityMetal ? 'bg-purple-500 border-purple-400 text-black' : 'border-slate-600'
              }`}>
                {isolateCavityMetal && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setShowGridCage(!showGridCage);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                showGridCage
                  ? 'bg-slate-800 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span>3B Koordinat Kafesi & Metraj</span>
              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                showGridCage ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-slate-600'
              }`}>
                {showGridCage && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* CSV / CVS Import Modal */}
      {isImportModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-slate-900 border border-purple-500/50 rounded-2xl p-5 shadow-2xl space-y-4 text-xs font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <Upload className="w-4 h-4 text-purple-400" />
                <span>CSV / CVS JEOFİZİK ÇEKİMİ İÇE AKTAR</span>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-slate-300 text-[11px]">
                OKM, Conrad, Lorenz, GPR veya rezistivite cihazınızdan dışa aktardığınız <code>.csv</code>, <code>.cvs</code> veya <code>.txt</code> dosyasını seçin veya ölçüm satırlarını yapıştırın.
              </p>

              {/* File input button */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.cvs,.txt,.dat"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-400/60 text-purple-200 font-bold flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Dosyadan Yükle (.csv / .txt)</span>
                </button>
                <span className="text-[10px] text-slate-400">Desteklenen: X, Y, Z, Değer</span>
              </div>

              {/* Textarea for pasting raw CSV */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                  VEYA VERİ METNİNİ YAPIŞTIRIN:
                </label>
                <textarea
                  rows={6}
                  value={csvInputText}
                  onChange={(e) => setCsvInputText(e.target.value)}
                  placeholder={`Örnek Format (X, Y, Z, Değer):\n0, 0, 1.0, 24\n1, 0, 1.0, 26\n2, 0, 1.0, 92\n0, 1, 1.5, 12`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-cyan-300 font-mono text-[11px] focus:outline-none focus:border-purple-400"
                />
              </div>

              {importError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleParseCsvData}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                <span>3B Modele Dönüştür & İncele</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
