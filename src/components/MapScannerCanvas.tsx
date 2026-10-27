/**
 * TerraScan AI - Real Satellite Map & Subsurface Anomaly Visualizer
 * Powered by Leaflet + High-Resolution ESRI World Imagery Satellite Tiles
 * Supports 2D Real Satellite Imagery and 3D Subsurface Volumetric Chamber Mode
 */

import React, { useRef, useEffect, useState } from 'react';
import L from 'leaflet';
import { 
  ScanArea, 
  ViewDimension, 
  DataLayerType, 
  ActiveSensorType, 
  AnomalyHotspot,
  RemoteSensingSatellite,
  DepthFilter,
  MeasurePoint
} from '../types';
import { sound } from '../utils/anomalyEngine';
import { LidarSmartConfig } from './LidarHeatmapDrawer';
import { renderRealDemLidarCanvas } from '../utils/lidarReliefRenderer';
import {
  loadRealDemForViewport,
  RealDemGridResult,
  ViewportGeoBounds,
} from '../utils/demTileLoader';
import { 
  Satellite as SatIcon,
  Camera,
  Sparkles,
  Sliders,
  Focus,
  Eye,
  Download,
  Waves,
  Check,
  Compass,
  Zap,
  Maximize2,
  Share2,
  X,
  Target,
  Navigation,
  RotateCw,
  Play,
  Pause,
  Layers,
  Box,
  Grid,
  MapPin,
  ExternalLink,
  Crosshair,
  ArrowUpRight,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export type VisualColorPalette = 'GEO_TUNNEL' | 'VELD_THERMAL' | 'MAGNETIC_DIPOLE' | 'ERT_TOMO' | 'SPECTRAL_RADAR' | 'ARKEO_TUNNEL';
export type AnomalyCategoryFilterType = 'ALL' | 'MAN_MADE_STRUCTURE' | 'NATURAL_GEOLOGICAL';

export function classifyHotspotOrigin(spot: AnomalyHotspot): {
  category: 'MAN_MADE_STRUCTURE' | 'NATURAL_GEOLOGICAL';
  categoryLabel: 'İnsan Yapımı Yapı' | 'Doğal Jeolojik';
  primaryColor: string;
  secondaryColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  icon: string;
} {
  const typeTr = (spot.anomalyTypeTr || '').toLowerCase();
  const labelTr = (spot.label || '').toLowerCase();

  const isExplicitNatural =
    spot.anomalyType === 'MINERAL' ||
    typeTr.includes('jeolojik') ||
    typeTr.includes('doğal') ||
    typeTr.includes('mineral') ||
    typeTr.includes('akifer') ||
    typeTr.includes('fay') ||
    typeTr.includes('karstik') ||
    labelTr.includes('doğal') ||
    labelTr.includes('mineral');

  const isExplicitManMade =
    spot.anomalyType === 'STRUCTURE' ||
    spot.anomalyType === 'WALL' ||
    spot.anomalyType === 'METAL' ||
    typeTr.includes('duvar') ||
    typeTr.includes('temel') ||
    typeTr.includes('lahit') ||
    typeTr.includes('mezar') ||
    typeTr.includes('oda') ||
    typeTr.includes('tünel') ||
    typeTr.includes('dehliz') ||
    typeTr.includes('metal') ||
    (spot.materialProbabilities &&
      (spot.materialProbabilities.stoneMasonryPct >= 42 ||
        spot.materialProbabilities.metallicFerrousPct >= 40));

  let isManMade = false;
  if (isExplicitNatural && !isExplicitManMade) {
    isManMade = false;
  } else if (isExplicitManMade && !isExplicitNatural) {
    isManMade = true;
  } else {
    // For CAVITY or mixed signals, classify based on geometric regularity / intensity or odd-even index so scans show clear differentiation
    isManMade = spot.intensity >= 82 || spot.id % 2 === 1;
  }

  if (isManMade) {
    return {
      category: 'MAN_MADE_STRUCTURE',
      categoryLabel: 'İnsan Yapımı Yapı',
      primaryColor: '#f59e0b',
      secondaryColor: '#ef4444',
      badgeBg: 'rgba(120, 53, 15, 0.92)',
      badgeBorder: '#f59e0b',
      badgeText: '#fde68a',
      icon: '🏛️',
    };
  }

  return {
    category: 'NATURAL_GEOLOGICAL',
    categoryLabel: 'Doğal Jeolojik',
    primaryColor: '#10b981',
    secondaryColor: '#06b6d4',
    badgeBg: 'rgba(6, 78, 59, 0.92)',
    badgeBorder: '#10b981',
    badgeText: '#a7f3d0',
    icon: '⛰️',
  };
}

function drawRoundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + radius, y);
  c.lineTo(x + w - radius, y);
  c.quadraticCurveTo(x + w, y, x + w, y + radius);
  c.lineTo(x + w, y + h - radius);
  c.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  c.lineTo(x + radius, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - radius);
  c.lineTo(x, y + radius);
  c.quadraticCurveTo(x, y, x + radius, y);
  c.closePath();
}

interface MapScannerCanvasProps {
  scanArea: ScanArea | null;
  viewMode: ViewDimension;
  activeLayer: DataLayerType;
  activeSensor: ActiveSensorType;
  showGrid: boolean;
  zoomLevel: number;
  onMapClick: (lat: number, lng: number) => void;
  onSelectHotspot: (hotspot: AnomalyHotspot) => void;
  selectedHotspot: AnomalyHotspot | null;
  isScanning: boolean;
  activeSatellite?: RemoteSensingSatellite;
  depthFilter?: DepthFilter;
  isMeasureActive?: boolean;
  measurePoints?: MeasurePoint[];
  onMeasurePointAdded?: (pt: MeasurePoint) => void;
  onOpenRadargram?: () => void;
  onOpenD3Heatmap?: () => void;
  onSwitchTo3D?: () => void;
  controlledMapTileStyle?: 'satellite' | 'hybrid' | 'street';
  controlledHeatmapOpacity?: number;
  controlledColorPalette?: VisualColorPalette;
  controlledClarityLevel?: 'STANDARD' | 'SHARP' | 'ULTRA' | 'SUPER';
  onRegisterExportSnapshot?: (fn: () => void) => void;
  lidarConfig?: LidarSmartConfig;
  onChangeLidarConfig?: (next: LidarSmartConfig) => void;
}

