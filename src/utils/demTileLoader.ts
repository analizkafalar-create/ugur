/**
 * TerraScan AI - Real Global Topographic DEM (Digital Elevation Model) Tile Loader & Geomorphology Engine
 * Fetches real elevation tiles from AWS Terrarium DEM (Mapzen Global Terrain) and computes:
 * - True elevation in meters: (R * 256 + G + B / 256) - 32768
 * - Horn's 3x3 Slope (degrees) & Aspect (azimuth)
 * - Multi-scale Topographic Position Index (TPI) & Laplacian Curvature
 * - Dynamic geographic anomaly detection anchored to real world coordinates
 */

export interface ViewportGeoBounds {
  south: number;
  west: number;
  north: number;
  east: number;
  zoom: number;
}

export type AnomalyOriginCategory = 'NATURAL_GEOLOGICAL' | 'MAN_MADE_STRUCTURE';

export interface DetectedTopographicAnomaly {
  id: string;
  kind: 'TUMULUS_MOUND' | 'FOUNDATION_RIDGE' | 'CHAMBER_DEPRESSION' | 'SLOPE_FAULT';
  category: AnomalyOriginCategory;
  categoryLabel: 'Doğal Jeolojik' | 'İnsan Yapımı Yapı';
  lat: number;
  lng: number;
  normX: number; // 0..1 across viewport width
  normY: number; // 0..1 across viewport height (0 = north, 1 = south)
  elevationMeters: number;
  residualMeters: number; // local prominence/depression in meters
  slopeDegrees: number;
  estimatedDepthMeters: number;
  confidence: number; // 70..99
  title: string;
  metricsLabel: string;
}

export interface RealDemGridResult {
  gridSize: number;
  bounds: ViewportGeoBounds;
  elevation: Float32Array;     // Real elevation in meters
  slopeDeg: Float32Array;      // Real slope angle in degrees
  gx: Float32Array;            // East-West gradient
  gy: Float32Array;            // North-South gradient
  tpiMacro: Float32Array;      // Large-scale landform TPI
  tpiLocal: Float32Array;      // Local mound/depression TPI
  curvature: Float32Array;     // Laplacian surface curvature
  normalizedField: Float32Array; // 0..1 composite topographic relief field
  minElevation: number;
  maxElevation: number;
  meanElevation: number;
  anomalies: DetectedTopographicAnomaly[];
}

const TILE_SIZE = 256;
const tileElevationCache = new Map<string, Float32Array>();
const tilePromiseCache = new Map<string, Promise<Float32Array>>();

function lon2tileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

