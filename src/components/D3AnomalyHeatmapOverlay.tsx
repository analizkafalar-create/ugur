/**
 * TerraScan AI - D3 Anomaly Density & Heat Intensity Map Visualizer
 * High-precision 2D Kernel Density Estimation (KDE) and Iso-intensity Contour Engine
 * Built with D3.js (d3-contour, d3-scale, d3-scale-chromatic, d3-shape, d3-axis)
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  ScanArea, 
  AnomalyHotspot, 
  DepthFilter 
} from '../types';
import { sound } from '../utils/anomalyEngine';
import { 
  Activity, 
  Layers, 
  Sliders, 
  Eye, 
  Crosshair, 
  Compass, 
  Download, 
  Maximize2, 
  Minimize2, 
  X, 
  Sparkles, 
  TrendingUp, 
  HelpCircle,
  Filter,
  Check
} from 'lucide-react';

export type D3ColorPalette = 'TURBO' | 'INFERNO' | 'MAGMA' | 'PLASMA' | 'WARM' | 'VIRIDIS' | 'SPECTRAL';

interface D3AnomalyHeatmapProps {
  scanArea: ScanArea | null;
  selectedHotspot: AnomalyHotspot | null;
  onSelectHotspot?: (hotspot: AnomalyHotspot) => void;
  depthFilter?: DepthFilter;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const D3AnomalyHeatmapOverlay: React.FC<D3AnomalyHeatmapProps> = ({
  scanArea,
  selectedHotspot,
  onSelectHotspot,
  depthFilter,
  onClose,
  isEmbedded = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Visualization settings
  const [colorPalette, setColorPalette] = useState<D3ColorPalette>('TURBO');
  const [opacity, setOpacity] = useState<number>(0.85);
  const [bandwidth, setBandwidth] = useState<number>(24); // Kernel radius in grid units
  const [contourThresholds, setContourThresholds] = useState<number>(14);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showFilledHeat, setShowFilledHeat] = useState<boolean>(true);
  const [showGridLines, setShowGridLines] = useState<boolean>(true);
  const [showHotspotCentroids, setShowHotspotCentroids] = useState<boolean>(true);
  const [showMarginalProfiles, setShowMarginalProfiles] = useState<boolean>(true);
  const [showGradientVectors, setShowGradientVectors] = useState<boolean>(false);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'METAL' | 'MINERAL' | 'CAVITY' | 'STRUCTURE'>('ALL');
  const [activeDepthSlice, setActiveDepthSlice] = useState<number>(5.0); // max depth meter
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Interactive Hover Probe / Inspection State
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    svgX: number;
    svgY: number;
    lat: number;
    lng: number;
    density: number;
    nearestHotspot?: AnomalyHotspot;
    interpolatedType?: string;
  } | null>(null);

  // Color interpolator resolver
  const getColorInterpolator = (palette: D3ColorPalette) => {
    switch (palette) {
      case 'INFERNO': return d3.interpolateInferno;
      case 'MAGMA': return d3.interpolateMagma;
      case 'PLASMA': return d3.interpolatePlasma;
      case 'WARM': return d3.interpolateWarm;
      case 'VIRIDIS': return d3.interpolateViridis;
      case 'SPECTRAL': return (t: number) => d3.interpolateSpectral(1 - t);
      case 'TURBO':
      default:
        return d3.interpolateTurbo;
    }
  };

  // Filtered hotspots based on depth and anomaly type
  const filteredHotspots = useMemo(() => {
    if (!scanArea || !scanArea.hotspots) return [];
    return scanArea.hotspots.filter(h => {
      const matchType = typeFilter === 'ALL' || h.anomalyType === typeFilter;
      const matchDepth = h.depthMeters <= activeDepthSlice && 
        (!depthFilter || (h.depthMeters >= depthFilter.minDepth && h.depthMeters <= depthFilter.maxDepth));
      return matchType && matchDepth;
    });
  }, [scanArea, typeFilter, activeDepthSlice, depthFilter]);

  // Coordinate Bounding Box & Scale Calculations
  const coordBounds = useMemo(() => {
    if (!scanArea || !scanArea.center) {
      return { minLat: 38.476, maxLat: 38.478, minLng: 29.727, maxLng: 29.730, widthM: 120, heightM: 120 };
    }
    const corners = scanArea.polygonCorners && scanArea.polygonCorners.length >= 3 
      ? scanArea.polygonCorners 
      : [
          { lat: scanArea.center.lat + 0.00065, lng: scanArea.center.lng - 0.00085 },
          { lat: scanArea.center.lat + 0.00065, lng: scanArea.center.lng + 0.00085 },
          { lat: scanArea.center.lat - 0.00065, lng: scanArea.center.lng + 0.00085 },
          { lat: scanArea.center.lat - 0.00065, lng: scanArea.center.lng - 0.00085 },
        ];

    const lats = corners.map(c => c.lat);
    const lngs = corners.map(c => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Approximate width and height in meters (1 deg lat ~ 111,139m, 1 deg lng ~ 111,139 * cos(lat) m)
    const latDistM = (maxLat - minLat) * 111139;
    const lngDistM = (maxLng - minLng) * 111139 * Math.cos((minLat + maxLat) * Math.PI / 360);

    return {
      minLat,
      maxLat,
      minLng,
      maxLng,
      widthM: Math.max(20, Math.round(lngDistM)),
      heightM: Math.max(20, Math.round(latDistM)),
      corners,
    };
  }, [scanArea]);

  // Main D3 Rendering Effect
  useEffect(() => {
    if (!svgRef.current || !scanArea) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Dimensions
    const width = 640;
    const height = 640;
    const margin = { top: 40, right: 50, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Grid resolution for 2D density computation
    const gridN = 100;
    const gridM = 100;
    const values = new Float64Array(gridN * gridM);

    // Populate density scalar field from hotspots, chambers & corridors
    filteredHotspots.forEach(spot => {
      const sx = spot.relativeX * gridN;
      const sy = spot.relativeY * gridM;
      const weight = (spot.intensity / 100) * (spot.score / 10) * 1.5;
      const sigma = (bandwidth / 100) * gridN * (0.8 + (spot.dimX + spot.dimY) / 10);
      const sigmaSq2 = 2 * sigma * sigma;

      for (let y = 0; y < gridM; y++) {
        for (let x = 0; x < gridN; x++) {
          const dx = x - sx;
          const dy = y - sy;
          const distSq = dx * dx + dy * dy;
          if (distSq < 3.5 * sigmaSq2) {
            const kernel = Math.exp(-distSq / sigmaSq2);
            values[y * gridN + x] += weight * kernel;
          }
        }
      }
    });

    // Incorporate chambers2D
    if (scanArea.chambers2D) {
      scanArea.chambers2D.forEach(ch => {
        const sx = ch.relX * gridN;
        const sy = ch.relY * gridM;
        const weight = 0.85;
        const sigma = (bandwidth / 100) * gridN * 0.7;
        const sigmaSq2 = 2 * sigma * sigma;

        for (let y = 0; y < gridM; y++) {
          for (let x = 0; x < gridN; x++) {
            const dx = x - sx;
            const dy = y - sy;
            const distSq = dx * dx + dy * dy;
            if (distSq < 3.0 * sigmaSq2) {
              values[y * gridN + x] += weight * Math.exp(-distSq / sigmaSq2);
            }
          }
        }
      });
    }

    // Incorporate corridors
    if (scanArea.corridors) {
      scanArea.corridors.forEach(corr => {
        corr.points.forEach(pt => {
          const sx = pt.relX * gridN;
          const sy = pt.relY * gridM;
          const sigma = (bandwidth / 100) * gridN * 0.45;
          const sigmaSq2 = 2 * sigma * sigma;
          for (let y = 0; y < gridM; y++) {
            for (let x = 0; x < gridN; x++) {
              const dx = x - sx;
              const dy = y - sy;
              const distSq = dx * dx + dy * dy;
              if (distSq < 2.5 * sigmaSq2) {
                values[y * gridN + x] += 0.45 * Math.exp(-distSq / sigmaSq2);
              }
            }
          }
        });
      });
    }

    // Find max density value for normalization
    let maxVal = 0;
    for (let i = 0; i < values.length; i++) {
      if (values[i] > maxVal) maxVal = values[i];
    }
    if (maxVal === 0) maxVal = 1;

    // Normalize density values 0 to 1
    for (let i = 0; i < values.length; i++) {
      values[i] = values[i] / maxVal;
    }

    // Generate D3 Contours
    const thresholds = d3.range(0.05, 1.0, 1.0 / contourThresholds);
    const contourGenerator = d3.contours()
      .size([gridN, gridM])
      .thresholds(thresholds);

    const contours = contourGenerator(Array.from(values));

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, innerHeight]);

    const lngScale = d3.scaleLinear()
      .domain([0, 1])
      .range([coordBounds.minLng, coordBounds.maxLng]);

    const latScale = d3.scaleLinear()
      .domain([0, 1])
      .range([coordBounds.maxLat, coordBounds.minLat]);

    const colorInterpolator = getColorInterpolator(colorPalette);
    const colorScale = d3.scaleSequential(colorInterpolator).domain([0, 1]);

    // Geo Path Generator configured with transformed coordinates
    const pathTransform = d3.geoTransform({
      point: function(x, y) {
        this.stream.point(
          (x / gridN) * innerWidth,
          (y / gridM) * innerHeight
        );
      }
    });
    const geoPath = d3.geoPath().projection(pathTransform);

    // Defs & Gradients
    const defs = svg.append('defs');

    // Glow filter for high density cores
    const filter = defs.append('filter')
      .attr('id', 'd3-heat-glow')
      .attr('x', '-30%')
      .attr('y', '-30%')
      .attr('width', '160%')
      .attr('height', '160%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Clip path for inner area
    defs.append('clipPath')
      .attr('id', 'd3-plane-clip')
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('rx', 8)
      .attr('ry', 8);

    const rootG = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 1. Radar Grid / Coordinate Plane Background
    const bgG = rootG.append('g').attr('clip-path', 'url(#d3-plane-clip)');
    
    bgG.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', '#020617')
      .attr('stroke', '#06b6d4')
      .attr('stroke-opacity', 0.3);

    // Coordinate Grid Mesh
    if (showGridLines) {
      const gridTicks = 8;
      for (let i = 1; i < gridTicks; i++) {
        const xPos = (i / gridTicks) * innerWidth;
        const yPos = (i / gridTicks) * innerHeight;

        // Vertical lines
        bgG.append('line')
          .attr('x1', xPos)
          .attr('y1', 0)
          .attr('x2', xPos)
          .attr('y2', innerHeight)
          .attr('stroke', '#1e293b')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');

        // Horizontal lines
        bgG.append('line')
          .attr('x1', 0)
          .attr('y1', yPos)
          .attr('x2', innerWidth)
          .attr('y2', yPos)
          .attr('stroke', '#1e293b')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');
      }

      // Radar Concentric Range Rings from Center
      const centerX = innerWidth / 2;
      const centerY = innerHeight / 2;
      const maxRadius = Math.min(innerWidth, innerHeight) * 0.48;
      [0.25, 0.5, 0.75, 1.0].forEach(rRatio => {
        bgG.append('circle')
          .attr('cx', centerX)
          .attr('cy', centerY)
          .attr('r', maxRadius * rRatio)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(6, 182, 212, 0.12)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4,4');
      });
    }

    // 2. Filled Heat Density Contours Layer
    const heatG = rootG.append('g')
      .attr('clip-path', 'url(#d3-plane-clip)')
      .attr('opacity', opacity);

    if (showFilledHeat) {
      heatG.selectAll('path.filled-contour')
        .data(contours)
        .enter()
        .append('path')
        .attr('class', 'filled-contour')
        .attr('d', geoPath as any)
        .attr('fill', (d: any) => colorScale(d.value))
        .attr('fill-opacity', (d: any) => {
          // Non-linear alpha curve for vivid core visibility
          return Math.pow(d.value, 0.75) * 0.88 + 0.05;
        })
        .attr('stroke', 'none');
    }

    // 3. Isodensity Contour Lines & Value Labels
    if (showContours) {
      const contourLinesG = rootG.append('g').attr('clip-path', 'url(#d3-plane-clip)');
      
      contourLinesG.selectAll('path.contour-line')
        .data(contours)
        .enter()
        .append('path')
        .attr('class', 'contour-line')
        .attr('d', geoPath as any)
        .attr('fill', 'none')
        .attr('stroke', (d: any) => {
          return d.value > 0.6 ? '#ffffff' : colorScale(Math.min(1, d.value + 0.25));
        })
        .attr('stroke-width', (d: any) => d.value > 0.7 ? 1.8 : 1.0)
        .attr('stroke-opacity', (d: any) => 0.45 + d.value * 0.5)
        .attr('stroke-dasharray', (d: any) => d.value < 0.2 ? '3,3' : 'none');
    }

    // 4. Gradient Flow Vectors (Arrows pointing in direction of highest density gradient)
    if (showGradientVectors) {
      const vectorG = rootG.append('g').attr('clip-path', 'url(#d3-plane-clip)');
      const step = 6;
      for (let y = step; y < gridM - step; y += step) {
        for (let x = step; x < gridN - step; x += step) {
          const val = values[y * gridN + x];
          if (val > 0.15) {
            // Compute central difference gradient
            const gx = (values[y * gridN + (x + 1)] - values[y * gridN + (x - 1)]) * 0.5;
            const gy = (values[(y + 1) * gridN + x] - values[(y - 1) * gridN + x]) * 0.5;
            const mag = Math.sqrt(gx * gx + gy * gy);
            if (mag > 0.005) {
              const angle = Math.atan2(gy, gx);
              const px = (x / gridN) * innerWidth;
              const py = (y / gridM) * innerHeight;
              const len = Math.min(14, mag * 220);

              vectorG.append('line')
                .attr('x1', px)
                .attr('y1', py)
                .attr('x2', px + Math.cos(angle) * len)
                .attr('y2', py + Math.sin(angle) * len)
                .attr('stroke', '#38bdf8')
                .attr('stroke-width', 1.2)
                .attr('stroke-opacity', 0.6);
            }
          }
        }
      }
    }

    // 5. Structural Chambers & Corridors Outline Overlay
    if (scanArea.chambers2D) {
      const chambG = rootG.append('g').attr('clip-path', 'url(#d3-plane-clip)');
      scanArea.chambers2D.forEach((ch, idx) => {
        const cx = ch.relX * innerWidth;
        const cy = ch.relY * innerHeight;
        const w = ((ch.widthM || 6) / coordBounds.widthM) * innerWidth;
        const h = ((ch.lengthM || 4) / coordBounds.heightM) * innerHeight;

        chambG.append('rect')
          .attr('x', cx - w / 2)
          .attr('y', cy - h / 2)
          .attr('width', Math.max(8, w))
          .attr('height', Math.max(8, h))
          .attr('rx', 3)
          .attr('fill', 'rgba(234, 179, 8, 0.15)')
          .attr('stroke', '#eab308')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '2,2');

        chambG.append('text')
          .attr('x', cx)
          .attr('y', cy - h / 2 - 4)
          .attr('text-anchor', 'middle')
          .attr('fill', '#fde047')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .text(`CH-${idx + 1}`);
      });
    }

    // 6. Hotspot Centroid Crosshairs & Badges
    if (showHotspotCentroids) {
      const centroidG = rootG.append('g').attr('clip-path', 'url(#d3-plane-clip)');
      
      filteredHotspots.forEach(spot => {
        const cx = spot.relativeX * innerWidth;
        const cy = spot.relativeY * innerHeight;
        const isSelected = selectedHotspot?.id === spot.id;

        const group = centroidG.append('g')
          .attr('class', 'cursor-pointer')
          .on('click', () => {
            sound.playAnomalyDiscovered();
            if (onSelectHotspot) onSelectHotspot(spot);
          });

        // Pulsing radar target outer ring
        group.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', isSelected ? 18 : 12)
          .attr('fill', isSelected ? 'rgba(239, 68, 68, 0.25)' : 'rgba(6, 182, 212, 0.15)')
          .attr('stroke', isSelected ? '#ef4444' : (spot.colorHex || '#06b6d4'))
          .attr('stroke-width', isSelected ? 2.5 : 1.5)
          .attr('stroke-dasharray', isSelected ? 'none' : '4,2')
          .attr('filter', 'url(#d3-heat-glow)');

        // Inner solid core
        group.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', isSelected ? 5 : 3.5)
          .attr('fill', isSelected ? '#ffffff' : (spot.colorHex || '#06b6d4'))
          .attr('stroke', '#000000')
          .attr('stroke-width', 1);

        // Crosshair reticle ticks
        const retSize = isSelected ? 8 : 5;
        group.append('line').attr('x1', cx - retSize).attr('y1', cy).attr('x2', cx + retSize).attr('y2', cy).attr('stroke', '#ffffff').attr('stroke-width', 1);
        group.append('line').attr('x1', cx).attr('y1', cy - retSize).attr('x2', cx).attr('y2', cy + retSize).attr('stroke', '#ffffff').attr('stroke-width', 1);

        // Text Badge (ID & Intensity %)
        const labelG = group.append('g')
          .attr('transform', `translate(${cx + 10}, ${cy - 8})`);

        labelG.append('rect')
          .attr('x', -2)
          .attr('y', -10)
          .attr('width', 46)
          .attr('height', 14)
          .attr('rx', 3)
          .attr('fill', '#090d16')
          .attr('fill-opacity', 0.85)
          .attr('stroke', isSelected ? '#ef4444' : '#334155')
          .attr('stroke-width', 0.8);

        labelG.append('text')
          .attr('x', 21)
          .attr('y', 0)
          .attr('text-anchor', 'middle')
          .attr('fill', isSelected ? '#ef4444' : '#38bdf8')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .text(`#${spot.id} ${Math.round(spot.intensity)}%`);
      });
    }

    // 7. Marginal Density Profiles (Top Longitude and Right Latitude Density Projections)
    if (showMarginalProfiles) {
      // Top X Density Area Curve
      const topDensity = new Array(gridN).fill(0);
      for (let x = 0; x < gridN; x++) {
        let sum = 0;
        for (let y = 0; y < gridM; y++) {
          sum += values[y * gridN + x];
        }
        topDensity[x] = sum / gridM;
      }
      const maxTop = Math.max(0.01, ...topDensity);
      const topScaleY = d3.scaleLinear().domain([0, maxTop]).range([0, 24]);

      const topArea = d3.area<number>()
        .x((_, i) => (i / (gridN - 1)) * innerWidth)
        .y0(0)
        .y1(d => -topScaleY(d))
        .curve(d3.curveBasis);

      const topG = rootG.append('g');
      topG.append('path')
        .datum(topDensity)
        .attr('d', topArea)
        .attr('fill', 'rgba(6, 182, 212, 0.25)')
        .attr('stroke', '#06b6d4')
        .attr('stroke-width', 1.2);

      topG.append('text')
        .attr('x', 4)
        .attr('y', -10)
        .attr('fill', '#94a3b8')
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .text('LON DENSITY Σρ(x)');

      // Right Y Density Area Curve
      const rightDensity = new Array(gridM).fill(0);
      for (let y = 0; y < gridM; y++) {
        let sum = 0;
        for (let x = 0; x < gridN; x++) {
          sum += values[y * gridN + x];
        }
        rightDensity[y] = sum / gridN;
      }
      const maxRight = Math.max(0.01, ...rightDensity);
      const rightScaleX = d3.scaleLinear().domain([0, maxRight]).range([0, 24]);

      const rightArea = d3.area<number>()
        .y((_, i) => (i / (gridM - 1)) * innerHeight)
        .x0(innerWidth)
        .x1(d => innerWidth + rightScaleX(d))
        .curve(d3.curveBasis);

      const rightG = rootG.append('g');
      rightG.append('path')
        .datum(rightDensity)
        .attr('d', rightArea)
        .attr('fill', 'rgba(245, 158, 11, 0.25)')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.2);

      rightG.append('text')
        .attr('x', innerWidth + 6)
        .attr('y', 10)
        .attr('fill', '#94a3b8')
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .text('LAT DENSITY Σρ(y)');
    }

    // 8. Coordinate Axes (Longitude on Bottom, Latitude on Left, Scale Bar in Meters)
    const xAxis = d3.axisBottom(lngScale)
      .ticks(5)
      .tickFormat(d => (d as number).toFixed(5));

    const yAxis = d3.axisLeft(latScale)
      .ticks(5)
      .tickFormat(d => (d as number).toFixed(5));

    const axisXG = rootG.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis);

    axisXG.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace');
    axisXG.selectAll('line, path')
      .attr('stroke', '#334155');

    const axisYG = rootG.append('g')
      .call(yAxis);

    axisYG.selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace');
    axisYG.selectAll('line, path')
      .attr('stroke', '#334155');

    // Axis Titles
    rootG.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 36)
      .attr('text-anchor', 'middle')
      .attr('fill', '#38bdf8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text(`BOYLAM / EASTING (WGS84) · Genişlik ~${coordBounds.widthM}m`);

    rootG.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .attr('fill', '#38bdf8')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text(`ENLEM / NORTHING (WGS84) · Boy ~${coordBounds.heightM}m`);

    // Meter Scale Indicator at bottom-left corner
    const scaleMetersG = rootG.append('g')
      .attr('transform', `translate(12, ${innerHeight - 20})`);
    const barPx = (20 / coordBounds.widthM) * innerWidth;
    scaleMetersG.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', barPx)
      .attr('height', 4)
      .attr('fill', '#06b6d4');
    scaleMetersG.append('text')
      .attr('x', barPx / 2)
      .attr('y', -4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text('20 METRE');

    // North Arrow Indicator at top-left corner
    const northG = rootG.append('g')
      .attr('transform', 'translate(18, 18)');
    northG.append('polygon')
      .attr('points', '0,-10 4,4 0,1 -4,4')
      .attr('fill', '#ef4444');
    northG.append('text')
      .attr('x', 0)
      .attr('y', -13)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ef4444')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .text('N');

    // 9. Interactive Hover Overlay (Capture mouse movement across coordinate plane)
    const overlayRect = rootG.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair');

    overlayRect.on('mousemove', (event) => {
      const [mx, my] = d3.pointer(event);
      if (mx < 0 || mx > innerWidth || my < 0 || my > innerHeight) {
        setHoveredPoint(null);
        return;
      }
      const relX = mx / innerWidth;
      const relY = my / innerHeight;
      const gx = Math.min(gridN - 1, Math.max(0, Math.floor(relX * gridN)));
      const gy = Math.min(gridM - 1, Math.max(0, Math.floor(relY * gridM)));
      const densityVal = values[gy * gridN + gx];

      const curLat = latScale(relY);
      const curLng = lngScale(relX);

      // Find nearest hotspot
      let nearest: AnomalyHotspot | undefined;
      let minDist = Infinity;
      filteredHotspots.forEach(h => {
        const dx = (h.relativeX - relX) * innerWidth;
        const dy = (h.relativeY - relY) * innerHeight;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = h;
        }
      });

      setHoveredPoint({
        x: relX,
        y: relY,
        svgX: mx + margin.left,
        svgY: my + margin.top,
        lat: curLat,
        lng: curLng,
        density: densityVal,
        nearestHotspot: minDist < 45 ? nearest : undefined,
      });
    });

    overlayRect.on('mouseleave', () => {
      setHoveredPoint(null);
    });

  }, [
    scanArea,
    filteredHotspots,
    colorPalette,
    opacity,
    bandwidth,
    contourThresholds,
    showContours,
    showFilledHeat,
    showGridLines,
    showHotspotCentroids,
    showMarginalProfiles,
    showGradientVectors,
    coordBounds,
    selectedHotspot,
  ]);

  // Export high-resolution SVG/PNG
  const handleExportVisualization = () => {
    sound.playRadarSwathSweep();
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TerraScan_D3_Anomaly_Density_Map_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!scanArea) return null;

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-[0_0_35px_rgba(6,182,212,0.25)] backdrop-blur-xl overflow-hidden text-slate-200 transition-all ${
        isFullscreen ? 'fixed inset-3 z-50' : 'w-full max-w-4xl'
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4 animate-pulse text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400 font-mono">D3.JS JEORADAR DENSITY MAP</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                2D KDE & ISO-INTENSITY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-sm">
              {scanArea.locationName} · {filteredHotspots.length} Odak Noktası Tespit Edildi
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportVisualization}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 active:scale-95 transition-all"
            title="Vektörel SVG Grafiği İndir"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">SVG İndir</span>
          </button>

          {!isEmbedded && (
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
              title={isFullscreen ? 'Küçült' : 'Tam Ekran'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-all"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Visualizer + Sidebar Controls */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        
        {/* Left/Center: D3 Chart SVG Container */}
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-950/60 relative overflow-auto min-h-[380px]">
          
          <div className="relative w-full max-w-[640px] aspect-square flex items-center justify-center bg-slate-950/90 rounded-xl border border-slate-800/80 shadow-inner">
            <svg
              ref={svgRef}
              viewBox="0 0 640 640"
              className="w-full h-full select-none"
            />

            {/* Live Hover Probe Inspector Tooltip */}
            {hoveredPoint && (
              <div 
                className="absolute z-30 pointer-events-none p-2.5 rounded-xl bg-slate-950/95 border border-cyan-500/70 shadow-[0_4px_20px_rgba(0,0,0,0.85)] backdrop-blur-md text-xs font-mono transition-transform duration-75"
                style={{
                  left: `${Math.min(560, Math.max(10, hoveredPoint.svgX - 20))}px`,
                  top: `${Math.min(540, Math.max(10, hoveredPoint.svgY - 95))}px`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 mb-1.5">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>PROBE ({Math.round(hoveredPoint.x * coordBounds.widthM)}m, {Math.round(hoveredPoint.y * coordBounds.heightM)}m)</span>
                  </div>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    hoveredPoint.density > 0.7 ? 'bg-red-950 text-red-400 border border-red-500/40' :
                    hoveredPoint.density > 0.4 ? 'bg-amber-950 text-amber-400 border border-amber-500/40' :
                    'bg-cyan-950 text-cyan-400 border border-cyan-500/40'
                  }`}>
                    {Math.round(hoveredPoint.density * 100)}% DENSITY
                  </span>
                </div>

                <div className="space-y-0.5 text-[11px] text-slate-300">
                  <div className="flex justify-between gap-3 text-slate-400">
                    <span>Enlem / Lat:</span>
                    <span className="text-slate-100 font-bold">{hoveredPoint.lat.toFixed(6)}° N</span>
                  </div>
                  <div className="flex justify-between gap-3 text-slate-400">
                    <span>Boylam / Lng:</span>
                    <span className="text-slate-100 font-bold">{hoveredPoint.lng.toFixed(6)}° E</span>
                  </div>
                  {hoveredPoint.nearestHotspot && (
                    <div className="pt-1 mt-1 border-t border-slate-800/80 flex items-center justify-between gap-2 text-amber-400 font-semibold">
                      <span>Anomali #{hoveredPoint.nearestHotspot.id}:</span>
                      <span>{hoveredPoint.nearestHotspot.anomalyTypeTr} ({hoveredPoint.nearestHotspot.depthMeters}m)</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Visual Legend Bar */}
          <div className="w-full max-w-[640px] mt-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold">YOĞUNLUK SKALASI:</span>
              <div 
                className="w-28 sm:w-36 h-2.5 rounded border border-slate-700"
                style={{
                  background: colorPalette === 'TURBO' ? 'linear-gradient(to right, #30123b, #4686fb, #1ae4b6, #a2fc3c, #fbb41a, #e4460a, #7a0403)' :
                              colorPalette === 'INFERNO' ? 'linear-gradient(to right, #000004, #57106e, #bb3754, #f98e09, #fcffa4)' :
                              colorPalette === 'MAGMA' ? 'linear-gradient(to right, #000004, #51127c, #b63679, #fb8861, #fcfdbf)' :
                              colorPalette === 'PLASMA' ? 'linear-gradient(to right, #0d0887, #6a00a8, #b12a90, #e16462, #fca636, #f0f921)' :
                              'linear-gradient(to right, #04233a, #007bb6, #2ec4b6, #e71d36, #ff9f1c)'
                }}
              />
              <span className="text-[10px] text-slate-400">0% → 100%</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-300">
              <span className="text-cyan-400">Alan: ~{coordBounds.widthM}×{coordBounds.heightM}m</span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-400">Sigma: {(bandwidth * 0.1).toFixed(1)}m</span>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Density Parameters & Visual Controls */}
        <div className="w-full lg:w-72 bg-slate-900/70 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 space-y-4 overflow-y-auto max-h-[460px] lg:max-h-none text-xs font-mono">
          
          {/* Palette Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>RENK PALETİ</span>
              <span className="text-cyan-400 font-normal">{colorPalette}</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['TURBO', 'INFERNO', 'MAGMA', 'PLASMA', 'WARM', 'VIRIDIS'] as D3ColorPalette[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    sound.playScanBeep();
                    setColorPalette(p);
                  }}
                  className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                    colorPalette === p
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Anomaly Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              ANOMALİ TÜRÜ FİLTRESİ
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'ALL', label: 'TÜMÜ' },
                { id: 'METAL', label: 'METALLER' },
                { id: 'MINERAL', label: 'MİNERALLER' },
                { id: 'CAVITY', label: 'BOŞLUK / ODA' },
                { id: 'STRUCTURE', label: 'YAPI / DUVAR' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    sound.playScanBeep();
                    setTypeFilter(item.id as any);
                  }}
                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                    typeFilter === item.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Depth Slicing Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
              <span>DERİNLİK DİLİMİ (KESİT)</span>
              <span className="text-cyan-400 font-mono">0.0 - {activeDepthSlice.toFixed(1)}m</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10.0"
              step="0.2"
              value={activeDepthSlice}
              onChange={(e) => setActiveDepthSlice(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Kernel Bandwidth (Smoothing Radius) */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
              <span>KDE BANDWIDTH (SIGMA)</span>
              <span className="text-cyan-400 font-mono">{bandwidth} px</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="2"
              value={bandwidth}
              onChange={(e) => setBandwidth(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Heatmap Opacity */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
              <span>ISI SAYDAMLIK (OPACITY)</span>
              <span className="text-cyan-400 font-mono">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Iso-contour Steps */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
              <span>İZOKONTUR BASAMAKLARI</span>
              <span className="text-cyan-400 font-mono">{contourThresholds} Kademe</span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={contourThresholds}
              onChange={(e) => setContourThresholds(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Display Layer Toggles */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              GÖSTERİM KATMANLARI
            </span>

            {[
              { label: 'İzointensite Konturları', state: showContours, set: setShowContours },
              { label: 'Doygun Isı Alanı', state: showFilledHeat, set: setShowFilledHeat },
              { label: 'Koordinat Grid Izgarası', state: showGridLines, set: setShowGridLines },
              { label: 'Anomali Merkez Retikülleri', state: showHotspotCentroids, set: setShowHotspotCentroids },
              { label: 'Kenar Yoğunluk Profilleri (X/Y)', state: showMarginalProfiles, set: setShowMarginalProfiles },
              { label: 'Gradyan Akış Vektörleri (∇ρ)', state: showGradientVectors, set: setShowGradientVectors },
            ].map((toggle, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  toggle.set(!toggle.state);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] transition-all ${
                  toggle.state
                    ? 'bg-slate-800 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300'
                }`}
              >
                <span>{toggle.label}</span>
                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                  toggle.state ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-slate-600'
                }`}>
                  {toggle.state && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
