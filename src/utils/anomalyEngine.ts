/**
 * TerraScan AI - Subsurface Anomaly Generation Engine
 * Generates coordinate-deterministic, highly varied Veldscan-style heatmaps, 
 * 3D subsurface chambers, and hotspot vectors
 */

import { 
  Coordinates, 
  ScanArea, 
  AnomalyHotspot, 
  SubsurfaceChamber3D, 
  AnomalyReport,
  StructuralCorridor,
  StructuralChamberPolygon,
  AnomalyAxisLine,
  ScanMode,
  ScanResolution,
  RadargramData,
  RadargramTrace
} from '../types';
import { PRESET_SCAN_SITES } from '../data/satellites';

/**
 * Deterministic pseudo-random number generator for a specific coordinate pair
 */
function createCoordinatePRNG(lat: number, lng: number) {
  // Quantize coordinates slightly (e.g. 5 decimals ~ 1 meter) so microscopic jitter yields same result
  const qLat = Math.round(lat * 100000) / 100000;
  const qLng = Math.round(lng * 100000) / 100000;

  let seed = Math.abs(Math.sin(qLat * 12.9898 + qLng * 78.233) * 43758.5453);
  
  return function nextRand(offset: number = 0): number {
    const val = Math.sin(seed + offset * 1.6180339887) * 10000;
    seed = (seed + 0.1) % 1000;
    return Math.abs(val - Math.floor(val));
  };
}