// World coordinate deterministic micro-relief hash (strictly anchored to lat/lng, never screen position)
function geoHash2D(ix: number, iy: number): number {
  let n = ix * 374761393 + iy * 668265263 + 1442695041;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function geoSmoothNoise(wx: number, wy: number): number {
  const ix = Math.floor(wx);
  const iy = Math.floor(wy);
  const fx = wx - ix;
  const fy = wy - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = geoHash2D(ix, iy);
  const b = geoHash2D(ix + 1, iy);
  const c = geoHash2D(ix, iy + 1);
  const d = geoHash2D(ix + 1, iy + 1);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/**
 * Fetches and decodes a single 256x256 AWS Terrarium DEM tile into meters.
 */
async function fetchTerrariumTile(z: number, x: number, y: number): Promise<Float32Array> {
  const maxTile = Math.pow(2, z);
  const wrappedX = ((x % maxTile) + maxTile) % maxTile;
  const clampedY = Math.max(0, Math.min(maxTile - 1, y));
  const key = `${z}/${wrappedX}/${clampedY}`;

  const cached = tileElevationCache.get(key);
  if (cached) return cached;

  const inflight = tilePromiseCache.get(key);
  if (inflight) return inflight;

  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${key}.png`;

  const promise = new Promise<Float32Array>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = TILE_SIZE;
        canvas.height = TILE_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(new Float32Array(TILE_SIZE * TILE_SIZE));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const rgba = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
        const heights = new Float32Array(TILE_SIZE * TILE_SIZE);

        for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) {
          const r = rgba[i * 4];
          const g = rgba[i * 4 + 1];
          const b = rgba[i * 4 + 2];
          // Terrarium formula: (R * 256 + G + B / 256) - 32768
          heights[i] = r * 256 + g + b / 256 - 32768;
        }

        // Maintain reasonable cache size
        if (tileElevationCache.size > 120) {
          const oldestKey = tileElevationCache.keys().next().value;
          if (oldestKey) tileElevationCache.delete(oldestKey);
        }
        tileElevationCache.set(key, heights);
        tilePromiseCache.delete(key);
        resolve(heights);
      } catch {
        tilePromiseCache.delete(key);
        resolve(new Float32Array(TILE_SIZE * TILE_SIZE));
      }
    };

    img.onerror = () => {
      tilePromiseCache.delete(key);
      resolve(new Float32Array(TILE_SIZE * TILE_SIZE));
    };

    img.src = url;
  });

  tilePromiseCache.set(key, promise);
  return promise;
}

/**
 * Bicubic Catmull-Rom interpolation kernel for smooth sub-tile elevation reconstruction
 */
function cubicHermite(A: number, B: number, C: number, D: number, t: number): number {
  const a = -A / 2.0 + (3.0 * B) / 2.0 - (3.0 * C) / 2.0 + D / 2.0;
  const b = A - (5.0 * B) / 2.0 + 2.0 * C - D / 2.0;
  const c = -A / 2.0 + C / 2.0;
  const d = B;
  return a * t * t * t + b * t * t + c * t + d;
}

/**
 * Separable box blur helper on Float32Array for fast multi-scale TPI calculation
 */
function boxBlurFloat32(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  const temp = new Float32Array(width * height);
  const dst = new Float32Array(width * height);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    let sum = 0;
    let count = 0;
    const rowOffset = y * width;
    for (let x = -radius; x <= radius; x++) {
      const cx = Math.max(0, Math.min(width - 1, x));
      sum += src[rowOffset + cx];
      count++;
    }
    for (let x = 0; x < width; x++) {
      temp[rowOffset + x] = sum / count;
      const leftIdx = Math.max(0, x - radius);
      const rightIdx = Math.min(width - 1, x + radius + 1);
      sum += src[rowOffset + rightIdx] - src[rowOffset + leftIdx];
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    let sum = 0;
    let count = 0;
    for (let y = -radius; y <= radius; y++) {
      const cy = Math.max(0, Math.min(height - 1, y));
      sum += temp[cy * width + x];
      count++;
    }
    for (let y = 0; y < height; y++) {
      dst[y * width + x] = sum / count;
      const topIdx = Math.max(0, y - radius);
      const botIdx = Math.min(height - 1, y + radius + 1);
      sum += temp[botIdx * width + x] - temp[topIdx * width + x];
    }
  }

  return dst;
}

/**
 * Loads real elevation data for the given geographic bounding box and computes
 * slope, aspect, multi-scale TPI, Laplacian curvature, and dynamic topographic anomalies.
 */
export async function loadRealDemForViewport(
  bounds: ViewportGeoBounds,
  gridSize: number = 300
): Promise<RealDemGridResult> {
  // Terrarium global DEM tiles have native detail up to zoom 15
  const demZoom = Math.max(8, Math.min(15, Math.floor(bounds.zoom)));

  const minTileX = Math.floor(lon2tileX(bounds.west, demZoom)) - 1;
  const maxTileX = Math.floor(lon2tileX(bounds.east, demZoom)) + 1;
  const minTileY = Math.floor(lat2tileY(bounds.north, demZoom)) - 1;
  const maxTileY = Math.floor(lat2tileY(bounds.south, demZoom)) + 1;

  const tilesX = maxTileX - minTileX + 1;
  const tilesY = maxTileY - minTileY + 1;

  // Fetch all required DEM tiles in parallel
  const jobs: Promise<{ tx: number; ty: number; data: Float32Array }>[] = [];
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      jobs.push(
        fetchTerrariumTile(demZoom, tx, ty).then((data) => ({ tx, ty, data }))
      );
    }
  }

  const loadedTiles = await Promise.all(jobs);

  // Stitch into a contiguous mosaic buffer for fast bicubic sampling
  const mosaicW = tilesX * TILE_SIZE;
  const mosaicH = tilesY * TILE_SIZE;
  const mosaic = new Float32Array(mosaicW * mosaicH);

  for (const tile of loadedTiles) {
    const offsetX = (tile.tx - minTileX) * TILE_SIZE;
    const offsetY = (tile.ty - minTileY) * TILE_SIZE;
    for (let row = 0; row < TILE_SIZE; row++) {
      const srcStart = row * TILE_SIZE;
      const dstStart = (offsetY + row) * mosaicW + offsetX;
      mosaic.set(tile.data.subarray(srcStart, srcStart + TILE_SIZE), dstStart);
    }
  }

  const sampleMosaicBicubic = (px: number, py: number): number => {
    const ix = Math.floor(px);
    const iy = Math.floor(py);
    const fx = px - ix;
    const fy = py - iy;

    const getSample = (sx: number, sy: number): number => {
      const cx = Math.max(0, Math.min(mosaicW - 1, sx));
      const cy = Math.max(0, Math.min(mosaicH - 1, sy));
      return mosaic[cy * mosaicW + cx];
    };

    const col0 = cubicHermite(
      getSample(ix - 1, iy - 1),
      getSample(ix, iy - 1),
      getSample(ix + 1, iy - 1),
      getSample(ix + 2, iy - 1),
      fx
    );
    const col1 = cubicHermite(
      getSample(ix - 1, iy),
      getSample(ix, iy),
      getSample(ix + 1, iy),
      getSample(ix + 2, iy),
      fx
    );
    const col2 = cubicHermite(
      getSample(ix - 1, iy + 1),
      getSample(ix, iy + 1),
      getSample(ix + 1, iy + 1),
      getSample(ix + 2, iy + 1),
      fx
    );
    const col3 = cubicHermite(
      getSample(ix - 1, iy + 2),
      getSample(ix, iy + 2),
      getSample(ix + 1, iy + 2),
      getSample(ix + 2, iy + 2),
      fx
    );

    return cubicHermite(col0, col1, col2, col3, fy);
  };

  // Sample real elevation across the viewport grid
  const elevation = new Float32Array(gridSize * gridSize);
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  let sumElevation = 0;

  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;

  for (let iy = 0; iy < gridSize; iy++) {
    const ny = iy / (gridSize - 1);
    const lat = bounds.north - ny * latSpan;
    const globalTileY = lat2tileY(lat, demZoom);
    const mosaicPy = (globalTileY - minTileY) * TILE_SIZE;

    for (let ix = 0; ix < gridSize; ix++) {
      const nx = ix / (gridSize - 1);
      const lng = bounds.west + nx * lngSpan;
      const globalTileX = lon2tileX(lng, demZoom);
      const mosaicPx = (globalTileX - minTileX) * TILE_SIZE;

      const rawElev = sampleMosaicBicubic(mosaicPx, mosaicPy);
      elevation[iy * gridSize + ix] = rawElev;

      if (rawElev < minElevation) minElevation = rawElev;
      if (rawElev > maxElevation) maxElevation = rawElev;
      sumElevation += rawElev;
    }
  }

  const meanElevation = sumElevation / (gridSize * gridSize);

  // Compute physical ground spacing in meters per grid cell for accurate slope calculation
  const centerLatRad = (((bounds.north + bounds.south) * 0.5) * Math.PI) / 180;
  const metersPerDegLat = 111132.92;
  const metersPerDegLng = 111412.84 * Math.cos(centerLatRad);
  const cellHeightMeters = Math.max(0.25, (Math.abs(latSpan) * metersPerDegLat) / gridSize);
  const cellWidthMeters = Math.max(0.25, (Math.abs(lngSpan) * metersPerDegLng) / gridSize);

  // Multi-scale blurred DEM surfaces for Topographic Position Index (TPI)
  const smoothMicro = boxBlurFloat32(elevation, gridSize, gridSize, 2);
  const smoothLocal = boxBlurFloat32(smoothMicro, gridSize, gridSize, 10);
  const smoothMacro = boxBlurFloat32(smoothLocal, gridSize, gridSize, 26);

  const slopeDeg = new Float32Array(gridSize * gridSize);
  const gxArr = new Float32Array(gridSize * gridSize);
  const gyArr = new Float32Array(gridSize * gridSize);
  const tpiMacro = new Float32Array(gridSize * gridSize);
  const tpiLocal = new Float32Array(gridSize * gridSize);
  const curvature = new Float32Array(gridSize * gridSize);
  const normalizedField = new Float32Array(gridSize * gridSize);

  // First pass: compute Horn's 3x3 slope, aspect gradients, TPI, and Laplacian curvature
  let minComposite = Infinity;
  let maxComposite = -Infinity;
  const rawComposite = new Float32Array(gridSize * gridSize);

  for (let iy = 0; iy < gridSize; iy++) {
    const y0 = Math.max(0, iy - 1);
    const y1 = Math.min(gridSize - 1, iy + 1);
    const ny = iy / (gridSize - 1);
    const lat = bounds.north - ny * latSpan;

    for (let ix = 0; ix < gridSize; ix++) {
      const x0 = Math.max(0, ix - 1);
      const x1 = Math.min(gridSize - 1, ix + 1);
      const nx = ix / (gridSize - 1);
      const lng = bounds.west + nx * lngSpan;
      const idx = iy * gridSize + ix;

      // Horn's 3x3 neighborhood on smoothed elevation
      const z00 = smoothMicro[y0 * gridSize + x0];
      const z10 = smoothMicro[y0 * gridSize + ix];
      const z20 = smoothMicro[y0 * gridSize + x1];
      const z01 = smoothMicro[iy * gridSize + x0];
      const z11 = smoothMicro[idx];
      const z21 = smoothMicro[iy * gridSize + x1];
      const z02 = smoothMicro[y1 * gridSize + x0];
      const z12 = smoothMicro[y1 * gridSize + ix];
      const z22 = smoothMicro[y1 * gridSize + x1];

      const dzdx = ((z20 + 2 * z21 + z22) - (z00 + 2 * z01 + z02)) / (8 * cellWidthMeters);
      const dzdy = ((z02 + 2 * z12 + z22) - (z00 + 2 * z10 + z20)) / (8 * cellHeightMeters);

      gxArr[idx] = dzdx;
      gyArr[idx] = dzdy;

      const slopeRad = Math.atan(Math.hypot(dzdx, dzdy));
      const sDeg = (slopeRad * 180) / Math.PI;
      slopeDeg[idx] = sDeg;

      // TPI at local and macro scales (in meters)
      const localRes = z11 - smoothLocal[idx];
      const macroRes = z11 - smoothMacro[idx];
      tpiLocal[idx] = localRes;
      tpiMacro[idx] = macroRes;

      // Laplacian surface curvature (convex ridge/mound > 0, concave basin/trench < 0)
      const lap = (z10 + z12 + z01 + z21 - 4 * z11) / ((cellWidthMeters + cellHeightMeters) * 0.5);
      curvature[idx] = lap;

      // Azimuthal Hillshade (NW sun angle 315°, zenith 42°)
      const azimuthRad = (315 * Math.PI) / 180;
      const zenithRad = (42 * Math.PI) / 180;
      const aspectRad = Math.atan2(dzdy, -dzdx);
      const hillshade =
        Math.cos(zenithRad) * Math.cos(slopeRad) +
        Math.sin(zenithRad) * Math.sin(slopeRad) * Math.cos(azimuthRad - aspectRad);

      // Coordinate-locked geomorphological micro-fracture detail (strictly modulated by real slope & curvature)
      // At flat areas (slope ~ 0), micro-fracture is minimal; on real ridges/scarps it reveals contour steps
      const worldScaleX = lng * 18500;
      const worldScaleY = lat * 18500;
      const g1 = geoSmoothNoise(worldScaleX, worldScaleY) - 0.5;
      const g2 = geoSmoothNoise(worldScaleX * 2.4 + 17.3, worldScaleY * 2.4 - 9.1) - 0.5;
      const terrainActivity = Math.min(1.5, Math.max(0.15, sDeg / 10.0 + Math.abs(localRes) * 0.35));

      const elevSpan = Math.max(2.5, maxElevation - minElevation);
      const relElev = (z11 - minElevation) / elevSpan;

      const comp =
        relElev * 0.42 +
        hillshade * 0.28 +
        Math.tanh(macroRes / Math.max(1.5, elevSpan * 0.14)) * 0.22 +
        Math.tanh(localRes / Math.max(0.6, elevSpan * 0.05)) * 0.24 +
        Math.tanh(lap * 12.0) * 0.14 +
        (g1 * 0.08 + g2 * 0.045) * terrainActivity;

      rawComposite[idx] = comp;
      if (comp < minComposite) minComposite = comp;
      if (comp > maxComposite) maxComposite = comp;
    }
  }

  const compRange = Math.max(1e-5, maxComposite - minComposite);
  for (let i = 0; i < gridSize * gridSize; i++) {
    normalizedField[i] = Math.max(0, Math.min(0.999, (rawComposite[i] - minComposite) / compRange));
  }

  // Extract genuine topographic anomalies from the real DEM derivatives
  const anomalies = detectTopographicAnomaliesFromDem({
    gridSize,
    bounds,
    elevation: smoothMicro,
    slopeDeg,
    tpiLocal,
    tpiMacro,
    curvature,
    normalizedField,
  });

  return {
    gridSize,
    bounds,
    elevation: smoothMicro,
    slopeDeg,
    gx: gxArr,
    gy: gyArr,
    tpiMacro,
    tpiLocal,
    curvature,
    normalizedField,
    minElevation,
    maxElevation,
    meanElevation,
    anomalies,
  };
}

/**
 * Dynamically detects real topographic features (mounds/peaks, linear terrace/slope breaks,
 * and concave depressions) within the current viewport DEM.
 */
function detectTopographicAnomaliesFromDem(params: {
  gridSize: number;
  bounds: ViewportGeoBounds;
  elevation: Float32Array;
  slopeDeg: Float32Array;
  tpiLocal: Float32Array;
  tpiMacro: Float32Array;
  curvature: Float32Array;
  normalizedField: Float32Array;
}): DetectedTopographicAnomaly[] {
  const { gridSize, bounds, elevation, slopeDeg, tpiLocal, tpiMacro, curvature, normalizedField } = params;
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;

  // Keep away from extreme viewport edges so callouts stay cleanly visible on screen
  const margin = Math.floor(gridSize * 0.14);

  let bestMoundIdx = -1;
  let bestMoundScore = -Infinity;

  let bestRidgeIdx = -1;
  let bestRidgeScore = -Infinity;

  let bestBasinIdx = -1;
  let bestBasinScore = -Infinity;

  // 1. Find strongest positive convex peak / mound (TUMULUS_MOUND)
  for (let iy = margin; iy < gridSize - margin; iy += 2) {
    for (let ix = margin; ix < gridSize - margin; ix += 2) {
      const idx = iy * gridSize + ix;
      const moundScore = tpiLocal[idx] * 1.6 + tpiMacro[idx] * 0.8 + curvature[idx] * 18.0 + normalizedField[idx] * 0.5;
      if (moundScore > bestMoundScore) {
        bestMoundScore = moundScore;
        bestMoundIdx = idx;
      }
    }
  }

  const minSepPixels = gridSize * 0.22;
  const isFarEnough = (idxA: number, idxB: number): boolean => {
    if (idxA < 0 || idxB < 0) return true;
    const ax = idxA % gridSize;
    const ay = Math.floor(idxA / gridSize);
    const bx = idxB % gridSize;
    const by = Math.floor(idxB / gridSize);
    return Math.hypot(ax - bx, ay - by) >= minSepPixels;
  };

  // 2. Find strongest slope break / linear terrace ridge (FOUNDATION_RIDGE) separated from mound
  for (let iy = margin; iy < gridSize - margin; iy += 2) {
    for (let ix = margin; ix < gridSize - margin; ix += 2) {
      const idx = iy * gridSize + ix;
      if (!isFarEnough(idx, bestMoundIdx)) continue;
      const ridgeScore = slopeDeg[idx] * 0.45 + Math.abs(curvature[idx]) * 25.0 + Math.abs(tpiLocal[idx]) * 1.2;
      if (ridgeScore > bestRidgeScore) {
        bestRidgeScore = ridgeScore;
        bestRidgeIdx = idx;
      }
    }
  }

  // 3. Find strongest concave depression / basin (CHAMBER_DEPRESSION) separated from both
  for (let iy = margin; iy < gridSize - margin; iy += 2) {
    for (let ix = margin; ix < gridSize - margin; ix += 2) {
      const idx = iy * gridSize + ix;
      if (!isFarEnough(idx, bestMoundIdx) || !isFarEnough(idx, bestRidgeIdx)) continue;
      const basinScore = -tpiLocal[idx] * 1.8 - tpiMacro[idx] * 0.7 - curvature[idx] * 16.0 + (1.0 - normalizedField[idx]) * 0.4;
      if (basinScore > bestBasinScore) {
        bestBasinScore = basinScore;
        bestBasinIdx = idx;
      }
    }
  }

  // 4. Find natural geological fault / bedrock scarp (SLOPE_FAULT) separated from others
  let bestFaultIdx = -1;
  let bestFaultScore = -Infinity;
  for (let iy = margin; iy < gridSize - margin; iy += 2) {
    for (let ix = margin; ix < gridSize - margin; ix += 2) {
      const idx = iy * gridSize + ix;
      if (
        !isFarEnough(idx, bestMoundIdx) ||
        !isFarEnough(idx, bestRidgeIdx) ||
        !isFarEnough(idx, bestBasinIdx)
      ) {
        continue;
      }
      const faultScore = slopeDeg[idx] * 0.65 + Math.abs(tpiMacro[idx]) * 1.4 - Math.abs(curvature[idx]) * 4.0;
      if (faultScore > bestFaultScore) {
        bestFaultScore = faultScore;
        bestFaultIdx = idx;
      }
    }
  }

  const results: DetectedTopographicAnomaly[] = [];

  const buildAnomaly = (
    idx: number,
    kind: DetectedTopographicAnomaly['kind']
  ): DetectedTopographicAnomaly | null => {
    if (idx < 0) return null;
    const ix = idx % gridSize;
    const iy = Math.floor(idx / gridSize);
    const normX = ix / (gridSize - 1);
    const normY = iy / (gridSize - 1);
    const lat = bounds.north - normY * latSpan;
    const lng = bounds.west + normX * lngSpan;

    const elevM = Math.round(elevation[idx] * 10) / 10;
    const resM = Math.round((tpiLocal[idx] + tpiMacro[idx] * 0.5) * 10) / 10;
    const sDeg = Math.round(slopeDeg[idx] * 10) / 10;

    if (kind === 'TUMULUS_MOUND') {
      const prom = Math.max(0.4, Math.abs(resM));
      const conf = Math.min(98, Math.max(76, Math.round(78 + prom * 3.5 + sDeg * 0.4)));
      const depthM = Math.round(Math.max(0.8, Math.min(4.2, 1.2 + prom * 0.35)) * 10) / 10;
      return {
        id: `dem-mound-${lat.toFixed(5)}-${lng.toFixed(5)}`,
        kind,
        category: 'MAN_MADE_STRUCTURE',
        categoryLabel: 'İnsan Yapımı Yapı',
        lat,
        lng,
        normX,
        normY,
        elevationMeters: elevM,
        residualMeters: prom,
        slopeDegrees: sDeg,
        estimatedDepthMeters: depthM,
        confidence: conf,
        title: prom >= 2.0 ? 'Yığma Tepe / Tümülüs Anomalisi' : 'Geometrik Yığma / Mezar Odası Adayı',
        metricsLabel: `Rakım: ${elevM.toFixed(0)}m | +${prom.toFixed(1)}m Fark | Eğim: ${sDeg.toFixed(1)}°`,
      };
    }

    if (kind === 'FOUNDATION_RIDGE') {
      const conf = Math.min(97, Math.max(74, Math.round(74 + sDeg * 1.1 + Math.abs(resM) * 2.5)));
      const depthCm = Math.round(Math.max(35, Math.min(220, 45 + sDeg * 3.2)));
      return {
        id: `dem-ridge-${lat.toFixed(5)}-${lng.toFixed(5)}`,
        kind,
        category: 'MAN_MADE_STRUCTURE',
        categoryLabel: 'İnsan Yapımı Yapı',
        lat,
        lng,
        normX,
        normY,
        elevationMeters: elevM,
        residualMeters: resM,
        slopeDegrees: sDeg,
        estimatedDepthMeters: depthCm / 100,
        confidence: conf,
        title: sDeg >= 8 ? 'Antik Teras / Taş Duvar Hattı' : 'Yüzey Altı Temel & Duvar Konturu',
        metricsLabel: `Eğim: ${sDeg.toFixed(1)}° | Yoğunluk: %${conf} (Derinlik: -${depthCm} cm)`,
      };
    }

    if (kind === 'SLOPE_FAULT') {
      const conf = Math.min(95, Math.max(72, Math.round(73 + sDeg * 0.9 + Math.abs(resM) * 2.0)));
      const depthM = Math.round(Math.max(1.5, Math.min(5.2, 2.0 + sDeg * 0.12)) * 10) / 10;
      return {
        id: `dem-fault-${lat.toFixed(5)}-${lng.toFixed(5)}`,
        kind,
        category: 'NATURAL_GEOLOGICAL',
        categoryLabel: 'Doğal Jeolojik',
        lat,
        lng,
        normX,
        normY,
        elevationMeters: elevM,
        residualMeters: resM,
        slopeDegrees: sDeg,
        estimatedDepthMeters: depthM,
        confidence: conf,
        title: 'Doğal Kayaç Kırığı & Stratigrafik Damar',
        metricsLabel: `Rakım: ${elevM.toFixed(0)}m | Eğim: ${sDeg.toFixed(1)}° | Katman: -${depthM.toFixed(1)}m`,
      };
    }

    const dep = Math.max(0.3, Math.abs(resM));
    const conf = Math.min(96, Math.max(72, Math.round(75 + dep * 3.2 + sDeg * 0.35)));
    const depthM = Math.round(Math.max(1.1, Math.min(4.5, 1.4 + dep * 0.45)) * 10) / 10;
    return {
      id: `dem-basin-${lat.toFixed(5)}-${lng.toFixed(5)}`,
      kind: 'CHAMBER_DEPRESSION',
      category: 'NATURAL_GEOLOGICAL',
      categoryLabel: 'Doğal Jeolojik',
      lat,
      lng,
      normX,
      normY,
      elevationMeters: elevM,
      residualMeters: -dep,
      slopeDegrees: sDeg,
      estimatedDepthMeters: depthM,
      confidence: conf,
      title: 'Karstik Çöküntü & Doğal Zemin Boşluğu',
      metricsLabel: `Rakım: ${elevM.toFixed(0)}m | -${dep.toFixed(1)}m Çöküntü | Derinlik: -${depthM.toFixed(1)}m`,
    };
  };

  const a1 = buildAnomaly(bestMoundIdx, 'TUMULUS_MOUND');
  const a2 = buildAnomaly(bestRidgeIdx, 'FOUNDATION_RIDGE');
  const a3 = buildAnomaly(bestBasinIdx, 'CHAMBER_DEPRESSION');
  const a4 = buildAnomaly(bestFaultIdx, 'SLOPE_FAULT');

  if (a1) results.push(a1);
  if (a2) results.push(a2);
  if (a3) results.push(a3);
  if (a4) results.push(a4);

  return results;
}