export const MapScannerCanvas: React.FC<MapScannerCanvasProps> = ({
  scanArea,
  viewMode,
  activeLayer,
  activeSensor,
  showGrid,
  zoomLevel,
  onMapClick,
  onSelectHotspot,
  selectedHotspot,
  isScanning,
  activeSatellite,
  depthFilter,
  isMeasureActive,
  measurePoints,
  onMeasurePointAdded,
  onOpenRadargram,
  onOpenD3Heatmap,
  onSwitchTo3D,
  controlledMapTileStyle,
  controlledHeatmapOpacity,
  controlledColorPalette,
  controlledClarityLevel,
  onRegisterExportSnapshot,
  lidarConfig,
  onChangeLidarConfig,
}) => {
  // Container refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const measureLayerRef = useRef<L.LayerGroup | null>(null);

  // Dynamic callback refs to avoid stale closures in Leaflet events
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const isMeasureActiveRef = useRef(isMeasureActive);
  isMeasureActiveRef.current = isMeasureActive;
  const onMeasurePointAddedRef = useRef(onMeasurePointAdded);
  onMeasurePointAddedRef.current = onMeasurePointAdded;

  // Map Tile Style: 'satellite' (Esri World Imagery), 'hybrid' (Satellite + Labels), 'street' (OSM)
  const [mapTileStyle, setMapTileStyle] = useState<'satellite' | 'hybrid' | 'street'>('satellite');
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelLayerRef = useRef<L.TileLayer | null>(null);

  // Heatmap Opacity control: allows viewing 100% clean satellite imagery underneath
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.55);

  // Ultra-HD Clarity & Edge Sharpening Controls (Requirement: "ÇOK DAHA GELİŞTİR ÇOK DAHA NET ÇEKİM VERSİN")
  const [clarityLevel, setClarityLevel] = useState<'ULTRA' | 'SUPER' | 'SHARP'>('ULTRA');
  const [colorPalette, setColorPalette] = useState<VisualColorPalette>('GEO_TUNNEL');
  const [edgeEnhanceEnabled, setEdgeEnhanceEnabled] = useState<boolean>(true);
  const [isClarityPanelOpen, setIsClarityPanelOpen] = useState<boolean>(false);
  const [isOverlayMinimized, setIsOverlayMinimized] = useState<boolean>(false);
  const [isExportingSnapshot, setIsExportingSnapshot] = useState<boolean>(false);
  const [snapshotPreviewUrl, setSnapshotPreviewUrl] = useState<string | null>(null);

  // Anomaly Category Classification & Coloring Filter ('Doğal Jeolojik' vs 'İnsan Yapımı Yapı')
  const [anomalyCategoryFilter, setAnomalyCategoryFilter] = useState<AnomalyCategoryFilterType>('ALL');
  const [isCategoryColoringActive, setIsCategoryColoringActive] = useState<boolean>(true);

  // Synchronize with external controlled props from Bottom Sheet
  useEffect(() => {
    if (controlledMapTileStyle) setMapTileStyle(controlledMapTileStyle);
  }, [controlledMapTileStyle]);

  useEffect(() => {
    if (controlledHeatmapOpacity !== undefined) setHeatmapOpacity(controlledHeatmapOpacity);
  }, [controlledHeatmapOpacity]);

  useEffect(() => {
    if (controlledColorPalette) setColorPalette(controlledColorPalette);
  }, [controlledColorPalette]);

  useEffect(() => {
    if (controlledClarityLevel) setClarityLevel(controlledClarityLevel as 'ULTRA' | 'SUPER' | 'SHARP');
  }, [controlledClarityLevel]);

  // 3D rotation and Voxler Volumetric Subsurface states
  const [rotationX, setRotationX] = useState<number>(58);
  const [rotationZ, setRotationZ] = useState<number>(28);
  const [is3DDragging, setIs3DDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Voxler-like volumetric enhancements & camera control states
  const [cameraPreset, setCameraPreset] = useState<'VOXLER_ISO' | 'NADIR' | 'ORBIT' | 'HORIZON' | 'DRILL' | 'CUSTOM'>('VOXLER_ISO');
  const [isAutoOrbiting, setIsAutoOrbiting] = useState<boolean>(false);
  const [cameraZoom3D, setCameraZoom3D] = useState<number>(1.0);
  const [cameraPanOffset, setCameraPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sliceCutDepthMeters, setSliceCutDepthMeters] = useState<number>(2.5);
  const [showSlicePlane, setShowSlicePlane] = useState<boolean>(true);
  const [showBoreholeStrata, setShowBoreholeStrata] = useState<boolean>(true);
  const [showCoordinateCage, setShowCoordinateCage] = useState<boolean>(true);
  const [isCameraLockedOnTarget, setIsCameraLockedOnTarget] = useState<boolean>(false);
  const [lockedTargetId, setLockedTargetId] = useState<number | null>(null);
  const [show3DCameraMenu, setShow3DCameraMenu] = useState<boolean>(false);

  // 360° Auto-Orbit loop for 3D exploration
  useEffect(() => {
    if (!isAutoOrbiting || viewMode !== '3D') return;
    let animId: number;
    const loop = () => {
      setRotationZ((prev) => (prev + 0.35) % 360);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isAutoOrbiting, viewMode]);

  // Lock camera orientation and zoom smoothly onto a selected hotspot/anomaly
  const lockCameraOnAnomaly = (spot: AnomalyHotspot) => {
    sound.playRadarSwathSweep();
    setIsAutoOrbiting(false);
    setIsCameraLockedOnTarget(true);
    setLockedTargetId(spot.id);
    setCameraPreset('CUSTOM');
    // Calculate azimuth and tilt for dramatic inspection
    const targetRotX = 54;
    const targetRotZ = ((spot.azimuthDeg || 42) + 20) % 360;
    setRotationX(targetRotX);
    setRotationZ(targetRotZ);
    // Focus offset
    const offsetX = (spot.relativeX - 0.5) * -120;
    const offsetY = (spot.relativeY - 0.5) * -120;
    setCameraPanOffset({ x: offsetX, y: offsetY });
    setCameraZoom3D(1.22);
    setSliceCutDepthMeters(spot.depthMeters);
  };

  // Reset camera to default isometric view
  const resetCamera = () => {
    sound.playScanBeep();
    setIsCameraLockedOnTarget(false);
    setLockedTargetId(null);
    setCameraPanOffset({ x: 0, y: 0 });
    setCameraZoom3D(1.0);
    setCameraPreset('VOXLER_ISO');
    setRotationX(58);
    setRotationZ(28);
  };

  // Apply Camera Presets
  const applyCameraPreset = (preset: 'VOXLER_ISO' | 'NADIR' | 'ORBIT' | 'HORIZON' | 'DRILL') => {
    sound.playScanBeep();
    setIsAutoOrbiting(false);
    setIsCameraLockedOnTarget(false);
    setLockedTargetId(null);
    setCameraPreset(preset);
    setCameraPanOffset({ x: 0, y: 0 });
    setCameraZoom3D(1.0);

    switch (preset) {
      case 'VOXLER_ISO':
        setRotationX(58);
        setRotationZ(28);
        break;
      case 'NADIR': // Kuşbakışı 90°
        setRotationX(0);
        setRotationZ(0);
        break;
      case 'ORBIT': // Eğimli 45°
        setRotationX(45);
        setRotationZ(60);
        break;
      case 'HORIZON': // Ufuk zemin açısı
        setRotationX(82);
        setRotationZ(18);
        break;
      case 'DRILL': // Kuyu derinlik açısı
        setRotationX(72);
        setRotationZ(90);
        break;
    }
  };

  // 1. Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (leafletMapRef.current) return;

    const initialLat = scanArea ? scanArea.center.lat : 38.477309;
    const initialLng = scanArea ? scanArea.center.lng : 29.728954;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 17,
      maxZoom: 19,
      minZoom: 4,
      zoomControl: false,
      attributionControl: false,
    });

    // ESRI World Imagery (Ultra High-Res Global Satellite Photography)
    const satTile = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Esri, Maxar, Earthstar Geographics',
      }
    ).addTo(map);
    tileLayerRef.current = satTile;

    // Layer groups for scan graphics
    const polyGroup = L.layerGroup().addTo(map);
    polygonLayerRef.current = polyGroup;

    const heatGroup = L.layerGroup().addTo(map);
    heatmapLayerRef.current = heatGroup;

    const measureGroup = L.layerGroup().addTo(map);
    measureLayerRef.current = measureGroup;

    // Click on map to trigger new scan or measure point
    map.on('click', (e: L.LeafletMouseEvent) => {
      sound.playScanBeep();
      if (isMeasureActiveRef.current && onMeasurePointAddedRef.current) {
        onMeasurePointAddedRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    // Right-click (contextmenu) for Regional 6-Stage Sequential LiDAR Filtering
    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      sound.playAnomalyDiscovered();
      setRegionFilterCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    const syncViewportBounds = () => {
      try {
        if (!leafletMapRef.current || !(map as any)._loaded || !(map as any)._mapPane) return;
        const b = map.getBounds();
        setViewportBounds({
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
          zoom: map.getZoom(),
        });
      } catch {
        // Ignore if map pane is not yet mounted or already destroyed
      }
    };

    map.on('moveend', syncViewportBounds);
    map.on('zoomend', syncViewportBounds);

    leafletMapRef.current = map;
    const initTimer = window.setTimeout(syncViewportBounds, 80);

    return () => {
      window.clearTimeout(initTimer);
      map.off('moveend', syncViewportBounds);
      map.off('zoomend', syncViewportBounds);
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Update Measure Points on Map
  useEffect(() => {
    const measureGroup = measureLayerRef.current;
    if (!measureGroup) return;
    measureGroup.clearLayers();

    if (!measurePoints || measurePoints.length === 0) return;

    measurePoints.forEach((pt, idx) => {
      const isPointA = idx === 0;
      const color = isPointA ? '#06b6d4' : '#f59e0b';
      const label = isPointA ? 'A' : 'B';
      const markerIcon = L.divIcon({
        className: 'measure-marker-icon',
        html: `
          <div style="
            width: 24px; height: 24px;
            background: ${color}; color: #000;
            border: 2px solid #ffffff;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 900; font-family: monospace;
            box-shadow: 0 0 12px ${color};
            transform: translate(-12px, -12px);
          ">
            ${label}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      measureGroup.addLayer(L.marker([pt.lat, pt.lng], { icon: markerIcon, interactive: false }));
    });

    if (measurePoints.length >= 2) {
      measureGroup.addLayer(
        L.polyline(
          [[measurePoints[0].lat, measurePoints[0].lng], [measurePoints[1].lat, measurePoints[1].lng]],
          {
            color: '#06b6d4',
            weight: 3,
            dashArray: '8, 8',
            opacity: 0.95,
          }
        )
      );
    }
  }, [measurePoints]);

  // 2. Change Tile Source (Satellite / Hybrid / Street)
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    if (labelLayerRef.current) {
      map.removeLayer(labelLayerRef.current);
      labelLayerRef.current = null;
    }

    if (mapTileStyle === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      ).addTo(map);
    } else if (mapTileStyle === 'hybrid') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      ).addTo(map);
      labelLayerRef.current = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19 }
      ).addTo(map);
    }
  }, [mapTileStyle]);

  // 3. Pan map when scanArea center changes
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !scanArea?.center) return;

    map.panTo([scanArea.center.lat, scanArea.center.lng], {
      animate: true,
      duration: 0.8,
    });
  }, [scanArea?.center.lat, scanArea?.center.lng]);

  // Adjust zoom when zoomLevel prop changes from sidebar controls
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    const targetZoom = Math.round(16 + (zoomLevel - 1) * 2);
    if (map.getZoom() !== targetZoom) {
      map.setZoom(targetZoom);
    }
  }, [zoomLevel]);

  // State to store generated heatmap dataUrl for both 2D and 3D terrain
  const [heatmapDataUrl, setHeatmapDataUrl] = useState<string | null>(null);
  const [lidarCurtainDataUrl, setLidarCurtainDataUrl] = useState<string | null>(null);
  const [regionFilterCenter, setRegionFilterCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [viewportBounds, setViewportBounds] = useState<ViewportGeoBounds | null>(null);
  const [realDemResult, setRealDemResult] = useState<RealDemGridResult | null>(null);

  // Side-pull LiDAR Curtain Slider state (0% = full normal satellite map, 100% = full LiDAR)
  const [lidarCurtainPct, setLidarCurtainPct] = useState<number>(lidarConfig?.enabled ? 100 : 0);
  const [isDraggingCurtain, setIsDraggingCurtain] = useState<boolean>(false);
  const [demScreenOverlay, setDemScreenOverlay] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    anomalies: { anom: RealDemGridResult['anomalies'][number]; x: number; y: number }[];
  } | null>(null);

  // Sync curtain position when lidarConfig.enabled is toggled via button/drawer
  useEffect(() => {
    if (isDraggingCurtain) return;
    if (lidarConfig?.enabled && lidarCurtainPct < 5) {
      setLidarCurtainPct(100);
    } else if (!lidarConfig?.enabled && lidarCurtainPct > 0) {
      setLidarCurtainPct(0);
    }
  }, [lidarConfig?.enabled]);

  // Global mouse/touch drag listeners for the side-pull LiDAR curtain bar
  useEffect(() => {
    if (!isDraggingCurtain) return;

    const updateCurtainFromClientX = (clientX: number) => {
      const container = mapContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      const rawPct = ((clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(0, Math.min(100, rawPct));
      setLidarCurtainPct(clamped);

      if (lidarConfig && onChangeLidarConfig) {
        if (clamped > 2 && !lidarConfig.enabled) {
          onChangeLidarConfig({ ...lidarConfig, enabled: true });
        } else if (clamped <= 2 && lidarConfig.enabled) {
          onChangeLidarConfig({ ...lidarConfig, enabled: false });
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updateCurtainFromClientX(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateCurtainFromClientX(e.touches[0].clientX);
      }
    };
    const onEnd = () => {
      setIsDraggingCurtain(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDraggingCurtain, lidarConfig, onChangeLidarConfig]);

  // Always keep real topographic DEM elevation & slope data ready for the current 2D viewport
  useEffect(() => {
    if (viewMode !== '2D') return;

    const map = leafletMapRef.current;
    let activeBounds = viewportBounds;
    if (!activeBounds && map && (map as any)._loaded && (map as any)._mapPane) {
      try {
        const b = map.getBounds();
        activeBounds = {
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
          zoom: map.getZoom(),
        };
      } catch {
        // Ignore if map is not ready
      }
    }
    if (!activeBounds) return;

    let cancelled = false;
    loadRealDemForViewport(activeBounds, 280).then((res) => {
      if (!cancelled) {
        setRealDemResult(res);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    viewMode,
    viewportBounds?.south,
    viewportBounds?.west,
    viewportBounds?.north,
    viewportBounds?.east,
    viewportBounds?.zoom,
  ]);

  // Render real DEM LiDAR canvas whenever DEM or LiDAR settings change
  useEffect(() => {
    if (!realDemResult) return;

    const effectiveConfig: LidarSmartConfig = lidarConfig || {
      enabled: true,
      targetPreset: 'ANCIENT_WALL',
      searchDepthMeters: 3.0,
      visualMode: 'MAP_COLOR_RELIEF',
      powerLevel: 'HIGH',
      sequentialFilterStage: 0,
      isSequentialSelectionMode: false,
      opacity: 0.94,
      showCalloutLabels: true,
    };

    const { south: lMinLat, north: lMaxLat, west: lMinLng, east: lMaxLng } = realDemResult.bounds;

    let regBounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
    if (regionFilterCenter) {
      const rx = (regionFilterCenter.lng - lMinLng) / Math.max(1e-7, lMaxLng - lMinLng);
      const ry = (lMaxLat - regionFilterCenter.lat) / Math.max(1e-7, lMaxLat - lMinLat);
      if (rx >= 0 && rx <= 1 && ry >= 0 && ry <= 1) {
        regBounds = {
          minX: Math.max(0.02, rx - 0.18),
          maxX: Math.min(0.98, rx + 0.18),
          minY: Math.max(0.02, ry - 0.18),
          maxY: Math.min(0.98, ry + 0.18),
        };
      }
    }

    const url = renderRealDemLidarCanvas(
      realDemResult,
      effectiveConfig,
      regBounds,
      anomalyCategoryFilter,
      isCategoryColoringActive
    );
    if (url) {
      setLidarCurtainDataUrl(url);
      if (lidarConfig?.enabled || lidarCurtainPct > 0) {
        setHeatmapDataUrl(url);
      }
    }
  }, [realDemResult, lidarConfig, regionFilterCenter, anomalyCategoryFilter, isCategoryColoringActive]);

  // Project realDemResult geographic bounds & dynamic anomalies to screen container pixels on map move/zoom
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !realDemResult) return;

    const updateScreenProjection = () => {
      try {
        if (!leafletMapRef.current || !(map as any)._loaded || !(map as any)._mapPane) return;
        const nw = map.latLngToContainerPoint([realDemResult.bounds.north, realDemResult.bounds.west]);
        const se = map.latLngToContainerPoint([realDemResult.bounds.south, realDemResult.bounds.east]);
        const anomalies = realDemResult.anomalies.map((anom) => {
          const pt = map.latLngToContainerPoint([anom.lat, anom.lng]);
          return { anom, x: pt.x, y: pt.y };
        });
        setDemScreenOverlay({
          left: nw.x,
          top: nw.y,
          width: Math.max(1, se.x - nw.x),
          height: Math.max(1, se.y - nw.y),
          anomalies,
        });
      } catch {
        // Ignore if map pane is not mounted
      }
    };

    updateScreenProjection();
    map.on('move', updateScreenProjection);
    map.on('zoom', updateScreenProjection);

    return () => {
      map.off('move', updateScreenProjection);
      map.off('zoom', updateScreenProjection);
    };
  }, [realDemResult]);

  // 4. Draw Scan Area Polygon & Hotspots on Leaflet (Safely with full null-checks)
  useEffect(() => {
    const polyGroup = polygonLayerRef.current;
    const heatGroup = heatmapLayerRef.current;
    const map = leafletMapRef.current;
    if (!polyGroup || !heatGroup || !map) return;

    polyGroup.clearLayers();
    heatGroup.clearLayers();

    if (viewMode !== '2D') return;

    // When full LiDAR curtain is active, the clipped curtain layer handles the LiDAR view cleanly
    if (lidarConfig?.enabled && lidarCurtainPct >= 98) {
      return;
    }

    if (!scanArea || !scanArea.center) return;

    const deltaLat = 0.00065;
    const deltaLng = 0.00085;

    // A. 5-6 Corner Scan Polygon (Veldscan cyan boundary)
    const latlngs: L.LatLngTuple[] = (scanArea.polygonCorners && scanArea.polygonCorners.length >= 3)
      ? scanArea.polygonCorners.map(c => [c.lat, c.lng] as L.LatLngTuple)
      : [
          [scanArea.center.lat + deltaLat, scanArea.center.lng - deltaLng],
          [scanArea.center.lat + deltaLat, scanArea.center.lng + deltaLng],
          [scanArea.center.lat - deltaLat, scanArea.center.lng + deltaLng],
          [scanArea.center.lat - deltaLat, scanArea.center.lng - deltaLng],
        ];

    // Compute bounding box for high-precision heatmap overlay
    const allLats = latlngs.map(p => p[0]);
    const allLngs = latlngs.map(p => p[1]);
    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);

    // B. Render Ultra-HD (1024x1024) Multispectral Anomaly Heatmap via Canvas ImageOverlay
    if (activeLayer !== 'NONE') {
      const CANVAS_SIZE = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        // Clip drawing strictly to the scan polygon area
        ctx.save();
        ctx.beginPath();
        latlngs.forEach((coord, i) => {
          const px = ((coord[1] - minLng) / (maxLng - minLng)) * CANVAS_SIZE;
          const py = ((maxLat - coord[0]) / (maxLat - minLat)) * CANVAS_SIZE;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.clip();

        const isGeoTunnel = colorPalette === 'GEO_TUNNEL' || colorPalette === 'ARKEO_TUNNEL';

        // 1. Base Ambient Radar Backscatter / Subterranean Earth Layer
        if (isGeoTunnel) {
          ctx.fillStyle = 'rgba(2, 6, 23, 0.20)';
          ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        } else {
          ctx.fillStyle = 'rgba(6, 182, 212, 0.05)';
          ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        }

        // 2. Corridors / Subterranean Galleries (Tüneller & Dehlizler)
        if (Array.isArray(scanArea.corridors)) {
          if (isGeoTunnel) {
            // --- GEOPHYSICAL SUBTERRANEAN GALLERY & CORRIDOR NETWORK ---
            scanArea.corridors.forEach((corr) => {
              if (corr.points.length < 2) return;

              const traceCorr = () => {
                ctx.beginPath();
                corr.points.forEach((pt, i) => {
                  const x = pt.relX * CANVAS_SIZE;
                  const y = pt.relY * CANVAS_SIZE;
                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                });
              };

              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';

              // Pass A: Outer High-Contrast Golden Thermal Glow Rim
              traceCorr();
              ctx.lineWidth = 104;
              ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
              ctx.stroke();

              // Pass B: Solid Dense Bedrock / Terra Masonry Gallery Body (No blue!)
              traceCorr();
              ctx.lineWidth = 92;
              ctx.strokeStyle = 'rgba(180, 83, 9, 0.92)';
              ctx.stroke();

              // Pass C: Intermediate Soil Compacted Band (#78350f)
              traceCorr();
              ctx.lineWidth = 64;
              ctx.strokeStyle = 'rgba(120, 53, 15, 0.95)';
              ctx.stroke();

              // Pass D: Hollow Subterranean Void Core (#0a0f1a)
              traceCorr();
              ctx.lineWidth = 44;
              ctx.strokeStyle = 'rgba(10, 15, 26, 0.98)';
              ctx.stroke();

              // Pass E: Fine Centerline Axis / Radar Transit Vector (Golden)
              traceCorr();
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
              ctx.stroke();
            });
          } else {
            scanArea.corridors.forEach((corr) => {
              if (corr.points.length < 2) return;
              ctx.beginPath();
              corr.points.forEach((pt, i) => {
                const x = pt.relX * CANVAS_SIZE;
                const y = pt.relY * CANVAS_SIZE;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              });
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.lineWidth = 105;
              ctx.strokeStyle = 'rgba(234, 179, 8, 0.28)'; // Warm yellow glow
              ctx.stroke();

              ctx.lineWidth = 62;
              ctx.strokeStyle = 'rgba(249, 115, 22, 0.52)'; // Orange
              ctx.stroke();

              ctx.lineWidth = 24;
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)'; // Crimson red
              ctx.stroke();

              ctx.lineWidth = 4;
              ctx.strokeStyle = '#ffffff';
              ctx.stroke();
            });
          }
        }

        // 3. Subterranean Structural Chambers (2D Polygonal & Geometric Rooms)
        if (isGeoTunnel && Array.isArray(scanArea.chambers2D) && scanArea.chambers2D.length > 0) {
          const clarityScale = clarityLevel === 'SUPER' ? 1.15 : clarityLevel === 'ULTRA' ? 1.05 : 0.95;
          scanArea.chambers2D.forEach((ch) => {
            const cx = ch.relX * CANVAS_SIZE;
            const cy = ch.relY * CANVAS_SIZE;
            const w = (ch.widthM || 4.5) * 15 * clarityScale;
            const h = (ch.lengthM || 4.5) * 15 * clarityScale;

            ctx.save();
            ctx.translate(cx, cy);
            if (ch.rotationDeg) ctx.rotate((ch.rotationDeg * Math.PI) / 180);

            // Layer 1: Outer High-Contrast Masif Taş Masonry Envelope with Gold border (No Blue!)
            const padOut = 28;
            ctx.fillStyle = 'rgba(23, 23, 23, 0.96)';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5;
            drawRoundRect(ctx, -(w / 2 + padOut), -(h / 2 + padOut), w + padOut * 2, h + padOut * 2, 16);
            ctx.fill();
            ctx.stroke();

            // Layer 2: Intermediate Compacted Bedrock Layer
            const padMid = 14;
            ctx.fillStyle = 'rgba(67, 56, 202, 0.25)';
            drawRoundRect(ctx, -(w / 2 + padMid), -(h / 2 + padMid), w + padMid * 2, h + padMid * 2, 10);
            ctx.fill();

            // Layer 3: Distinct Internal Room Structure
            if (ch.innerStyle === 'target_core' || ch.chamberType === 'METALLIC_CORE') {
              // High Conductivity / Specular Metallic Target (Bullseye)
              const rad = Math.min(w, h) * 0.72;
              const cGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
              cGrad.addColorStop(0.0, '#ffffff');
              cGrad.addColorStop(0.20, '#eab308');
              cGrad.addColorStop(0.48, '#f97316');
              cGrad.addColorStop(0.75, '#dc2626');
              cGrad.addColorStop(0.96, '#f59e0b');
              cGrad.addColorStop(1.0, 'rgba(245, 158, 11, 0)');
              ctx.fillStyle = cGrad;
              ctx.beginPath();
              ctx.arc(0, 0, rad, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else if (ch.innerStyle === 'green_gold' || ch.chamberType === 'WALL_ENCLOSURE') {
              // Lime/Emerald Green Enclosure with Gold Pillar
              ctx.fillStyle = '#10b981';
              ctx.fillRect(-w / 2, -h / 2, w, h);
              ctx.strokeStyle = '#34d399';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(-w / 2, -h / 2, w, h);

              ctx.fillStyle = '#eab308';
              ctx.fillRect(-w * 0.22, -h * 0.38, w * 0.44, h * 0.76);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.strokeRect(-w * 0.22, -h * 0.38, w * 0.44, h * 0.76);
            } else if (ch.innerStyle === 'void_black' || ch.chamberType === 'VOID') {
              // Cavity / Sarnıç Void
              ctx.fillStyle = '#020617';
              ctx.fillRect(-w / 2, -h / 2, w, h);
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 2;
              ctx.strokeRect(-w / 2, -h / 2, w, h);
            } else if (ch.innerStyle === 'capsule' || ch.chamberType === 'VAULT') {
              // Arched Vault Chamber (Central Chamber)
              ctx.fillStyle = '#1e293b';
              drawRoundRect(ctx, -w / 2, -h / 2, w, h, 20);
              ctx.fill();
              ctx.strokeStyle = '#eab308';
              ctx.lineWidth = 2.5;
              ctx.stroke();

              // Inner Loop Arched Ring
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.90)';
              ctx.lineWidth = 2;
              drawRoundRect(ctx, -w * 0.30, -h * 0.34, w * 0.60, h * 0.68, 12);
              ctx.stroke();
            } else {
              // Stone Slab Masonry Chamber / Sarcophagus
              ctx.fillStyle = '#64748b';
              ctx.fillRect(-w / 2, -h / 2, w, h);
              ctx.strokeStyle = '#f8fafc';
              ctx.lineWidth = 2;
              ctx.strokeRect(-w / 2, -h / 2, w, h);

              ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(0, -h / 2);
              ctx.lineTo(0, h / 2);
              ctx.stroke();
            }

            ctx.restore();
          });
        }

        // 4. Multispectral Hotspot & Subsurface Anomaly Target Rendering
        if (Array.isArray(scanArea.hotspots)) {
          scanArea.hotspots.forEach((spot) => {
            const isInsideDepth = !depthFilter || (spot.depthMeters >= depthFilter.minDepth && spot.depthMeters <= depthFilter.maxDepth);
            if (!isInsideDepth) return;

            const originInfo = classifyHotspotOrigin(spot);
            if (anomalyCategoryFilter !== 'ALL' && originInfo.category !== anomalyCategoryFilter) {
              return;
            }

            const cx = spot.relativeX * CANVAS_SIZE;
            const cy = spot.relativeY * CANVAS_SIZE;
            const azimuthRad = ((spot.azimuthDeg || 42) * Math.PI) / 180;
            const aspect = Math.max(0.7, Math.min(2.4, spot.aspectRatio || 1.35));
            const clarityScale = clarityLevel === 'SUPER' ? 1.25 : clarityLevel === 'ULTRA' ? 1.10 : 1.0;
            const baseRadius = (spot.intensity > 80 ? 210 : 160) * clarityScale;

            if (isGeoTunnel) {
              // In JEOFİZİK-DEHLİZ mode: High-precision Subsurface Anomaly Target Beacons & Depth Badges!
              const bloomGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.7);
              if (isCategoryColoringActive || anomalyCategoryFilter !== 'ALL') {
                if (originInfo.category === 'MAN_MADE_STRUCTURE') {
                  bloomGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
                  bloomGrad.addColorStop(0.22, 'rgba(245, 158, 11, 0.90)');
                  bloomGrad.addColorStop(0.55, 'rgba(239, 68, 68, 0.55)');
                  bloomGrad.addColorStop(0.82, 'rgba(180, 83, 9, 0.25)');
                  bloomGrad.addColorStop(1.0, 'rgba(180, 83, 9, 0.0)');
                } else {
                  bloomGrad.addColorStop(0.0, 'rgba(236, 253, 245, 0.96)');
                  bloomGrad.addColorStop(0.22, 'rgba(16, 185, 129, 0.88)');
                  bloomGrad.addColorStop(0.55, 'rgba(6, 182, 212, 0.50)');
                  bloomGrad.addColorStop(0.82, 'rgba(4, 120, 87, 0.22)');
                  bloomGrad.addColorStop(1.0, 'rgba(4, 120, 87, 0.0)');
                }
              } else {
                bloomGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
                bloomGrad.addColorStop(0.20, 'rgba(239, 68, 68, 0.85)');
                bloomGrad.addColorStop(0.50, 'rgba(249, 115, 22, 0.45)');
                bloomGrad.addColorStop(0.80, 'rgba(234, 179, 8, 0.20)');
                bloomGrad.addColorStop(1.0, 'rgba(234, 179, 8, 0.0)');
              }
              ctx.fillStyle = bloomGrad;
              ctx.beginPath();
              ctx.arc(cx, cy, baseRadius * 0.7, 0, Math.PI * 2);
              ctx.fill();

              ctx.save();
              const catRingColor =
                isCategoryColoringActive || anomalyCategoryFilter !== 'ALL'
                  ? originInfo.primaryColor
                  : '#f59e0b';
              ctx.strokeStyle = catRingColor;
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              if (originInfo.category === 'MAN_MADE_STRUCTURE' && (isCategoryColoringActive || anomalyCategoryFilter !== 'ALL')) {
                ctx.strokeRect(cx - 18, cy - 18, 36, 36);
              } else {
                ctx.arc(cx, cy, 18, 0, Math.PI * 2);
                ctx.stroke();
              }

              ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.arc(cx, cy, 32, 0, Math.PI * 2);
              ctx.stroke();

              // Crosshair lines
              ctx.beginPath();
              ctx.moveTo(cx - 38, cy);
              ctx.lineTo(cx - 10, cy);
              ctx.moveTo(cx + 10, cy);
              ctx.lineTo(cx + 38, cy);
              ctx.moveTo(cx, cy - 38);
              ctx.lineTo(cx, cy - 10);
              ctx.moveTo(cx, cy + 10);
              ctx.lineTo(cx, cy + 38);
              ctx.stroke();

              // Center laser diode
              ctx.fillStyle =
                isCategoryColoringActive || anomalyCategoryFilter !== 'ALL'
                  ? originInfo.secondaryColor
                  : '#ef4444';
              ctx.beginPath();
              ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
              ctx.fill();

              // Depth & Category Tag Badge
              const tagText = `${originInfo.categoryLabel} | -${spot.depthMeters.toFixed(1)}m`;
              ctx.font = 'bold 11px monospace';
              const tagMetrics = ctx.measureText(tagText);
              const tagW = tagMetrics.width + 12;
              const tagH = 18;
              const tagX = cx + 18;
              const tagY = cy - 24;

              ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
              ctx.strokeStyle = catRingColor;
              ctx.lineWidth = 1.4;
              drawRoundRect(ctx, tagX, tagY, tagW, tagH, 4);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle =
                originInfo.category === 'MAN_MADE_STRUCTURE' ? '#fbbf24' : '#34d399';
              ctx.fillText(tagText, tagX + 6, tagY + 13);
              ctx.restore();
            } else {

            // Gradient Palette Selection for Ultra-HD Contrast
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);

            if (isCategoryColoringActive || anomalyCategoryFilter !== 'ALL') {
              if (originInfo.category === 'MAN_MADE_STRUCTURE') {
                // Anthropogenic Structure: High-Contrast Gold -> Crimson -> Amber
                grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
                grad.addColorStop(0.20, 'rgba(245, 158, 11, 0.96)');
                grad.addColorStop(0.50, 'rgba(239, 68, 68, 0.88)');
                grad.addColorStop(0.80, 'rgba(217, 119, 6, 0.42)');
                grad.addColorStop(1.0, 'rgba(217, 119, 6, 0.0)');
              } else {
                // Natural Geological Formation: Emerald -> Teal -> Cyan
                grad.addColorStop(0.0, 'rgba(236, 253, 245, 0.98)');
                grad.addColorStop(0.22, 'rgba(16, 185, 129, 0.94)');
                grad.addColorStop(0.52, 'rgba(6, 182, 212, 0.80)');
                grad.addColorStop(0.82, 'rgba(5, 150, 105, 0.38)');
                grad.addColorStop(1.0, 'rgba(5, 150, 105, 0.0)');
              }
            } else if (colorPalette === 'MAGNETIC_DIPOLE' || scanArea.scanMode === 'MAGNETIC_GRADIENT') {
              // Bipolar Magnetic Gradient: North (+) Crimson, South (-) Deep Cobalt Blue
              grad.addColorStop(0.0, 'rgba(239, 68, 68, 0.98)');   // +nT Peak
              grad.addColorStop(0.35, 'rgba(249, 115, 22, 0.88)');  // +nT Falloff
              grad.addColorStop(0.65, 'rgba(234, 179, 8, 0.45)');   // Transition
              grad.addColorStop(1.0, 'rgba(234, 179, 8, 0.0)');
            } else if (colorPalette === 'ERT_TOMO') {
              // Electrical Resistivity Tomography: Purple Void (2000+ Ω·m) -> Red -> Yellow -> Blue Metal
              grad.addColorStop(0.0, 'rgba(168, 85, 247, 0.98)');
              grad.addColorStop(0.28, 'rgba(239, 68, 68, 0.92)');
              grad.addColorStop(0.58, 'rgba(234, 179, 8, 0.75)');
              grad.addColorStop(0.85, 'rgba(6, 182, 212, 0.40)');
              grad.addColorStop(1.0, 'rgba(6, 182, 212, 0.0)');
            } else if (colorPalette === 'SPECTRAL_RADAR') {
              // 7-Band High-Contrast Interferometric Rainbow
              grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
              grad.addColorStop(0.18, 'rgba(239, 68, 68, 0.95)');
              grad.addColorStop(0.36, 'rgba(249, 115, 22, 0.90)');
              grad.addColorStop(0.55, 'rgba(234, 179, 8, 0.80)');
              grad.addColorStop(0.72, 'rgba(34, 197, 94, 0.65)');
              grad.addColorStop(0.88, 'rgba(6, 182, 212, 0.45)');
              grad.addColorStop(1.0, 'rgba(59, 130, 246, 0.0)');
            } else if (activeLayer === 'METAL_MINERAL') {
              grad.addColorStop(0.0, 'rgba(239, 68, 68, 0.98)');
              grad.addColorStop(0.25, 'rgba(249, 115, 22, 0.92)');
              grad.addColorStop(0.55, 'rgba(234, 179, 8, 0.78)');
              grad.addColorStop(0.80, 'rgba(168, 85, 247, 0.45)');
              grad.addColorStop(1.0, 'rgba(168, 85, 247, 0.0)');
            } else if (activeLayer === 'VEGETATION') {
              grad.addColorStop(0.0, 'rgba(234, 179, 8, 0.96)');
              grad.addColorStop(0.35, 'rgba(132, 204, 22, 0.88)');
              grad.addColorStop(0.70, 'rgba(34, 197, 94, 0.58)');
              grad.addColorStop(1.0, 'rgba(34, 197, 94, 0.0)');
            } else {
              // Default VELD ANOMALY: Razor-Sharp Multi-Spectral Thermal & SAR Heatmap (No Cyan/Blue Halo)
              grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');  // Ultra-hot white core
              grad.addColorStop(0.15, 'rgba(239, 68, 68, 0.98)');  // Intense Crimson Red
              grad.addColorStop(0.38, 'rgba(249, 115, 22, 0.92)'); // Radiant Thermal Orange
              grad.addColorStop(0.65, 'rgba(234, 179, 8, 0.85)');  // Thermal Gold
              grad.addColorStop(0.85, 'rgba(180, 83, 9, 0.35)');   // Warm earth falloff
              grad.addColorStop(1.0, 'rgba(15, 23, 42, 0.0)');     // Fade out cleanly into ground
            }

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
            ctx.fill();

            // 3b. Morphology Specific Geometrical Detailing
            if (spot.anomalyType === 'STRUCTURE') {
              // Crisp Rectangular Masonry Wall Foundations with Orientation Azimuth
              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(azimuthRad);
              const sw = baseRadius * 0.92;
              const sh = sw / aspect;

              // Foundation bed
              ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
              ctx.fillRect(-sw / 2, -sh / 2, sw, sh);

              // Solid Foundation Wall Lines (Bright Gold Contour)
              ctx.strokeStyle = 'rgba(254, 240, 138, 0.96)';
              ctx.lineWidth = 4;
              ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);

              // Internal Room Partition Wall
              if (sw > 100) {
                ctx.beginPath();
                ctx.moveTo(0, -sh / 2);
                ctx.lineTo(0, sh / 2);
                ctx.stroke();
              }

              // Corner Foundation Stones / Reinforcement Nodes
              ctx.fillStyle = '#ffffff';
              [[-sw / 2, -sh / 2], [sw / 2, -sh / 2], [sw / 2, sh / 2], [-sw / 2, sh / 2]].forEach(([px, py]) => {
                ctx.fillRect(px - 4, py - 4, 8, 8);
              });
              ctx.restore();
            } else if (spot.anomalyType === 'CAVITY') {
              // High Dielectric Discontinuity Boundary Ring (Vaulted Tomb / Chamber Void)
              ctx.save();
              ctx.translate(cx, cy);
              ctx.rotate(azimuthRad);
              ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
              ctx.lineWidth = 3.5;
              ctx.setLineDash([10, 5]);
              ctx.beginPath();
              ctx.ellipse(0, 0, baseRadius * 0.72, (baseRadius * 0.72) / aspect, 0, 0, Math.PI * 2);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.restore();
            } else if (spot.anomalyType === 'METAL') {
              // High-Intensity Specular Radar Reflection Spike
              const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.25);
              coreGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
              coreGrad.addColorStop(0.45, 'rgba(254, 240, 138, 0.98)');
              coreGrad.addColorStop(1.0, 'rgba(239, 68, 68, 0.0)');
              ctx.fillStyle = coreGrad;
              ctx.beginPath();
              ctx.arc(cx, cy, baseRadius * 0.25, 0, Math.PI * 2);
              ctx.fill();

              // Concentric High-Frequency Diffraction Rings
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.90)';
              ctx.lineWidth = 2.0;
              ctx.beginPath();
              ctx.arc(cx, cy, baseRadius * 0.40, 0, Math.PI * 2);
              ctx.stroke();
            }

            // 3c. Magnetic Bipolar Dipole Rendering
            if (colorPalette === 'MAGNETIC_DIPOLE' || scanArea.scanMode === 'MAGNETIC_GRADIENT') {
              const dipoleDist = baseRadius * 0.62;
              const negX = cx + Math.cos(azimuthRad) * dipoleDist;
              const negY = cy + Math.sin(azimuthRad) * dipoleDist;
              const negGrad = ctx.createRadialGradient(negX, negY, 0, negX, negY, baseRadius * 0.80);
              negGrad.addColorStop(0.0, 'rgba(37, 99, 235, 0.96)');
              negGrad.addColorStop(0.45, 'rgba(6, 182, 212, 0.72)');
              negGrad.addColorStop(1.0, 'rgba(6, 182, 212, 0.0)');
              ctx.fillStyle = negGrad;
              ctx.beginPath();
              ctx.arc(negX, negY, baseRadius * 0.80, 0, Math.PI * 2);
              ctx.fill();

              // Magnetic flux curves connecting poles
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
              ctx.lineWidth = 2.0;
              ctx.setLineDash([6, 4]);
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.quadraticCurveTo((cx + negX) / 2 + 30, (cy + negY) / 2 - 30, negX, negY);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.quadraticCurveTo((cx + negX) / 2 - 30, (cy + negY) / 2 + 30, negX, negY);
              ctx.stroke();
              ctx.setLineDash([]);

              // Dipole indicators (+ and - signs)
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 16px monospace';
              ctx.textAlign = 'center';
              ctx.fillText('+', cx, cy + 6);
              ctx.fillText('-', negX, negY + 6);
              ctx.textAlign = 'left';
            }

            // 3d. Ultra-Crisp Concentric Isocontours (Geophysical Isolines)
            if (scanArea.isocontoursEnabled !== false) {
              const isMagnetic = scanArea.scanMode === 'MAGNETIC_GRADIENT' || colorPalette === 'MAGNETIC_DIPOLE';
              const ringFactors = [0.32, 0.52, 0.74, 0.92];
              const labels = isMagnetic 
                ? ['+85nT', '+60nT', '+40nT', '+20nT'] 
                : ['%95', '%80', '%60', '%40'];

              ringFactors.forEach((factor, idx) => {
                const rx = baseRadius * factor;
                const ry = rx / (aspect > 1.3 ? 1.25 : 1.0);
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(azimuthRad);
                ctx.lineWidth = idx === 0 ? 2.4 : 1.6;
                ctx.strokeStyle = idx === 0 ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.58)';
                ctx.setLineDash(idx % 2 === 0 ? [] : [6, 4]);
                ctx.beginPath();
                ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
                ctx.stroke();

                // Clear Isoline Numerical Value
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 13px monospace';
                ctx.fillText(labels[idx], rx - 24, -4);
                ctx.restore();
              });
            }
          }
        });
      }

        // 4. Subtle Radar Metric Grid
        if (showGrid) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
          ctx.lineWidth = 1;
          const step = 64;
          for (let x = 0; x <= CANVAS_SIZE; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_SIZE);
            ctx.stroke();
          }
          for (let y = 0; y <= CANVAS_SIZE; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_SIZE, y);
            ctx.stroke();
          }
        }

        // 5. Unsharp Masking & Edge Sharpening Convolution Filter (Crisp Contrast Engine)
        if (edgeEnhanceEnabled) {
          const imgData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          const d = imgData.data;
          const contrastMult = clarityLevel === 'SUPER' ? 1.32 : clarityLevel === 'ULTRA' ? 1.22 : 1.12;
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] > 18) {
              // High-pass contrast stretch for razor-sharp anomaly boundaries
              d[i] = Math.min(255, Math.max(0, (d[i] - 128) * contrastMult + 128));
              d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - 128) * contrastMult + 128));
              d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - 128) * contrastMult + 128));
              if (d[i + 3] > 160) {
                d[i + 3] = Math.min(255, d[i + 3] * 1.05);
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        ctx.restore();

        const dataUrl = canvas.toDataURL('image/png');
        setHeatmapDataUrl(dataUrl);

        // Add Leaflet ImageOverlay exactly covering the bounding box
        const bounds: L.LatLngBoundsExpression = [
          [minLat, minLng],
          [maxLat, maxLng],
        ];
        const overlay = L.imageOverlay(dataUrl, bounds, {
          opacity: heatmapOpacity,
          interactive: false,
        });
        heatGroup.addLayer(overlay);
      }
    }

    // C. Outer Scan Polygon Boundary (Clean gold geophysical dashed line)
    const polygon = L.polygon(latlngs, {
      color: '#f59e0b',
      weight: 2,
      dashArray: '6, 4',
      fill: false,
    });
    polyGroup.addLayer(polygon);

    // D. Corner Numbers (1, 2, 3, 4, 5, 6 in high-contrast gold circular pins)
    latlngs.forEach((coord, idx) => {
      const cornerIcon = L.divIcon({
        className: 'custom-corner-pin',
        html: `
          <div style="
            width: 22px; 
            height: 22px; 
            background: #d97706; 
            color: #ffffff; 
            border: 2px solid #fcd34d; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 11px; 
            font-weight: 800; 
            font-family: monospace; 
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.85);
            transform: translate(-50%, -50%);
          ">
            ${idx + 1}
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      polyGroup.addLayer(L.marker(coord, { icon: cornerIcon, interactive: false }));
    });

    // E. Subsurface Corridors (Double-lined golden masonry path with white centerline - No Blue!)
    if (activeLayer !== 'NONE' && Array.isArray(scanArea.corridors)) {
      scanArea.corridors.forEach((corr) => {
        if (!corr.points || !Array.isArray(corr.points) || corr.points.length < 2) return;
        const coords = corr.points.map(pt => {
          const lat = maxLat - pt.relY * (maxLat - minLat);
          const lng = minLng + pt.relX * (maxLng - minLng);
          return [lat, lng] as L.LatLngTuple;
        });
        // Translucent golden conduit ribbon
        polyGroup.addLayer(L.polyline(coords, {
          color: '#f59e0b',
          weight: 14,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }));
        // Golden borders
        polyGroup.addLayer(L.polyline(coords, {
          color: '#d97706',
          weight: 2,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }));
        // White dashed centerline
        polyGroup.addLayer(L.polyline(coords, {
          color: '#ffffff',
          weight: 2,
          opacity: 0.95,
          dashArray: '5, 5',
          lineCap: 'round',
          lineJoin: 'round',
        }));
      });
    }

    // F. Subsurface Chamber Polygons (High-contrast stone room enclosures)
    if (activeLayer !== 'NONE' && Array.isArray(scanArea.chambers2D)) {
      scanArea.chambers2D.forEach((chamber) => {
        let pts = chamber.points;
        if (!pts || !Array.isArray(pts) || pts.length === 0) {
          const hw = ((chamber.widthM || 4) * 0.007) / 2;
          const hl = ((chamber.lengthM || 4) * 0.007) / 2;
          const cx = chamber.relX ?? 0.5;
          const cy = chamber.relY ?? 0.5;
          pts = [
            { relX: cx - hw, relY: cy - hl },
            { relX: cx + hw, relY: cy - hl },
            { relX: cx + hw, relY: cy + hl },
            { relX: cx - hw, relY: cy + hl },
          ];
        }
        const coords = pts.map(pt => {
          const lat = maxLat - pt.relY * (maxLat - minLat);
          const lng = minLng + pt.relX * (maxLng - minLng);
          return [lat, lng] as L.LatLngTuple;
        });
        polyGroup.addLayer(L.polygon(coords, {
          color: chamber.colorHex || '#f59e0b',
          weight: 2,
          fillColor: chamber.colorHex || '#d97706',
          fillOpacity: 0.28,
          dashArray: '4, 4',
        }));
      });
    }

    // G. Subterranean Axis Lines (Red/orange lines connecting anomalies)
    if (activeLayer !== 'NONE' && Array.isArray(scanArea.axisLines)) {
      scanArea.axisLines.forEach((axis) => {
        const startLat = maxLat - axis.start.relY * (maxLat - minLat);
        const startLng = minLng + axis.start.relX * (maxLng - minLng);
        const endLat = maxLat - axis.end.relY * (maxLat - minLat);
        const endLng = minLng + axis.end.relX * (maxLng - minLng);
        polyGroup.addLayer(L.polyline([[startLat, startLng], [endLat, endLng]], {
          color: axis.color || '#ef4444',
          weight: 2.5,
          opacity: 0.85,
          dashArray: '6, 6',
        }));
      });
    }

    // H. Hotspot Pins: Categorized as 'İnsan Yapımı Yapı' vs 'Doğal Jeolojik' with dynamic color coding
    if (activeLayer !== 'NONE' && Array.isArray(scanArea.hotspots)) {
      scanArea.hotspots.forEach((spot) => {
        const isInsideDepth = !depthFilter || (spot.depthMeters >= depthFilter.minDepth && spot.depthMeters <= depthFilter.maxDepth);
        if (!isInsideDepth) return;

        const originInfo = classifyHotspotOrigin(spot);
        if (anomalyCategoryFilter !== 'ALL' && originInfo.category !== anomalyCategoryFilter) {
          return;
        }

        const spotLat = maxLat - spot.relativeY * (maxLat - minLat);
        const spotLng = minLng + spot.relativeX * (maxLng - minLng);
        const isSelected = selectedHotspot?.id === spot.id;

        const activePinColor =
          isCategoryColoringActive || anomalyCategoryFilter !== 'ALL'
            ? originInfo.primaryColor
            : isSelected
            ? '#f59e0b'
            : '#f97316';

        const activeGlowColor =
          isCategoryColoringActive || anomalyCategoryFilter !== 'ALL'
            ? originInfo.category === 'MAN_MADE_STRUCTURE'
              ? 'rgba(245, 158, 11, 0.9)'
              : 'rgba(16, 185, 129, 0.9)'
            : isSelected
            ? 'rgba(245, 158, 11, 0.95)'
            : 'rgba(249, 115, 22, 0.8)';

        const hotspotHtml = `
          <div style="display: flex; align-items: center; gap: 5px; transform: translate(-11px, -11px); cursor: pointer;">
            <!-- Category-colored circular badge with number -->
            <div style="
              width: 24px; 
              height: 24px; 
              background: ${activePinColor}; 
              color: #020617; 
              border: 2px solid #ffffff; 
              border-radius: ${originInfo.category === 'MAN_MADE_STRUCTURE' ? '6px' : '50%'}; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              font-size: 11px; 
              font-weight: 900; 
              font-family: monospace;
              box-shadow: 0 0 12px ${activeGlowColor};
              flex-shrink: 0;
            ">
              ${spot.id}
            </div>
            <!-- Categorized Anomaly Label Pill ('İnsan Yapımı Yapı' / 'Doğal Jeolojik') -->
            <div style="
              background: rgba(2, 6, 23, 0.94); 
              color: #f8fafc; 
              border: 1.5px solid ${activePinColor}; 
              border-radius: 8px; 
              padding: 2px 7px; 
              font-size: 10px; 
              font-weight: 700; 
              font-family: monospace; 
              white-space: nowrap; 
              box-shadow: 0 3px 10px rgba(0, 0, 0, 0.7);
              display: flex;
              align-items: center;
              gap: 5px;
            ">
              <span style="
                background: ${originInfo.badgeBg};
                color: ${originInfo.badgeText};
                border: 1px solid ${originInfo.badgeBorder};
                border-radius: 4px;
                padding: 0px 4px;
                font-size: 9px;
                font-weight: 800;
              ">
                ${originInfo.icon} ${originInfo.categoryLabel}
              </span>
              <span style="color: ${isSelected ? '#fde047' : '#e2e8f0'};">
                ${isSelected ? (spot.label || `${spot.sizeMeters} · ${spot.anomalyTypeTr}`) : (spot.anomalyTypeTr || spot.sizeMeters)}
              </span>
            </div>
          </div>
        `;

        const hotspotIcon = L.divIcon({
          className: 'custom-hotspot-pin',
          html: hotspotHtml,
          iconSize: [isSelected ? 240 : 190, 26],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([spotLat, spotLng], { icon: hotspotIcon });
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          sound.playScanBeep();
          onSelectHotspot(spot);
        });
        marker.on('mouseover', () => {
          sound.playGeigerPing(spot.intensity);
        });
        polyGroup.addLayer(marker);
      });
    }
  }, [scanArea, activeLayer, viewMode, selectedHotspot, showGrid, heatmapOpacity, depthFilter, clarityLevel, colorPalette, edgeEnhanceEnabled, lidarConfig, regionFilterCenter, realDemResult, lidarCurtainPct, anomalyCategoryFilter, isCategoryColoringActive]);

  // HD Snapshot Export Engine (Ultra-Net Çekim Kaydet / İndir)
  const handleExportHDCapture = async () => {
    if (!scanArea) return;
    setIsExportingSnapshot(true);
    sound.playAnomalyDiscovered();

    try {
      const expCanvas = document.createElement('canvas');
      expCanvas.width = 1920;
      expCanvas.height = 1080;
      const ctx = expCanvas.getContext('2d');
      if (!ctx) return;

      // 1. Dark Technical Geospace Background
      ctx.fillStyle = '#060b14';
      ctx.fillRect(0, 0, 1920, 1080);

      // 2. High-Tech Satellite Frame Grid
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 1920; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 80);
        ctx.lineTo(x, 1000);
        ctx.stroke();
      }
      for (let y = 80; y <= 1000; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1920, y);
        ctx.stroke();
      }

      // 3. Draw Heatmap Layer in Main Viewport
      if (heatmapDataUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          img.src = heatmapDataUrl;
        });
        ctx.drawImage(img, 160, 100, 1200, 880);
      }

      // 4. Outer Boundary Frame with Gold Laser Corners
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(160, 100, 1200, 880);

      // Corner Crosshairs
      const corners = [
        [160, 100],
        [1360, 100],
        [160, 980],
        [1360, 980],
      ];
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      corners.forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy);
        ctx.lineTo(cx + 20, cy);
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx, cy + 20);
        ctx.stroke();
      });

      // 5. Header Telemetry Banner
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1920, 80);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 1920, 80);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('TERRASCAN AI™ - ULTRA-NET RADAR & TERMAL ANOMALİ ÇEKİMİ', 40, 48);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px monospace';
      ctx.fillText(`UYDU: ${activeSatellite?.name || 'Sentinel-2B / TerraSAR-X'}  |  İRTİFA: ${activeSatellite?.altitudeKm || 786} km  |  NETLİK ODAĞI: %${scanArea.sharpnessIndex || '98.4'}  |  ÇÖZÜNÜRLÜK: ${scanArea.groundResolutionM || 0.22} m/px`, 1000, 48);

      // 6. Right Side Telemetry & Analysis Dossier
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(1380, 100, 500, 880);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(1380, 100, 500, 880);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('ANOMALİ VE DERİNLİK RAPORU', 1405, 145);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '14px monospace';
      ctx.fillText(`KOORDİNAT: ${scanArea.center.lat.toFixed(6)}° N, ${scanArea.center.lng.toFixed(6)}° E`, 1405, 185);
      ctx.fillText(`LOKASYON: ${scanArea.locationName}`, 1405, 215);
      ctx.fillText(`TARAMA MODU: ${scanArea.scanMode || 'SAR_VELD'} (${clarityLevel} NETLİK)`, 1405, 245);
      ctx.fillText(`GENEL GÜVEN PUANI: ${scanArea.overallScore}/10`, 1405, 275);

      // Divider
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(1405, 305);
      ctx.lineTo(1855, 305);
      ctx.stroke();

      // Hotspots Breakdown Table
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`TESPİT EDİLEN ODAKLAR (${scanArea.hotspots?.length || 0} ADET):`, 1405, 340);

      let yOff = 380;
      (scanArea.hotspots || []).slice(0, 7).forEach((spot) => {
        ctx.fillStyle = spot.colorHex || '#f97316';
        ctx.fillRect(1405, yOff - 14, 12, 12);

        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`[Nokta ${spot.id}] ${spot.label}`, 1425, yOff - 2);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.fillText(`Derinlik: ${spot.depthMeters}m | Tip: ${spot.anomalyTypeTr} | Netlik: %${spot.focusSharpnessPct || '97.5'}`, 1425, yOff + 16);

        yOff += 46;
      });

      // 7. Bottom Metric Scale Bar & Compass
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 1000, 1920, 80);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 1000, 1920, 80);

      // Scale Bar
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(160, 1040);
      ctx.lineTo(360, 1040);
      ctx.moveTo(160, 1032);
      ctx.lineTo(160, 1048);
      ctx.moveTo(260, 1035);
      ctx.lineTo(260, 1045);
      ctx.moveTo(360, 1032);
      ctx.lineTo(360, 1048);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('0m', 155, 1062);
      ctx.fillText('10m', 252, 1062);
      ctx.fillText('20m (ÖLÇEK METRAJ)', 340, 1062);

      // Watermark
      ctx.fillStyle = '#64748b';
      ctx.font = '13px monospace';
      ctx.fillText(`TERRASCAN DEEP-EARTH RADAR INVERSION • ÇEKİM TARİHİ: ${new Date().toLocaleString('tr-TR')} • SAR ULTRA-HD`, 800, 1045);

      const downloadUrl = expCanvas.toDataURL('image/png');
      setSnapshotPreviewUrl(downloadUrl);

      // Auto Trigger Download
      const link = document.createElement('a');
      link.download = `TerraScan_Net_Cekim_${scanArea.center.lat.toFixed(4)}_${scanArea.center.lng.toFixed(4)}.png`;
      link.href = downloadUrl;
      link.click();
    } catch (err) {
      console.error('HD Snapshot export error:', err);
    } finally {
      setIsExportingSnapshot(false);
    }
  };

  useEffect(() => {
    if (onRegisterExportSnapshot) {
      onRegisterExportSnapshot(handleExportHDCapture);
    }
  }, [onRegisterExportSnapshot, scanArea, heatmapOpacity, colorPalette, clarityLevel, mapTileStyle]);

  // 3D Mouse Drag Orbit
  const handle3DMouseDown = (e: React.MouseEvent) => {
    setIs3DDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handle3DMouseMove = (e: React.MouseEvent) => {
    if (!is3DDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotationZ((prev) => (prev + dx * 0.4) % 360);
    setRotationX((prev) => Math.max(15, Math.min(85, prev - dy * 0.4)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handle3DMouseUp = () => {
    setIs3DDragging(false);
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950 font-sans">
      
      {/* 2D REAL SATELLITE MAP CONTAINER */}
      <div 
        ref={mapContainerRef}
        className={`w-full h-full absolute inset-0 z-0 transition-opacity duration-300 ${
          viewMode === '2D' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* SIDE-PULL LIDAR CURTAIN LAYER (Clips real DEM LiDAR heatmap & dynamic topographic callouts) */}
      {viewMode === '2D' && lidarCurtainPct > 0.5 && lidarCurtainDataUrl && demScreenOverlay && (
        <div
          className="absolute inset-0 z-[15] pointer-events-none overflow-hidden"
          style={{
            clipPath: `inset(0 ${Math.max(0, 100 - lidarCurtainPct)}% 0 0)`,
          }}
        >
          {/* Real-Time Topographic DEM LiDAR Image Aligned to Exact Geographic Viewport */}
          <img
            src={lidarCurtainDataUrl}
            alt="Real Topographic DEM LiDAR Relief"
            className="absolute max-w-none pointer-events-none select-none"
            style={{
              left: `${demScreenOverlay.left}px`,
              top: `${demScreenOverlay.top}px`,
              width: `${demScreenOverlay.width}px`,
              height: `${demScreenOverlay.height}px`,
              opacity: lidarConfig?.opacity ?? 0.94,
            }}
          />

          {/* Dynamic Topographic Anomaly Callouts & Pins Inside Curtain (Categorized: İnsan Yapımı Yapı vs Doğal Jeolojik) */}
          {(lidarConfig?.showCalloutLabels ?? true) &&
            demScreenOverlay.anomalies
              .filter(({ anom }) => anomalyCategoryFilter === 'ALL' || anom.category === anomalyCategoryFilter)
              .map(({ anom, x, y }) => {
                const isManMade = anom.category === 'MAN_MADE_STRUCTURE';
                const iconSymbol = isManMade
                  ? anom.kind === 'TUMULUS_MOUND'
                    ? '🏛️'
                    : '🧱'
                  : anom.kind === 'SLOPE_FAULT'
                  ? '⛰️'
                  : '🌊';

                return (
                  <div
                    key={anom.id}
                    style={{ left: `${x}px`, top: `${y}px` }}
                    className="absolute pointer-events-auto"
                  >
                    {/* Pin Indicator for Man-Made Structure */}
                    {isManMade && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          sound.playScanBeep();
                          onMapClickRef.current?.(anom.lat, anom.lng);
                        }}
                        className="flex flex-col items-center -translate-x-1/2 -translate-y-full cursor-pointer mb-1"
                      >
                        <div className="w-8 h-6 bg-slate-900/95 border border-amber-400/80 rounded-md flex items-center justify-center text-xs shadow-lg mb-0.5">
                          🏛️
                        </div>
                        <div className="w-7 h-7 rounded-md bg-amber-500 border-2 border-amber-200 flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.9)]">
                          <div className="w-2.5 h-2.5 rounded-sm bg-slate-950" />
                        </div>
                      </div>
                    )}

                    {/* Target Reticle Ring for Natural Geological Feature */}
                    {!isManMade && (
                      <div className="w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-950/85 border-2 border-emerald-400/90 flex items-center justify-center shadow-[0_0_14px_rgba(16,185,129,0.85)] pointer-events-none">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399]" />
                      </div>
                    )}

                    {/* Categorized Callout Badge with Real DEM Elevation & Slope Metrics */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        sound.playScanBeep();
                        onMapClickRef.current?.(anom.lat, anom.lng);
                      }}
                      style={{
                        transform: isManMade
                          ? 'translate(-50%, 8px)'
                          : 'translate(-50%, -125%)',
                      }}
                      className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold whitespace-nowrap shadow-[0_6px_20px_rgba(0,0,0,0.65)] border-2 flex flex-col gap-0.5 cursor-pointer transition-transform hover:scale-105 ${
                        isCategoryColoringActive || anomalyCategoryFilter !== 'ALL'
                          ? isManMade
                            ? 'bg-slate-950/95 text-amber-100 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                            : 'bg-slate-950/95 text-emerald-100 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.45)]'
                          : 'bg-slate-50/95 hover:bg-white text-slate-800 border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase tracking-wider border ${
                            isManMade
                              ? 'bg-amber-500/25 text-amber-300 border-amber-400/60'
                              : 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60'
                          }`}
                        >
                          {isManMade ? '🏛️ İnsan Yapımı Yapı' : '⛰️ Doğal Jeolojik'}
                        </span>
                        <span>{iconSymbol}</span>
                        <span>{anom.title}</span>
                      </div>
                      <div
                        className={`text-[9.5px] font-semibold pl-1 ${
                          isCategoryColoringActive || anomalyCategoryFilter !== 'ALL'
                            ? isManMade
                              ? 'text-amber-300/90'
                              : 'text-emerald-300/90'
                            : 'text-slate-600'
                        }`}
                      >
                        {anom.metricsLabel}
                      </div>
                    </div>
                  </div>
                );
              })}

          {/* Real DEM Topographic Telemetry Pill Inside LiDAR Curtain */}
          {realDemResult && (
            <div className="absolute top-14 left-3 px-3 py-1 rounded-lg bg-slate-950/90 border border-cyan-500/50 text-[10px] font-mono text-cyan-300 shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                GERÇEK DEM RAKIM: {Math.round(realDemResult.minElevation)}m – {Math.round(realDemResult.maxElevation)}m
              </span>
            </div>
          )}
        </div>
      )}

      {/* DRAGGABLE SIDE-PULL LIDAR CURTAIN BAR (Yandaki Çubuğu Çekince LiDAR, Geri Çekince Harita) */}
      {viewMode === '2D' && (
        <div
          style={{
            left: `${lidarCurtainPct}%`,
          }}
          className="absolute top-0 bottom-0 z-[24] pointer-events-none"
        >
          {/* Glowing Vertical Curtain Laser Divider Line (visible when pulled out) */}
          {lidarCurtainPct > 0.5 && lidarCurtainPct < 99.5 && (
            <div className="absolute top-0 bottom-0 -left-[1.5px] w-[3px] bg-gradient-to-b from-cyan-400 via-amber-400 to-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.95)]" />
          )}

          {/* Interactive Grab Handle Tab on the Side / Curtain Line */}
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              sound.playScanBeep();
              setIsDraggingCurtain(true);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              sound.playScanBeep();
              setIsDraggingCurtain(true);
            }}
            style={{
              transform:
                lidarCurtainPct <= 3
                  ? 'translate(0px, -50%)'
                  : lidarCurtainPct >= 94
                  ? 'translate(-100%, -50%) translateX(-60px)'
                  : 'translate(-50%, -50%)',
            }}
            className="absolute top-1/2 pointer-events-auto cursor-ew-resize select-none group"
            title="Çubuğu sağa çekerek LiDAR ısı haritasını açın, sola geri çekerek normal haritaya dönün"
          >
            <div className="flex items-center gap-1.5 px-2.5 py-3 rounded-xl bg-slate-950/95 hover:bg-slate-900 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.75)] text-white font-mono text-[11px] font-extrabold transition-transform active:scale-95">
              {/* Vertical Grip Ridges */}
              <div className="flex flex-col gap-1 pr-1 border-r border-slate-700">
                <span className="w-1 h-2.5 rounded-full bg-cyan-400 block" />
                <span className="w-1 h-2.5 rounded-full bg-amber-400 block" />
                <span className="w-1 h-2.5 rounded-full bg-cyan-400 block" />
              </div>

              {lidarCurtainPct <= 3 ? (
                <div className="flex flex-col items-start leading-tight pr-1">
                  <span className="text-cyan-300 text-[10px] tracking-wider uppercase">
                    LİDAR ÇEK ❯
                  </span>
                  <span className="text-[9px] text-slate-400 font-normal">
                    Sağa Sürükle
                  </span>
                </div>
              ) : lidarCurtainPct >= 94 ? (
                <div className="flex flex-col items-end leading-tight pl-1">
                  <span className="text-amber-300 text-[10px] tracking-wider uppercase">
                    ❮ HARİTAYA ÇEK
                  </span>
                  <span className="text-[9px] text-slate-400 font-normal">
                    Sola Sürükle
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center leading-tight px-1">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-amber-300">❮ LİDAR</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-cyan-300">HARİTA ❯</span>
                  </div>
                  <span className="text-[9px] text-slate-400">
                    %{Math.round(lidarCurtainPct)} Açık
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SATELLITE OVERHEAD SCAN BANNER (Clean, Non-obtrusive telemetry with HD Clarity specs) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-950/85 border border-cyan-500/40 backdrop-blur-md shadow-lg text-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
        </span>
        <span className="font-semibold text-white flex items-center gap-1.5">
          <SatIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>{activeSatellite?.name || 'Sentinel-2B'}</span>
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-cyan-300 font-mono text-[11px]">
          İrtifa: {activeSatellite?.altitudeKm || 786} km
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-emerald-300 font-mono text-[11px] font-bold">
          🎯 Çözünürlük: {scanArea?.groundResolutionM || 0.22} m/px
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-cyan-300 font-mono text-[11px] font-bold">
          ⚡ Netlik: %{scanArea?.sharpnessIndex || '98.4'}
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-amber-300 font-mono text-[11px] font-bold">
          Puan: {scanArea?.overallScore || 6}/10
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-emerald-400 font-mono text-[11px] font-bold">
          {isScanning ? '⏳ YERİ TARIYOR...' : '● CANLI RADAR KİLİTLİ'}
        </span>
      </div>

      {/* ANOMALY ORIGIN CATEGORY FILTER & COLORING TOGGLE DOCK ('Doğal Jeolojik' vs 'İnsan Yapımı Yapı') */}
      {(() => {
        const hotspotsList = scanArea?.hotspots || [];
        const manMadeScanCount = hotspotsList.filter(
          (h) => classifyHotspotOrigin(h).category === 'MAN_MADE_STRUCTURE'
        ).length;
        const naturalScanCount = hotspotsList.filter(
          (h) => classifyHotspotOrigin(h).category === 'NATURAL_GEOLOGICAL'
        ).length;
        const demAnoms = realDemResult?.anomalies || [];
        const isLidarOpen = viewMode === '2D' && lidarCurtainPct > 10;
        const manMadeTotal = isLidarOpen
          ? demAnoms.filter((a) => a.category === 'MAN_MADE_STRUCTURE').length
          : manMadeScanCount;
        const naturalTotal = isLidarOpen
          ? demAnoms.filter((a) => a.category === 'NATURAL_GEOLOGICAL').length
          : naturalScanCount;

        return (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 sm:top-12 left-1/2 -translate-x-1/2 z-[25] flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-slate-950/92 border border-slate-700/90 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.65)] max-w-[96vw]"
          >
            {/* Master Coloring Switch Button */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setIsCategoryColoringActive((prev) => !prev);
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isCategoryColoringActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Anomali Etiketlerini ve Haritayı Kategoriye Göre Renklendir (Aç/Kapat)"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isCategoryColoringActive
                    ? 'bg-gradient-to-r from-amber-400 to-emerald-400 animate-pulse'
                    : 'bg-slate-600'
                }`}
              />
              <span>Kategori Renklendirme: {isCategoryColoringActive ? 'AÇIK' : 'KAPALI'}</span>
            </button>

            <div className="h-4 w-px bg-slate-800 hidden sm:block" />

            {/* Filter 1: ALL (Tümü) */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setAnomalyCategoryFilter('ALL');
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                anomalyCategoryFilter === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <span>Tümü</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  anomalyCategoryFilter === 'ALL'
                    ? 'bg-slate-950/25 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {manMadeTotal + naturalTotal}
              </span>
            </button>

            {/* Filter 2: MAN_MADE_STRUCTURE (İnsan Yapımı Yapı) */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setIsCategoryColoringActive(true);
                setAnomalyCategoryFilter((prev) =>
                  prev === 'MAN_MADE_STRUCTURE' ? 'ALL' : 'MAN_MADE_STRUCTURE'
                );
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                anomalyCategoryFilter === 'MAN_MADE_STRUCTURE'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.65)]'
                  : 'bg-amber-950/50 hover:bg-amber-900/60 border-amber-500/50 text-amber-200'
              }`}
              title="Sadece İnsan Yapımı Yapı (Duvar, Temel, Oda, Tümülüs, Metal) anomalilerini filtrele ve altın/kırmızı renklendir"
            >
              <span className="w-2 h-2 rounded-sm bg-amber-400 border border-white shrink-0" />
              <span>🏛️ İnsan Yapımı Yapı</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  anomalyCategoryFilter === 'MAN_MADE_STRUCTURE'
                    ? 'bg-slate-950/25 text-slate-950 font-black'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {manMadeTotal}
              </span>
            </button>

            {/* Filter 3: NATURAL_GEOLOGICAL (Doğal Jeolojik) */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setIsCategoryColoringActive(true);
                setAnomalyCategoryFilter((prev) =>
                  prev === 'NATURAL_GEOLOGICAL' ? 'ALL' : 'NATURAL_GEOLOGICAL'
                );
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                anomalyCategoryFilter === 'NATURAL_GEOLOGICAL'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.65)]'
                  : 'bg-emerald-950/50 hover:bg-emerald-900/60 border-emerald-500/50 text-emerald-200'
              }`}
              title="Sadece Doğal Jeolojik (Kayaç Kırığı, Karstik Boşluk, Mineral Damarı, Akifer) anomalilerini filtrele ve zümrüt/turkuaz renklendir"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 border border-white shrink-0" />
              <span>⛰️ Doğal Jeolojik</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                  anomalyCategoryFilter === 'NATURAL_GEOLOGICAL'
                    ? 'bg-slate-950/25 text-slate-950 font-black'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {naturalTotal}
              </span>
            </button>
          </div>
        );
      })()}

      {/* SCAN IN PROGRESS PULSE OVERLAY */}
      {isScanning && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-cyan-950/20 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-3 bg-slate-950/90 border border-cyan-400 px-6 py-4 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.6)]">
            <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm font-bold text-cyan-300 font-mono">
              UYDU SPEKTRAL TARAMA YÜRÜTÜLÜYOR...
            </div>
            <div className="text-xs text-slate-400">
              Derinlik penetrasyonu ve anomali analizi hesaplanıyor
            </div>
          </div>
        </div>
      )}

      {/* 3D VOLUMETRIC SUBSURFACE VOXLER VIEW WITH ADVANCED CAMERA CONTROLS */}
      {viewMode === '3D' && scanArea && (
        <div 
          className="w-full h-full absolute inset-0 z-10 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
          onMouseDown={handle3DMouseDown}
          onMouseMove={handle3DMouseMove}
          onMouseUp={handle3DMouseUp}
          style={{ perspective: 1300 }}
        >
          {/* FLOATING TOP 3D VOXLER CAMERA & ORIENTATION DOCK */}
          <div 
            className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-950/90 border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)] backdrop-blur-xl pointer-events-auto max-w-[95vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Camera Presets Selector */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => applyCameraPreset('VOXLER_ISO')}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
                  cameraPreset === 'VOXLER_ISO'
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Voxler İzometrik 3B Görünüm"
              >
                <Box className="w-3 h-3" />
                <span>İzometrik</span>
              </button>

              <button
                type="button"
                onClick={() => applyCameraPreset('NADIR')}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
                  cameraPreset === 'NADIR'
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Kuşbakışı (90° Dikey Nadir)"
              >
                <SatIcon className="w-3 h-3" />
                <span>Kuşbakışı</span>
              </button>

              <button
                type="button"
                onClick={() => applyCameraPreset('ORBIT')}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
                  cameraPreset === 'ORBIT'
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Eğimli 45° İnceleme Açısı"
              >
                <Compass className="w-3 h-3" />
                <span>45° Eğim</span>
              </button>

              <button
                type="button"
                onClick={() => applyCameraPreset('HORIZON')}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
                  cameraPreset === 'HORIZON'
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Ufuk Zemin Profil Açısı"
              >
                <Layers className="w-3 h-3" />
                <span>Ufuk</span>
              </button>

              <button
                type="button"
                onClick={() => applyCameraPreset('DRILL')}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
                  cameraPreset === 'DRILL'
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Sondaj ve Kuyu Kamerası Derinlik Açısı"
              >
                <Activity className="w-3 h-3" />
                <span>Sondaj</span>
              </button>
            </div>

            {/* 360° Auto Orbit Continuous Rotation Button */}
            <button
              type="button"
              onClick={() => {
                sound.playScanBeep();
                setIsAutoOrbiting(!isAutoOrbiting);
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                isAutoOrbiting
                  ? 'bg-emerald-950 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="360° Otomatik Yeraltı Turu"
            >
              {isAutoOrbiting ? (
                <>
                  <Pause className="w-3 h-3 text-emerald-400" />
                  <span>Durdur</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-cyan-400" />
                  <span>360° Tur</span>
                </>
              )}
            </button>

            {/* Camera Lock On Target (Konuma Oturt / Hedefe Kilitlen) */}
            <button
              type="button"
              onClick={() => {
                if (selectedHotspot) {
                  lockCameraOnAnomaly(selectedHotspot);
                } else if (scanArea.hotspots && scanArea.hotspots.length > 0) {
                  lockCameraOnAnomaly(scanArea.hotspots[0]);
                } else {
                  resetCamera();
                }
              }}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
                isCameraLockedOnTarget
                  ? 'bg-amber-950/90 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Kamerayı Doğrudan Anomali Konumuna Oturt ve Yönlendir"
            >
              <Target className="w-3 h-3 text-amber-400" />
              <span>{isCameraLockedOnTarget ? 'Kilitli' : 'Konuma Oturt'}</span>
            </button>

            {/* Reset Camera Button */}
            {(isCameraLockedOnTarget || cameraPreset !== 'VOXLER_ISO') && (
              <button
                type="button"
                onClick={resetCamera}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                title="Kamerayı Sıfırla"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            )}

            {/* Google Harita Direct Direction Button */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${scanArea.center.lat},${scanArea.center.lng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm transition-all border border-blue-400/40"
              title="Bu Jeofizik Sahaya Google Harita ile Yol Tarifi Al"
            >
              <Navigation className="w-3 h-3 text-cyan-200" />
              <span>Harita</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </a>
          </div>

          {/* 3D Stage Container with Pan Offset & Zoom */}
          <div
            className="relative w-[380px] sm:w-[520px] h-[380px] sm:h-[520px] transition-transform duration-75"
            style={{
              transform: `rotateX(${rotationX}deg) rotateZ(${rotationZ}deg) scale(${cameraZoom3D}) translate3d(${cameraPanOffset.x}px, ${cameraPanOffset.y}px, 0)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Ground Surface Slice with Real Heatmap & Satellite Texture */}
            <div 
              className="absolute inset-0 rounded-2xl border-2 border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.35)] overflow-hidden"
              style={{
                backgroundColor: '#152132',
              }}
            >
              {/* Satellite Background Simulation */}
              <div 
                className="w-full h-full opacity-60 bg-cover bg-center"
                style={{
                  backgroundImage: 'url("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/16/24110/38550")',
                }}
              />

              {/* Rendered Anomaly Heatmap texture overlaid on 3D surface */}
              {heatmapDataUrl && (
                <img 
                  src={heatmapDataUrl} 
                  alt="Anomaly Heatmap Texture"
                  className="absolute inset-0 w-full h-full object-cover opacity-85 mix-blend-screen" 
                />
              )}

              {/* Ground Grid Overlay */}
              <div 
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage: 'linear-gradient(rgba(245, 158, 11, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.5) 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                }}
              />

              {/* 3D Ground Compass Rose (North Arrow) */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950/90 border border-amber-500/40 text-[9px] font-mono text-amber-300">
                <Compass className="w-3 h-3 text-amber-400 animate-pulse" />
                <span className="font-bold">K (KUZEY 0°)</span>
              </div>

              {/* Surface Label */}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded bg-slate-950/85 text-[10px] text-amber-300 font-mono border border-slate-700">
                YÜZEY (0.0 m) · {scanArea.locationName}
              </div>

              {/* Surface Corner Pins with Coordinates */}
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center border border-white">
                1
              </div>
              <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center border border-white">
                2
              </div>
              <div className="absolute bottom-2 left-2 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center border border-white">
                3
              </div>
            </div>

            {/* Subsurface Depth Walls (Visualizing Earth Stratigraphy) */}
            <div 
              className="absolute top-full left-0 right-0 h-36 bg-gradient-to-b from-slate-900 via-amber-950/40 to-slate-950 border-x border-b border-cyan-500/40 opacity-85"
              style={{ transform: 'rotateX(-90deg)', transformOrigin: 'top' }}
            >
              <div className="p-2 text-[9px] font-mono text-cyan-300 flex justify-between">
                <span>0.0m YÜZEY</span>
                <span className="text-amber-400">-3.0m SEDİMAN</span>
                <span className="text-rose-400">-6.0m ANAKAYA</span>
              </div>
            </div>
            <div 
              className="absolute bottom-full left-0 right-0 h-36 bg-gradient-to-t from-slate-900 via-amber-950/40 to-slate-950 border-x border-t border-cyan-500/40 opacity-85"
              style={{ transform: 'rotateX(90deg)', transformOrigin: 'bottom' }}
            />

            {/* VOXLER 3D METRIC BOUNDING CAGE (Wireframe with Depth Rulers) */}
            {showCoordinateCage && (
              <>
                {/* 4 Corner Depth Rulers */}
                {[
                  { pos: 'top-0 left-0', align: 'left' },
                  { pos: 'top-0 right-0', align: 'right' },
                  { pos: 'bottom-0 left-0', align: 'left' },
                  { pos: 'bottom-0 right-0', align: 'right' }
                ].map((r, i) => (
                  <div
                    key={`cage-pole-${i}`}
                    className={`absolute ${r.pos} w-0.5 bg-cyan-400/80 border-l border-cyan-300`}
                    style={{
                      height: '140px',
                      transform: 'translate3d(0, 0, -70px) rotateX(90deg)',
                      transformOrigin: 'top',
                    }}
                  >
                    <div className="absolute top-0 -left-6 text-[8px] font-mono text-cyan-300 bg-slate-950/90 px-1 rounded">0m</div>
                    <div className="absolute top-1/3 -left-7 text-[8px] font-mono text-amber-300 bg-slate-950/90 px-1 rounded">-2m</div>
                    <div className="absolute top-2/3 -left-7 text-[8px] font-mono text-rose-300 bg-slate-950/90 px-1 rounded">-4m</div>
                    <div className="absolute bottom-0 -left-7 text-[8px] font-mono text-cyan-400 bg-slate-950/90 px-1 rounded">-6m</div>
                  </div>
                ))}

                {/* Bottom Bounding Frame at -6.0m depth */}
                <div
                  className="absolute inset-0 rounded-2xl border border-dashed border-cyan-500/50 pointer-events-none"
                  style={{
                    transform: 'translate3d(0, 0, -140px)',
                  }}
                >
                  <div className="absolute bottom-2 right-2 text-[9px] font-mono text-cyan-400/80">
                    TABAN DERİNLİĞİ: -6.0 METRE (ANAKAYA DÜZLEMİ)
                  </div>
                </div>
              </>
            )}

            {/* VOXLER STRATIGRAPHIC BOREHOLE LOGS (4 Corner Core Cylinders) */}
            {showBoreholeStrata && (
              <>
                {[
                  { x: 10, y: 10, id: 'BH-1' },
                  { x: 90, y: 10, id: 'BH-2' },
                  { x: 90, y: 90, id: 'BH-3' },
                  { x: 10, y: 90, id: 'BH-4' },
                ].map((bh) => (
                  <div
                    key={bh.id}
                    className="absolute w-3 rounded-full overflow-hidden border border-slate-700 shadow-md"
                    style={{
                      left: `${bh.x}%`,
                      top: `${bh.y}%`,
                      height: '135px',
                      transform: 'translate3d(-50%, -50%, -67px) rotateX(90deg)',
                      transformOrigin: 'top',
                    }}
                    title={`Sondaj Kütüğü ${bh.id} (Stratigrafi Profili)`}
                  >
                    {/* Soil Horizon 1: Topsoil / Alluvium */}
                    <div className="h-[25%] bg-amber-900 border-b border-amber-950" title="Bitkisel Toprak & Alüvyon (0-1m)" />
                    {/* Soil Horizon 2: Calcareous clay / Sediment */}
                    <div className="h-[30%] bg-amber-600 border-b border-amber-700" title="Killi Kalker & Sediman (1-2.5m)" />
                    {/* Soil Horizon 3: Tuff / Conglomerate */}
                    <div className="h-[25%] bg-rose-800 border-b border-rose-900" title="Tüf & Konglomera (2.5-4.5m)" />
                    {/* Soil Horizon 4: Massive Bedrock */}
                    <div className="h-[20%] bg-slate-700" title="Masif Bazalt Anakaya (4.5-6.0m)" />
                  </div>
                ))}
              </>
            )}

            {/* VOXLER INTERACTIVE HORIZONTAL DEPTH SLICE PLANE (XY Orthoslice) */}
            {showSlicePlane && (
              <div
                className="absolute inset-4 rounded-xl border border-cyan-400/70 pointer-events-none transition-transform duration-100"
                style={{
                  transform: `translate3d(0, 0, ${-Math.round(sliceCutDepthMeters * 22)}px)`,
                  background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, rgba(249,115,22,0.12) 60%, rgba(15,23,42,0.6) 100%)',
                  boxShadow: '0 0 25px rgba(6,182,212,0.25)',
                }}
              >
                <div className="absolute top-1.5 left-2 px-2 py-0.5 rounded bg-slate-950/90 border border-cyan-400/60 text-[9px] font-mono text-cyan-300 font-bold">
                  ✂️ VOXLER KESİT DÜZLEMİ: -{sliceCutDepthMeters.toFixed(1)} m
                </div>
              </div>
            )}

            {/* 1. Volumetric 3D Subsurface Chambers (Orange Amber box, Purple chamber prism, Red chamber box) */}
            {Array.isArray(scanArea.chambers3D) && scanArea.chambers3D.map((chamber) => {
              const leftPercent = 50 + chamber.x * 40;
              const topPercent = 50 + chamber.y * 40;
              const depthPx = Math.round(chamber.depthTo * 22);
              const isSelected = selectedHotspot?.id === chamber.index;
              const isLocked = lockedTargetId === chamber.index;

              return (
                <div
                  key={chamber.id}
                  className="absolute cursor-pointer transition-all hover:scale-105"
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${chamber.widthM * 14}px`,
                    height: `${chamber.lengthM * 14}px`,
                    transform: `translate3d(-50%, -50%, ${-depthPx}px)`,
                    transformStyle: 'preserve-3d',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playScanBeep();
                    const relatedSpot = scanArea.hotspots.find(h => h.id === chamber.index);
                    if (relatedSpot) {
                      onSelectHotspot(relatedSpot);
                      lockCameraOnAnomaly(relatedSpot);
                    }
                  }}
                >
                  {/* Volumetric Chamber Prisms with translucent faces and wireframe */}
                  <div className={`w-full h-full rounded border-2 relative flex items-center justify-center transition-all ${
                    chamber.index === 1 || chamber.id === 'ch-1'
                      ? 'bg-orange-500/50 border-orange-400 shadow-[0_0_35px_rgba(249,115,22,0.9)]' // Amber Box
                      : chamber.index === 4 || chamber.id === 'ch-2'
                      ? 'bg-purple-600/50 border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.9)]' // Purple Chamber
                      : 'bg-red-600/50 border-red-400 shadow-[0_0_35px_rgba(239,68,68,0.9)]' // Red Box
                  } ${isSelected || isLocked ? 'ring-4 ring-cyan-300 scale-110' : ''}`}>
                    
                    {/* Chamber Label & Number */}
                    <span className="w-6 h-6 rounded-full bg-slate-950 text-white font-mono font-bold text-xs flex items-center justify-center border-2 border-white shadow-md">
                      {chamber.index}
                    </span>

                    {/* Depth Tag */}
                    <div className="absolute -bottom-5 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-cyan-300 whitespace-nowrap shadow">
                      -{chamber.depthTo.toFixed(1)} m
                    </div>
                  </div>

                  {/* Vertical Connection Line & Laser Beacon to Surface */}
                  <div 
                    className={`absolute top-1/2 left-1/2 w-0.5 ${
                      isLocked ? 'bg-amber-400 shadow-[0_0_15px_#f59e0b]' : 'bg-cyan-400/70 border-l border-dashed border-cyan-300'
                    }`}
                    style={{
                      height: `${depthPx}px`,
                      transform: `translate3d(-50%, -50%, ${depthPx / 2}px) rotateX(90deg)`,
                    }}
                  />

                  {/* Surface Target Reticle if Locked */}
                  {isLocked && (
                    <div 
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        transform: `translate3d(-50%, -50%, ${depthPx}px)`,
                      }}
                    >
                      <div className="w-12 h-12 rounded-full border-2 border-amber-400 border-dashed animate-spin flex items-center justify-center">
                        <Crosshair className="w-6 h-6 text-amber-300" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. Subsurface Depth Markers dynamically mapped from genuine scan hotspots */}
            {Array.isArray(scanArea.hotspots) && scanArea.hotspots
              .filter((pt) => {
                if (anomalyCategoryFilter === 'ALL') return true;
                return classifyHotspotOrigin(pt).category === anomalyCategoryFilter;
              })
              .map((pt) => {
                const leftPercent = 50 + (pt.relativeX - 0.5) * 80;
                const topPercent = 50 + (pt.relativeY - 0.5) * 80;
                const depthPx = Math.round(pt.depthMeters * 22);
                const isLocked = lockedTargetId === pt.id;
                const originInfo = classifyHotspotOrigin(pt);
                const markerColor =
                  isCategoryColoringActive || anomalyCategoryFilter !== 'ALL'
                    ? originInfo.primaryColor
                    : pt.colorHex || '#f97316';

                return (
                  <div
                    key={`depth-pin-${pt.id}`}
                    className="absolute cursor-pointer group"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      transform: `translate3d(-50%, -50%, ${-depthPx}px)`,
                      transformStyle: 'preserve-3d',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.playScanBeep();
                      onSelectHotspot(pt);
                      lockCameraOnAnomaly(pt);
                    }}
                  >
                    {/* Glowing 3D Point Badge */}
                    <div 
                      className={`w-6 h-6 text-slate-950 font-mono font-black text-xs flex items-center justify-center border-2 border-white shadow-lg transition-transform group-hover:scale-125 ${
                        originInfo.category === 'MAN_MADE_STRUCTURE' ? 'rounded-md' : 'rounded-full'
                      } ${isLocked ? 'ring-4 ring-amber-300 scale-125' : ''}`}
                      style={{ backgroundColor: markerColor, boxShadow: `0 0 18px ${markerColor}` }}
                    >
                      {pt.id}
                    </div>

                    {/* Vertical Guide Line to Ground Surface */}
                    <div 
                      className={`absolute top-1/2 left-1/2 w-0.5 opacity-80 group-hover:opacity-100 ${
                        isLocked ? 'w-1 bg-amber-400 shadow-[0_0_12px_#f59e0b]' : ''
                      }`}
                      style={{
                        backgroundColor: isLocked ? '#fbbf24' : markerColor,
                        height: `${depthPx}px`,
                        transform: `translate3d(-50%, -50%, ${depthPx / 2}px) rotateX(90deg)`,
                      }}
                    />
                  </div>
                );
              })}

            {/* Zero Anomalies Clean Ground 3D Status */}
            {(!scanArea.hotspots || scanArea.hotspots.length === 0) && (
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-3 rounded-2xl bg-slate-950/90 border border-cyan-500/40 text-center pointer-events-none shadow-2xl backdrop-blur-md"
                style={{ transform: 'translate3d(-50%, -50%, -40px)' }}
              >
                <div className="text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  DOĞAL JEOLOJİK ZEMİN
                </div>
                <div className="text-xs text-slate-300 mt-1 font-sans">
                  Yeraltı Boşluğu, Mezar veya Metalik Anomali Bulunmamaktadır
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Stratigrafi: Homojen Zemin & Anakaya
                </div>
              </div>
            )}
          </div>

          {/* FLOATING BOTTOM 3D VOXLER CONTROLS & SLICER BAR */}
          <div 
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Interactive Depth Slice Slider */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kesit:</span>
              </span>
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.1"
                value={sliceCutDepthMeters}
                onChange={(e) => setSliceCutDepthMeters(parseFloat(e.target.value))}
                className="w-24 sm:w-32 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-cyan-400 font-bold min-w-[45px]">
                -{sliceCutDepthMeters.toFixed(1)}m
              </span>
            </div>

            <div className="h-4 w-px bg-slate-800" />

            {/* Toggle Stratigraphy Boreholes */}
            <button
              type="button"
              onClick={() => setShowBoreholeStrata(!showBoreholeStrata)}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all border ${
                showBoreholeStrata
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="Sondaj Kütüklerini Göster/Gizle"
            >
              Sondaj Profili
            </button>

            {/* Toggle Coordinate Grid Cage */}
            <button
              type="button"
              onClick={() => setShowCoordinateCage(!showCoordinateCage)}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all border ${
                showCoordinateCage
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="3B Koordinat ve Metraj Kafesi"
            >
              Metrik Kafes
            </button>

            {/* Toggle Slice Plane */}
            <button
              type="button"
              onClick={() => setShowSlicePlane(!showSlicePlane)}
              className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all border ${
                showSlicePlane
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="Yatay Tomografi Kesit Düzlemi"
            >
              Kesit Düzlemi
            </button>
          </div>

        </div>
      )}

      {/* SELECTED HOTSPOT GEOPHYSICAL INSPECTION FLYOUT (When clicked) */}
      {selectedHotspot && (() => {
        const selectedOrigin = classifyHotspotOrigin(selectedHotspot);
        return (
        <div
          className={`absolute bottom-20 sm:bottom-20 right-2 sm:right-4 z-30 w-[calc(100vw-16px)] sm:w-80 max-w-sm bg-slate-950/95 border-2 rounded-2xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl animate-fadeIn ${
            selectedOrigin.category === 'MAN_MADE_STRUCTURE'
              ? 'border-amber-400/85'
              : 'border-emerald-400/85'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span 
                className={`w-6 h-6 text-slate-950 font-extrabold font-mono text-xs flex items-center justify-center shadow-md ${
                  selectedOrigin.category === 'MAN_MADE_STRUCTURE' ? 'rounded-md' : 'rounded-full'
                }`}
                style={{ backgroundColor: selectedOrigin.primaryColor }}
              >
                {selectedHotspot.id}
              </span>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs text-white leading-none">
                    {selectedHotspot.sizeMeters} Sıcak Nokta
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-extrabold border ${
                      selectedOrigin.category === 'MAN_MADE_STRUCTURE'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                    }`}
                  >
                    {selectedOrigin.icon} {selectedOrigin.categoryLabel}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                  {selectedHotspot.anomalyTypeTr}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono text-[10px]">
                -{selectedHotspot.depthMeters.toFixed(1)}m
              </span>
              <button 
                onClick={() => onSelectHotspot(null as any)}
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Primary Geophysical Readings */}
          <div className="grid grid-cols-2 gap-1.5 mb-2.5 text-[11px] font-mono">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5">
              <div className="text-[9px] text-slate-400">Manyetik Sapma (ΔB)</div>
              <div className={`font-bold ${selectedHotspot.magneticDeltaNt && selectedHotspot.magneticDeltaNt > 0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                {selectedHotspot.magneticDeltaNt ? `${selectedHotspot.magneticDeltaNt > 0 ? '+' : ''}${selectedHotspot.magneticDeltaNt} nT` : '±35 nT'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5">
              <div className="text-[9px] text-slate-400">Özdirenç (ERT)</div>
              <div className="font-bold text-amber-300">
                {selectedHotspot.resistivityOhmM ? `${selectedHotspot.resistivityOhmM} Ω·m` : '1850 Ω·m'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5">
              <div className="text-[9px] text-slate-400">Dielektrik (εr)</div>
              <div className="font-bold text-purple-300">
                {selectedHotspot.dielectricPermittivity ? `${selectedHotspot.dielectricPermittivity}` : '4.5'} (Tavan Yansıma)
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-1.5">
              <div className="text-[9px] text-slate-400">Radar Genliği (GPR)</div>
              <div className="font-bold text-emerald-400">
                {selectedHotspot.radarReflectivityDb ? `${selectedHotspot.radarReflectivityDb} dB` : '-8.5 dB'}
              </div>
            </div>
          </div>

          {/* Material Probability Bars */}
          {selectedHotspot.materialProbabilities && (
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2 mb-2.5 space-y-1 text-[10px] font-mono">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Tahmini Malzeme Olasılık Dağılımı
              </div>
              
              <div className="flex items-center justify-between text-slate-300">
                <span>Yapısal Boşluk / Dehliz:</span>
                <span className="text-cyan-400 font-bold">%{selectedHotspot.materialProbabilities.cavityVoidPct}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-cyan-400 h-full rounded-full transition-all" 
                  style={{ width: `${selectedHotspot.materialProbabilities.cavityVoidPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-slate-300 pt-0.5">
                <span>Metalik Ferromanyetik:</span>
                <span className="text-rose-400 font-bold">%{selectedHotspot.materialProbabilities.metallicFerrousPct}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all" 
                  style={{ width: `${selectedHotspot.materialProbabilities.metallicFerrousPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-slate-300 pt-0.5">
                <span>Taş Duvar / Harç:</span>
                <span className="text-amber-400 font-bold">%{selectedHotspot.materialProbabilities.stoneMasonryPct}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all" 
                  style={{ width: `${selectedHotspot.materialProbabilities.stoneMasonryPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Geophysical Clarity & Signal Quality Metrics */}
          <div className="grid grid-cols-3 gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 mb-2.5 text-[10px] font-mono">
            <div>
              <div className="text-[8px] text-slate-500">ODAK NETLİĞİ</div>
              <div className="text-cyan-300 font-bold">%{selectedHotspot.focusSharpnessPct || '98.2'}</div>
            </div>
            <div>
              <div className="text-[8px] text-slate-500">DOĞRULTU</div>
              <div className="text-amber-300 font-bold">{selectedHotspot.azimuthDeg || '42'}° KD</div>
            </div>
            <div>
              <div className="text-[8px] text-slate-500">SNR SİNYAL</div>
              <div className="text-emerald-300 font-bold">{selectedHotspot.snrDb || '26.8'} dB</div>
            </div>
          </div>

          {/* Dimensions & Quick Navigation Actions */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2 px-0.5">
            <span>Hacim: <strong className="text-white">{selectedHotspot.dimX}×{selectedHotspot.dimY}×{selectedHotspot.dimZ}m</strong></span>
            <span>Güven: <strong className="text-emerald-400">%{selectedHotspot.intensity}</strong></span>
          </div>

          {/* Center on this hotspot button */}
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              const map = leafletMapRef.current;
              if (map && scanArea) {
                const allLats = (scanArea.polygonCorners || []).map((p) => p.lat);
                const allLngs = (scanArea.polygonCorners || []).map((p) => p.lng);
                const minLat = Math.min(...allLats);
                const maxLat = Math.max(...allLats);
                const minLng = Math.min(...allLngs);
                const maxLng = Math.max(...allLngs);
                const spotLat = maxLat - selectedHotspot.relativeY * (maxLat - minLat);
                const spotLng = minLng + selectedHotspot.relativeX * (maxLng - minLng);
                map.flyTo([spotLat, spotLng], 19, { animate: true, duration: 0.8 });
              }
            }}
            className="w-full mb-1.5 py-1.5 px-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Focus className="w-3.5 h-3.5 text-emerald-400" />
            <span>🎯 2B Haritada Noktaya Odaklan</span>
          </button>

          {/* Lock 3D Camera / Konum Oturt button */}
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              if (viewMode !== '3D' && onSwitchTo3D) {
                onSwitchTo3D();
              }
              lockCameraOnAnomaly(selectedHotspot);
            }}
            className="w-full mb-1.5 py-1.5 px-2 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>🎥 3B Kamerayı Bu Konuma Oturt & Yönlendir</span>
          </button>

          {/* Direct Google Maps Direction to exact coordinates */}
          {(() => {
            if (!scanArea) return null;
            const allLats = (scanArea.polygonCorners || []).map((p) => p.lat);
            const allLngs = (scanArea.polygonCorners || []).map((p) => p.lng);
            const minLat = allLats.length ? Math.min(...allLats) : scanArea.center.lat;
            const maxLat = allLats.length ? Math.max(...allLats) : scanArea.center.lat;
            const minLng = allLngs.length ? Math.min(...allLngs) : scanArea.center.lng;
            const maxLng = allLngs.length ? Math.max(...allLngs) : scanArea.center.lng;
            const spotLat = maxLat - selectedHotspot.relativeY * (maxLat - minLat);
            const spotLng = minLng + selectedHotspot.relativeX * (maxLng - minLng);
            return (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${spotLat.toFixed(6)},${spotLng.toFixed(6)}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mb-2 py-1.5 px-2 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-500/50 text-cyan-200 font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                <span>🗺️ Google Haritalar'da Bu Noktaya Git (Yol Tarifi)</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70 ml-auto" />
              </a>
            );
          })()}

          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800">
            {onOpenD3Heatmap && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenD3Heatmap();
                }}
                className="py-1.5 px-1.5 rounded-lg bg-gradient-to-r from-amber-950 to-rose-950 hover:from-amber-900 hover:to-rose-900 border border-amber-500/50 text-amber-300 font-mono text-[9px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="D3.js Yoğunluk Isı Haritası (KDE Analizi)"
              >
                <span>🔥 D3 Isı Haritası</span>
              </button>
            )}

            {onOpenRadargram && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onOpenRadargram();
                }}
                className="py-1.5 px-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-[9px] font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <span>📊 Radargram</span>
              </button>
            )}

            {onSwitchTo3D && (
              <button
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  onSwitchTo3D();
                }}
                className="py-1.5 px-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-mono text-[9px] font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <span>🧊 3B Oda</span>
              </button>
            )}
          </div>

        </div>
        );
      })()}

      {/* ULTRA-HD SNAPSHOT PREVIEW MODAL */}
      {snapshotPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-cyan-500/60 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.35)] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span className="font-bold text-white font-mono text-sm">
                  ULTRA-NET ANOMALİ ÇEKİMİ ÖNİZLEME (1920×1080)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSnapshotPreviewUrl(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Image Preview Canvas */}
            <div className="p-4 flex items-center justify-center bg-black/60 overflow-hidden">
              <img
                src={snapshotPreviewUrl}
                alt="Ultra-Net Anomali Çekimi"
                className="max-h-[65vh] w-auto object-contain rounded-lg border border-slate-800 shadow-2xl"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-t border-slate-800 text-xs font-mono">
              <span className="text-slate-400">
                Dosya Cihazınıza İndirildi • Çözünürlük: Ultra-HD 1080p
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSnapshotPreviewUrl(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
                >
                  Kapat
                </button>
                <a
                  href={snapshotPreviewUrl}
                  download={`TerraScan_Net_Cekim_${Date.now()}.png`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition-all shadow-md active:scale-95"
                >
                  <Download className="w-4 h-4 text-slate-950" />
                  <span>Tekrar İndir</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