export function generateAnomalyScan(
  center: Coordinates, 
  locationName: string, 
  satelliteId: string,
  options?: {
    scanMode?: ScanMode;
    scanResolution?: ScanResolution;
    isocontoursEnabled?: boolean;
    sensitivity?: number;
  }
): ScanArea {
  const rand = createCoordinatePRNG(center.lat, center.lng);
  const scanMode: ScanMode = options?.scanMode || 'SAR_VELD';
  const scanResolution: ScanResolution = options?.scanResolution || 'HD';
  const isocontoursEnabled: boolean = options?.isocontoursEnabled ?? true;

  // 1. DETERMINISTIC GEOLOGICAL REALISM & SITE CLASSIFICATION
  const isDefaultUsak = Math.abs(center.lat - 38.477309) < 0.005 && Math.abs(center.lng - 29.728954) < 0.005;
  const isKnownArcheologicalPreset = PRESET_SCAN_SITES.some(
    (site) => Math.abs(site.lat - center.lat) < 0.004 && Math.abs(site.lng - center.lng) < 0.004
  );
  const isHistoricalSite = isDefaultUsak || isKnownArcheologicalPreset;

  // Ground variance probability seed (deterministic for this exact coordinate pair)
  const varianceSeed = rand(77);

  let overallScore: number;
  let hotspotCount: number;

  if (!isHistoricalSite && varianceSeed < 0.72) {
    // 72% probability for random parcels of land: HOMOGENEOUS CLEAN SOIL (No Anomaly detected)
    overallScore = Math.floor(rand(1) * 2) + 1; // 1 or 2 out of 10
    hotspotCount = 0;
  } else if (!isHistoricalSite && varianceSeed < 0.88) {
    // 16% probability: Minor Natural Geological Variance (single natural bedrock void or localized mineral trace)
    overallScore = Math.floor(rand(1) * 2) + 3; // 3 or 4 out of 10
    hotspotCount = 1;
  } else {
    // 12% probability: Genuine Subsurface Anomaly or Reference Archeological Site
    overallScore = isHistoricalSite ? 8 : (Math.floor(rand(1) * 3) + 6); // 6, 7 or 8 out of 10
    hotspotCount = Math.min(3, Math.floor(rand(2) * 2) + 2); // 2 or 3 distinct, focused hotspots
  }

  // 3. Dynamic Polygon footprint around coordinates (orientation varies by coordinate)
  const rotationAngle = rand(6) * Math.PI * 0.5; // slight orientation difference
  const baseDelta = 0.00075 + rand(7) * 0.0003;
  const aspect = 0.8 + rand(8) * 0.4;

  const polyOffsets = [
    { x: -0.85, y: 0.95 },
    { x: 0.82, y: 0.90 },
    { x: 0.95, y: 0.20 },
    { x: 0.90, y: -0.88 },
    { x: -0.80, y: -0.95 },
    { x: -0.92, y: 0.15 },
  ];

  const polygonCorners: Coordinates[] = polyOffsets.map(pt => {
    // Apply slight rotation & aspect
    const rotX = pt.x * Math.cos(rotationAngle) - pt.y * Math.sin(rotationAngle);
    const rotY = pt.x * Math.sin(rotationAngle) + pt.y * Math.cos(rotationAngle);
    return {
      lat: center.lat + rotY * baseDelta,
      lng: center.lng + rotX * baseDelta * aspect,
    };
  });

  // 4. GENERATE DYNAMIC HOTSPOTS
  const anomalyTypes: Array<{
    type: 'METAL' | 'CAVITY' | 'STRUCTURE' | 'MINERAL';
    labelTr: string;
    color: string;
  }> = [
    { type: 'METAL', labelTr: 'Yüksek Manyetik Sapma / Ferromanyetik İletkenlik', color: '#f97316' },
    { type: 'CAVITY', labelTr: 'Dielektrik Boşluk ve Dehliz Simülasyonu', color: '#ef4444' },
    { type: 'STRUCTURE', labelTr: 'Jeoteknik Yüzey Analizi & Taş Duvar Temeli', color: '#eab308' },
    { type: 'MINERAL', labelTr: 'Yoğunluk ve Spektral Kontrast / Mineral Damarı', color: '#f59e0b' },
    { type: 'CAVITY', labelTr: 'Zemin Anomalisi / Karstik Boşluk İmzası', color: '#a855f7' },
  ];

  const dimensionPresets = ['2×2 m', '3×2 m', '4×2 m', '4×3 m', '5×2 m', '6×2 m', '1.5×1.5 m', '9×2 m'];

  const hotspots: AnomalyHotspot[] = [];

  // Generate non-overlapping realistic hotspots
  for (let i = 0; i < hotspotCount; i++) {
    const typeIdx = Math.floor(rand(10 + i * 4) * anomalyTypes.length);
    const chosenType = anomalyTypes[typeIdx];
    const sizeStr = dimensionPresets[Math.floor(rand(20 + i * 3) * dimensionPresets.length)];

    // Parse width and length from "3×2 m"
    const [wStr, lStr] = (sizeStr || '3×2 m').replace(' m', '').split('×');
    const dimX = parseFloat(wStr) || 3;
    const dimY = parseFloat(lStr) || 2;

    // Relative positions (distribute nicely across the 0.15 - 0.85 box)
    const relX = +(0.18 + rand(30 + i * 7) * 0.64).toFixed(2);
    const relY = +(0.18 + rand(40 + i * 9) * 0.64).toFixed(2);

    // Realistic Depth varies between 0.9 m and 4.8 m
    const depthMeters = +(1.0 + rand(50 + i * 5) * 3.4).toFixed(1);
    
    // Intensity varies from 60 to 96
    const intensity = Math.round(58 + rand(60 + i * 6) * 38);

    // Specific geophysical inversion parameters
    let magneticDeltaNt = 0;
    let resistivityOhmM = 250;
    let dielectricPermittivity = 6.4;
    let radarReflectivityDb = -12.0;
    let materialProbabilities = {
      cavityVoidPct: 15,
      metallicFerrousPct: 15,
      stoneMasonryPct: 50,
      mineralVeinPct: 20
    };

    if (chosenType.type === 'CAVITY') {
      magneticDeltaNt = -Math.round(18 + rand(80 + i) * 26); // negative dipole void
      resistivityOhmM = Math.round(1400 + rand(81 + i) * 1600); // 1400-3000 Ohm*m (air void is high resistance)
      dielectricPermittivity = +(1.2 + rand(82 + i) * 0.8).toFixed(1); // air void is low dielectric ~1.0
      radarReflectivityDb = -Math.round(6 + rand(83 + i) * 5); // strong reflection roof interface
      materialProbabilities = {
        cavityVoidPct: Math.round(75 + rand(84 + i) * 18),
        metallicFerrousPct: Math.round(3 + rand(85 + i) * 5),
        stoneMasonryPct: Math.round(10 + rand(86 + i) * 10),
        mineralVeinPct: 3
      };
    } else if (chosenType.type === 'METAL') {
      magneticDeltaNt = +Math.round(65 + rand(80 + i) * 95); // positive dipole metal
      resistivityOhmM = Math.round(18 + rand(81 + i) * 50); // high electrical conductivity
      dielectricPermittivity = +(14.0 + rand(82 + i) * 12.0).toFixed(1);
      radarReflectivityDb = -Math.round(2 + rand(83 + i) * 4); // intense reflection
      materialProbabilities = {
        cavityVoidPct: Math.round(4 + rand(84 + i) * 6),
        metallicFerrousPct: Math.round(78 + rand(85 + i) * 18),
        stoneMasonryPct: Math.round(6 + rand(86 + i) * 8),
        mineralVeinPct: 4
      };
    } else if (chosenType.type === 'STRUCTURE') {
      magneticDeltaNt = +Math.round(20 + rand(80 + i) * 28);
      resistivityOhmM = Math.round(650 + rand(81 + i) * 550);
      dielectricPermittivity = +(7.2 + rand(82 + i) * 1.6).toFixed(1);
      radarReflectivityDb = -Math.round(9 + rand(83 + i) * 5);
      materialProbabilities = {
        cavityVoidPct: Math.round(12 + rand(84 + i) * 8),
        metallicFerrousPct: Math.round(8 + rand(85 + i) * 6),
        stoneMasonryPct: Math.round(72 + rand(86 + i) * 18),
        mineralVeinPct: 4
      };
    } else {
      // MINERAL
      magneticDeltaNt = +Math.round(40 + rand(80 + i) * 35);
      resistivityOhmM = Math.round(120 + rand(81 + i) * 180);
      dielectricPermittivity = +(9.5 + rand(82 + i) * 3.5).toFixed(1);
      radarReflectivityDb = -Math.round(12 + rand(83 + i) * 6);
      materialProbabilities = {
        cavityVoidPct: 5,
        metallicFerrousPct: Math.round(15 + rand(84 + i) * 10),
        stoneMasonryPct: Math.round(10 + rand(85 + i) * 8),
        mineralVeinPct: Math.round(65 + rand(86 + i) * 20)
      };
    }

    const azimuthDeg = Math.round(rand(65 + i * 2) * 180);
    const aspectRatio = +(dimX / Math.max(1, dimY)).toFixed(2);
    const focusSharpnessPct = +(94.0 + rand(66 + i) * 5.8).toFixed(1);
    const snrDb = +(22.5 + rand(67 + i) * 12.0).toFixed(1);

    hotspots.push({
      id: i + 1,
      label: `${sizeStr} · sıcak nokta`,
      relativeX: relX,
      relativeY: relY,
      sizeMeters: sizeStr,
      intensity,
      depthMeters,
      anomalyType: chosenType.type,
      anomalyTypeTr: chosenType.labelTr,
      score: overallScore,
      colorHex: chosenType.color,
      dimX,
      dimY,
      dimZ: +(1.2 + rand(70 + i) * 1.5).toFixed(1),
      magneticDeltaNt,
      resistivityOhmM,
      dielectricPermittivity,
      radarReflectivityDb,
      materialProbabilities,
      azimuthDeg,
      aspectRatio,
      focusSharpnessPct,
      snrDb,
    });
  }

  // 5. DYNAMIC 3D CHAMBERS (Derived from hotspots)
  const chambers3D: SubsurfaceChamber3D[] = [];
  const chamberCandidates = hotspots.filter(h => h.anomalyType === 'CAVITY' || h.anomalyType === 'METAL' || h.anomalyType === 'STRUCTURE');
  
  const chamberCount = Math.min(3, chamberCandidates.length);
  for (let c = 0; c < chamberCount; c++) {
    const spot = chamberCandidates[c];
    // Map relativeX/Y (0..1) to 3D center (-0.8..0.8)
    const x3d = +((spot.relativeX - 0.5) * 1.6).toFixed(2);
    const y3d = +((spot.relativeY - 0.5) * 1.6).toFixed(2);
    const depthTo = +(spot.depthMeters + 1.2).toFixed(1);
    const depthFrom = Math.max(0.6, +(spot.depthMeters - 0.8).toFixed(1));

    chambers3D.push({
      id: `ch-${c + 1}`,
      index: spot.id,
      x: x3d,
      y: y3d,
      depthFrom,
      depthTo,
      widthM: +(spot.dimX * 1.4).toFixed(1),
      lengthM: +(spot.dimY * 1.4).toFixed(1),
      heightM: +(depthTo - depthFrom).toFixed(1),
      color: spot.colorHex,
      label: spot.anomalyTypeTr,
      shapeType: spot.anomalyType === 'CAVITY' ? 'box' : spot.anomalyType === 'STRUCTURE' ? 'corridor' : 'box',
    });
  }

  // 6. DYNAMIC SUBTERRANEAN CORRIDOR NETWORK & 2D CHAMBERS
  const corridors: StructuralCorridor[] = [];
  const chambers2D: StructuralChamberPolygon[] = [];

  if (isHistoricalSite && overallScore >= 4) {
    // 6a. Main Central Spine & Branching Corridors for Reference Archeological Complex
    corridors.push(
      // Central Junction to West Chamber Wing (Horizontally across left)
      {
        id: 'corr-west-main',
        points: [
          { relX: 0.48, relY: 0.46 },
          { relX: 0.44, relY: 0.36 },
          { relX: 0.35, relY: 0.35 },
          { relX: 0.28, relY: 0.35 },
          { relX: 0.17, relY: 0.34 },
          { relX: 0.07, relY: 0.33 },
        ],
        widthMeters: 2.8,
        label: 'Batı Dehliz Ana Galerisi',
      },
      // Central Junction to East Chamber Wing (Horizontally across right)
      {
        id: 'corr-east-main',
        points: [
          { relX: 0.48, relY: 0.46 },
          { relX: 0.56, relY: 0.52 },
          { relX: 0.70, relY: 0.51 },
          { relX: 0.82, relY: 0.52 },
          { relX: 0.86, relY: 0.65 },
        ],
        widthMeters: 2.6,
        label: 'Doğu Tonozlu Koridor Hattı',
      },
      // North Branch (Ascending towards upper masonry terrace)
      {
        id: 'corr-north',
        points: [
          { relX: 0.44, relY: 0.36 },
          { relX: 0.45, relY: 0.26 },
          { relX: 0.46, relY: 0.16 },
        ],
        widthMeters: 2.4,
        label: 'Kuzey Teras Giriş Tüneli',
      },
      // Southwest Long Diagonal Gallery (Descends down to lower courtyard ruins)
      {
        id: 'corr-southwest-diag',
        points: [
          { relX: 0.44, relY: 0.52 },
          { relX: 0.42, relY: 0.68 },
          { relX: 0.32, relY: 0.72 },
          { relX: 0.21, relY: 0.82 },
          { relX: 0.10, relY: 0.92 },
        ],
        widthMeters: 3.2,
        label: 'Güneybatı Derin Geçit Rampası',
      },
      // South Dual Branches
      {
        id: 'corr-south-1',
        points: [
          { relX: 0.56, relY: 0.54 },
          { relX: 0.58, relY: 0.68 },
        ],
        widthMeters: 2.2,
        label: 'Güney Kuyu İnişi',
      },
      // Southeast Vertical Wing (Descending along eastern flank)
      {
        id: 'corr-southeast-vert',
        points: [
          { relX: 0.86, relY: 0.65 },
          { relX: 0.85, relY: 0.78 },
          { relX: 0.86, relY: 0.89 },
        ],
        widthMeters: 2.5,
        label: 'Güneydoğu Yeraltı Galeri Geçidi',
      }
    );

    // 6b. Geophysical Subterranean Structural Chambers (Odalar, Tonozlar, Sarnıçlar & Masif Bloklar)
    chambers2D.push(
      // 1. Central Grand Vault (Center of site)
      {
        id: 'ch-vault-center',
        label: 'Merkezi Masif Taş Odak / Hazne Boşluğu',
        relX: 0.56,
        relY: 0.52,
        widthM: 5.5,
        lengthM: 7.2,
        depthMeters: 2.8,
        chamberType: 'VAULT',
        innerStyle: 'capsule',
        colorHex: '#f59e0b',
      },
      // 2. Far-West High Conductivity Specular Cache (Target core anomaly)
      {
        id: 'ch-west-target',
        label: 'Batı Yüksek İletkenlik / Metalik Alterasyon Mahzeni',
        relX: 0.07,
        relY: 0.33,
        widthM: 4.8,
        lengthM: 4.0,
        depthMeters: 2.1,
        chamberType: 'METALLIC_CORE',
        innerStyle: 'target_core',
        colorHex: '#ef4444',
      },
      // 3. West Masonry Stone Room (Masif Taş Bloklu Oda)
      {
        id: 'ch-west-masonry',
        label: 'Batı Jeoteknik Taş Formasyon Odası',
        relX: 0.17,
        relY: 0.34,
        widthM: 5.2,
        lengthM: 4.6,
        depthMeters: 2.6,
        chamberType: 'STONE_SLAB',
        innerStyle: 'rect_slab',
        colorHex: '#64748b',
      },
      // 4. West Corridor Junction Room
      {
        id: 'ch-west-junc',
        label: 'Geçiş Holü & Taş Sahanlık',
        relX: 0.28,
        relY: 0.35,
        widthM: 4.2,
        lengthM: 3.8,
        depthMeters: 2.3,
        chamberType: 'STONE_SLAB',
        innerStyle: 'rect_slab',
        colorHex: '#64748b',
      },
      // 5. Mid-Right Green Cropmark Enclosure with Gold Stele
      {
        id: 'ch-green-enclosure',
        label: 'Kuzeydoğu Temel İzi & Taş Kaide',
        relX: 0.72,
        relY: 0.35,
        widthM: 5.8,
        lengthM: 6.2,
        depthMeters: 1.4,
        chamberType: 'WALL_ENCLOSURE',
        innerStyle: 'green_gold',
        colorHex: '#22c55e',
      },
      // 6. Top North Cavity Void (Kuyu / Sarnıç)
      {
        id: 'ch-north-void',
        label: 'Kuzey Su Sarnıcı / Derin Boşluk',
        relX: 0.46,
        relY: 0.16,
        widthM: 4.0,
        lengthM: 4.5,
        depthMeters: 3.4,
        chamberType: 'VOID',
        innerStyle: 'void_black',
        colorHex: '#020617',
      },
      // 7. Top Northeast Stone Terrace Chamber
      {
        id: 'ch-top-east-slab',
        label: 'Kuzeydoğu Teras Taş Blok Odası',
        relX: 0.56,
        relY: 0.12,
        widthM: 4.6,
        lengthM: 4.2,
        depthMeters: 1.9,
        chamberType: 'STONE_SLAB',
        innerStyle: 'rect_slab',
        colorHex: '#64748b',
      },
      // 8. East Corridor Stone Room
      {
        id: 'ch-east-room',
        label: 'Doğu Galeri Yapısal Odası',
        relX: 0.71,
        relY: 0.51,
        widthM: 5.4,
        lengthM: 4.8,
        depthMeters: 2.7,
        chamberType: 'STONE_SLAB',
        innerStyle: 'rect_slab',
        colorHex: '#64748b',
      },
      // 9. Southwest Diagonal Mid-Chamber
      {
        id: 'ch-southwest-mid',
        label: 'Güneybatı Dehliz Dinlenme Odası',
        relX: 0.31,
        relY: 0.70,
        widthM: 5.6,
        lengthM: 5.0,
        depthMeters: 3.1,
        chamberType: 'STONE_SLAB',
        innerStyle: 'capsule',
        colorHex: '#64748b',
      },
      // 10. Southwest Lower Deep Cavity
      {
        id: 'ch-southwest-deep',
        label: 'Derin Kayaç Havzası & Akifer Boşluğu',
        relX: 0.14,
        relY: 0.86,
        widthM: 4.5,
        lengthM: 4.8,
        depthMeters: 4.2,
        chamberType: 'VOID',
        innerStyle: 'void_black',
        colorHex: '#020617',
      },
      // 11. Southeast Flank Sarcophagus Room
      {
        id: 'ch-southeast-tomb',
        label: 'Güneydoğu Masif Yapısal Taş Odası',
        relX: 0.85,
        relY: 0.78,
        widthM: 4.8,
        lengthM: 6.4,
        depthMeters: 2.2,
        chamberType: 'STONE_SLAB',
        innerStyle: 'rect_slab',
        colorHex: '#64748b',
      },
      // 12. Top-West Isolated Mound
      {
        id: 'ch-topwest-grave',
        label: 'Münferit Masif Taş Blok Anomalisi',
        relX: 0.29,
        relY: 0.17,
        widthM: 3.2,
        lengthM: 2.4,
        depthMeters: 1.6,
        chamberType: 'SARCOPHAGUS',
        innerStyle: 'capsule',
        colorHex: '#eab308',
      },
      // 13. South-Center Isolated Structures
      {
        id: 'ch-south-isolated-1',
        label: 'Güney Parsel Kireçtaşı Boşluk Odağı',
        relX: 0.42,
        relY: 0.88,
        widthM: 3.4,
        lengthM: 5.0,
        depthMeters: 2.0,
        chamberType: 'SARCOPHAGUS',
        innerStyle: 'capsule',
        colorHex: '#f59e0b',
      },
      {
        id: 'ch-south-isolated-2',
        label: 'Güneybatı Jeoteknik Masif Taş Odağı',
        relX: 0.58,
        relY: 0.92,
        widthM: 3.2,
        lengthM: 4.2,
        depthMeters: 1.8,
        chamberType: 'SARCOPHAGUS',
        innerStyle: 'capsule',
        colorHex: '#eab308',
      }
    );

    // Ensure all chambers have polygon points calculated
    chambers2D.forEach((ch) => {
      if (!ch.points || ch.points.length === 0) {
        const hw = ((ch.widthM || 4) * 0.007) / 2;
        const hl = ((ch.lengthM || 4) * 0.007) / 2;
        const cx = ch.relX ?? 0.5;
        const cy = ch.relY ?? 0.5;
        ch.points = [
          { relX: cx - hw, relY: cy - hl },
          { relX: cx + hw, relY: cy - hl },
          { relX: cx + hw, relY: cy + hl },
          { relX: cx - hw, relY: cy + hl },
        ];
      }
    });

    // Synchronize primary hotspots with key structural chambers for perfect interactivity
    if (chambers2D.length > 0) {
      // Map key chambers into hotspots so user can click, view 3D, and see radargrams
      chambers2D.slice(0, 9).forEach((ch, idx) => {
        if (hotspots[idx]) {
          hotspots[idx].relativeX = ch.relX;
          hotspots[idx].relativeY = ch.relY;
          hotspots[idx].depthMeters = ch.depthMeters || hotspots[idx].depthMeters;
          hotspots[idx].label = ch.label;
          hotspots[idx].dimX = Math.round(ch.widthM || 4);
          hotspots[idx].dimY = Math.round(ch.lengthM || 4);
          if (ch.chamberType === 'METALLIC_CORE') {
            hotspots[idx].anomalyType = 'METAL';
            hotspots[idx].anomalyTypeTr = 'Metalik Odak';
            hotspots[idx].colorHex = '#ef4444';
          } else if (ch.chamberType === 'VOID') {
            hotspots[idx].anomalyType = 'CAVITY';
            hotspots[idx].anomalyTypeTr = 'Boşluk / Havza';
            hotspots[idx].colorHex = '#e11d48';
          } else {
            hotspots[idx].anomalyType = 'STRUCTURE';
            hotspots[idx].anomalyTypeTr = 'Yapısal Oda / Taş Temel';
            hotspots[idx].colorHex = '#f59e0b';
          }
        }
      });
    }
  } else if (hotspots.length > 0) {
    // For non-historical sites with genuine detected hotspots, generate matching 2D structural polygons
    hotspots.forEach((spot) => {
      const hw = (spot.dimX * 0.007);
      const hl = (spot.dimY * 0.007);
      chambers2D.push({
        id: `poly-chamber-${spot.id}`,
        label: spot.label,
        relX: spot.relativeX,
        relY: spot.relativeY,
        widthM: spot.dimX,
        lengthM: spot.dimY,
        depthMeters: spot.depthMeters,
        colorHex: spot.colorHex,
        chamberType: spot.anomalyType === 'CAVITY' ? 'VOID' : spot.anomalyType === 'METAL' ? 'METALLIC_CORE' : 'WALL_ENCLOSURE',
        innerStyle: spot.anomalyType === 'CAVITY' ? 'void_black' : spot.anomalyType === 'METAL' ? 'target_core' : 'rect_slab',
        points: [
          { relX: +(spot.relativeX - hw).toFixed(3), relY: +(spot.relativeY - hl).toFixed(3) },
          { relX: +(spot.relativeX + hw).toFixed(3), relY: +(spot.relativeY - hl).toFixed(3) },
          { relX: +(spot.relativeX + hw).toFixed(3), relY: +(spot.relativeY + hl).toFixed(3) },
          { relX: +(spot.relativeX - hw).toFixed(3), relY: +(spot.relativeY + hl).toFixed(3) },
        ],
      });
    });

    if (hotspots.length >= 2 && overallScore >= 7) {
      corridors.push({
        id: 'corr-connect-1',
        points: [
          { relX: hotspots[0].relativeX, relY: hotspots[0].relativeY },
          { relX: +( (hotspots[0].relativeX + hotspots[1].relativeX) / 2 ).toFixed(3), relY: +( (hotspots[0].relativeY + hotspots[1].relativeY) / 2 ).toFixed(3) },
          { relX: hotspots[1].relativeX, relY: hotspots[1].relativeY },
        ],
        widthMeters: 2.2,
        label: 'Jeofiziksel Anomali Bağlantı Hattı',
      });
    }
  }

  // 7. DYNAMIC AXIS LINES (Connecting hotspots only if at least 2 exist)
  const axisLines: AnomalyAxisLine[] = [];
  if (hotspots.length >= 2) {
    for (let a = 0; a < Math.min(2, hotspots.length - 1); a++) {
      axisLines.push({
        id: `axis-${a + 1}`,
        start: { relX: hotspots[a].relativeX, relY: hotspots[a].relativeY },
        end: { relX: hotspots[a + 1].relativeX, relY: hotspots[a + 1].relativeY },
        color: hotspots[a].colorHex,
      });
    }
  }

  // Dynamic Notes reflecting realistic soil condition
  let notesTr = '';
  if (hotspots.length === 0) {
    notesTr = 'Bölgede homojen doğal zemin yapısı hakimdir. Yapay yeraltı boşluğu, metalik alterasyon veya yapısal anomali saptanmamıştır. (Doğal Zemin Formasyonu)';
  } else if (overallScore <= 4) {
    notesTr = 'Yüzey altı katmanlarında zayıf jeolojik katmanlaşma ve doğal mineral yoğunluk farkı algılandı. Belirgin yapay zemin mimarisi bulunmamaktadır.';
  } else if (overallScore <= 6) {
    notesTr = 'Bölgede orta şiddette manyetik gradyan ve radar dielektrik geri saçılımı saptandı.';
  } else {
    notesTr = 'Kritik spektral anomali ve yeraltı boşluk imzası. 2863 S.K. mevzuatı uyarınca izinsiz araştırma ve kazı yasaktır; resmi arkeolojik inceleme önerilir.';
  }

  // 8. SYNTHESIZE RADARGRAM (B-SCAN PROFILE TRANSECT)
  const transectLengthMeters = 40;
  const maxDepthMeters = 5.0;
  const twoWayTimeMaxNs = 80;

  const hyperbolas = hotspots.map((spot) => ({
    distM: +(5 + spot.relativeX * 30).toFixed(1),
    depthM: spot.depthMeters,
    timeNs: Math.round((spot.depthMeters / 0.108) * 2), // v = 0.108 m/ns
    widthM: +(spot.dimX * 0.8).toFixed(1),
    label: spot.label,
    hotspotId: spot.id,
    color: spot.colorHex,
  }));

  const strataLayers = hotspots.length > 0 ? [
    { depthM: 0.6, nameTr: 'Üst Toprak & Organik Katman', colorHex: '#78350f' },
    { depthM: 1.8, nameTr: 'Kalkerli Kil & Moloz Dolgu', colorHex: '#b45309' },
    { depthM: 3.6, nameTr: 'Masif Kireçtaşı & Yapısal Boşluk Kotu', colorHex: '#2563eb' },
    { depthM: 5.0, nameTr: 'Anakaya Formasyonu & Bazaltik Zemin', colorHex: '#0f172a' },
  ] : [
    { depthM: 0.6, nameTr: 'Üst Toprak & Doğal Humus', colorHex: '#78350f' },
    { depthM: 1.8, nameTr: 'Homojen Kil ve Alüvyonlu Sediment', colorHex: '#92400e' },
    { depthM: 3.6, nameTr: 'Sedimanter Kalker / Masif Taş Tabakası', colorHex: '#475569' },
    { depthM: 5.0, nameTr: 'Doğal Taban Anakayası (Bazalt / Şist)', colorHex: '#0f172a' },
  ];

  const traces: RadargramTrace[] = [];
  for (let d = 0; d <= 40; d += 1) {
    const nearby = hyperbolas.find(h => Math.abs(h.distM - d) < 1.5);
    const depthM = nearby ? nearby.depthM : +(1.5 + rand(d * 3) * 2.0).toFixed(1);
    traces.push({
      distanceMeters: d,
      twoWayTimeNs: Math.round((depthM / 0.108) * 2),
      depthMeters: depthM,
      amplitudeDb: nearby ? -Math.round(4 + rand(d) * 6) : -Math.round(22 + rand(d) * 12),
      featureLabel: nearby?.label,
      hasHyperbola: !!nearby,
    });
  }

  const radargramData: RadargramData = {
    transectLengthMeters,
    maxDepthMeters,
    twoWayTimeMaxNs,
    traces,
    hyperbolas,
    strataLayers,
  };

  const groundResolutionM = scanResolution === 'ULTRA' ? 0.22 : scanResolution === 'HD' ? 0.45 : 0.90;
  const sharpnessIndex = +(95.0 + rand(99) * 4.5).toFixed(1);
  const sarFocusQuality: 'OPTIMAL' | 'HIGH' | 'MAXIMUM' = scanResolution === 'ULTRA' ? 'MAXIMUM' : 'HIGH';

  return {
    id: `scan-${Math.round(center.lat * 10000)}-${Math.round(center.lng * 10000)}`,
    center,
    zoom: 18,
    locationName: locationName || `${center.lat.toFixed(6)}°N, ${center.lng.toFixed(6)}°E`,
    polygonCorners,
    hotspots,
    chambers3D,
    corridors,
    chambers2D,
    axisLines,
    overallScore,
    anomalyCount: hotspots.length,
    scannedAt: new Date(),
    satelliteUsedId: satelliteId,
    notesTr,
    scanMode,
    scanResolution,
    isocontoursEnabled,
    radargramData,
    groundResolutionM,
    sharpnessIndex,
    sarFocusQuality,
  };
}

export function generateReportData(scan: ScanArea, satelliteName: string): AnomalyReport {
  // If clean ground without anomalies
  if (scan.hotspots.length === 0) {
    return {
      scanId: scan.id,
      coordinates: `${scan.center.lat.toFixed(6)} ${scan.center.lng.toFixed(6)}`,
      locationName: scan.locationName,
      satelliteUsed: satelliteName,
      scanDate: scan.scannedAt.toLocaleString('tr-TR'),
      confidenceScore: scan.overallScore || 1,
      hotspotCount: 0,
      soilComposition: {
        ferrousMetalPct: 1,
        conductiveMineralPct: 7,
        cavityVoidPct: 0,
        stoneMasonryPct: 0,
        organicSoilPct: 92,
      },
      depthProfile: [
        { depthRangeM: '0.0 - 0.8 m', dominantFeature: 'Doğal Bitki Örtüsü & Üst Toprak', signalReflectivityDb: -26.5 },
        { depthRangeM: '0.8 - 2.0 m', dominantFeature: 'Homojen Alüvyon & Kil Tabakası', signalReflectivityDb: -22.1 },
        { depthRangeM: '2.0 - 3.5 m', dominantFeature: 'Sedimanter Kalker / Kumtaşı', signalReflectivityDb: -19.4 },
        { depthRangeM: '3.5 - 5.0 m', dominantFeature: 'Masif Doğal Anakaya Formasyonu', signalReflectivityDb: -16.8 },
      ],
      spectralSignature: [
        { wavelengthNm: 490, reflectance: 0.12 },
        { wavelengthNm: 560, reflectance: 0.18 },
        { wavelengthNm: 665, reflectance: 0.24 },
        { wavelengthNm: 705, reflectance: 0.31 },
        { wavelengthNm: 842, reflectance: 0.38 },
        { wavelengthNm: 1610, reflectance: 0.44 },
        { wavelengthNm: 2190, reflectance: 0.52 },
      ],
      recommendation: 'HOMOJEN DOĞAL ZEMİN: Bu koordinat bölgesinde yapılan uydu SAR ve jeofiziksel spektral yüzey altı taramasında herhangi bir yapay boşluk, ferromanyetik alterasyon veya arkeolojik yapısal anomali saptanmamıştır. Zemin doğal formasyonunu korumaktadır.',
    };
  }

  // Hotspots exist
  const metalCount = scan.hotspots.filter(h => h.anomalyType === 'METAL').length;
  const cavityCount = scan.hotspots.filter(h => h.anomalyType === 'CAVITY').length;
  const structCount = scan.hotspots.filter(h => h.anomalyType === 'STRUCTURE').length;
  const total = scan.hotspots.length;

  const ferrousMetalPct = Math.round((metalCount / total) * 35 + 5);
  const cavityVoidPct = Math.round((cavityCount / total) * 35 + 5);
  const stoneMasonryPct = Math.round((structCount / total) * 30 + 10);
  const conductiveMineralPct = Math.max(5, 100 - (ferrousMetalPct + cavityVoidPct + stoneMasonryPct + 15));

  return {
    scanId: scan.id,
    coordinates: `${scan.center.lat.toFixed(6)} ${scan.center.lng.toFixed(6)}`,
    locationName: scan.locationName,
    satelliteUsed: satelliteName,
    scanDate: scan.scannedAt.toLocaleString('tr-TR'),
    confidenceScore: scan.overallScore,
    hotspotCount: scan.hotspots.length,
    soilComposition: {
      ferrousMetalPct,
      conductiveMineralPct,
      cavityVoidPct,
      stoneMasonryPct,
      organicSoilPct: 15,
    },
    depthProfile: [
      { depthRangeM: '0.0 - 0.8 m', dominantFeature: 'Tarımsal Üst Toprak & Alüvyon', signalReflectivityDb: -22.4 },
      { depthRangeM: '0.8 - 2.0 m', dominantFeature: 'Kuvarsit & Taş Moloz Katmanı', signalReflectivityDb: -14.2 },
      { depthRangeM: '2.0 - 3.5 m', dominantFeature: scan.overallScore >= 6 ? 'Hava/Boşluk Dielektrik Kırılması (Oda)' : 'Doğal Sedimanter Kayaç', signalReflectivityDb: -8.1 },
      { depthRangeM: '3.5 - 5.0 m', dominantFeature: 'Taban Kayası (Kireçtaşı/Bazalt)', signalReflectivityDb: -18.9 },
    ],
    spectralSignature: [
      { wavelengthNm: 490, reflectance: 0.12 },
      { wavelengthNm: 560, reflectance: 0.18 },
      { wavelengthNm: 665, reflectance: 0.28 },
      { wavelengthNm: 705, reflectance: 0.35 },
      { wavelengthNm: 842, reflectance: +(0.4 + (scan.overallScore / 20)).toFixed(2) },
      { wavelengthNm: 1610, reflectance: +(0.5 + (scan.overallScore / 18)).toFixed(2) },
      { wavelengthNm: 2190, reflectance: 0.76 },
    ],
    recommendation: scan.overallScore >= 6 
      ? 'Tespit edilen sıcak noktalarda yüksek termal ve manyetik gradyan saptanmıştır. 2863 S.K. mevzuatı uyarınca izinsiz arama yasaktır; akademik/resmi çalışma kapsamında yer radarı (GPR) doğrulaması önerilir.'
      : 'Bölgede düşük jeofiziksel sapma gözlenmiştir. Zemin homojen olup kayda değer yapay anomali tespit edilmemiştir.',
  };
}

// Web Audio API for high-tech scanning sound effects
class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playScanBeep() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playAnomalyDiscovered() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [1200, 1600, 2400].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.1, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.15);
      });
    } catch {
      // Ignore
    }
  }

  public playGeigerPing(intensity: number = 70) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const freq = 600 + (intensity / 100) * 1800; // higher intensity = higher pitch
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch {
      // Ignore
    }
  }

  public playRadarSwathSweep() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.7);
      osc.frequency.exponentialRampToValueAtTime(420, now + 1.4);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.55);
    } catch {
      // Ignore
    }
  }

  public playPulsePing() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore
    }
  }

  public playRadarBeep() {
    this.playScanBeep();
  }

  public getIsMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }
}

export const sound = new SoundEngine();
