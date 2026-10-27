/**
 * TerraScan AI - Veldscan Remote Sensing & Ground Anomaly Detection
 * Type Definitions
 */

export type ViewDimension = '2D' | '3D';

export type DataLayerType = 
  | 'ADVANCED'     // Gelişmiş
  | 'NONE'         // Hiçbiri
  | 'METAL_MINERAL'// Metal / Mineral
  | 'ANOMALY'      // Anomali
  | 'VEGETATION'   // Bitki örtüsü (NDVI)
  | 'MULTI';       // Çoklu

export type ActiveSensorType = 
  | 'OPTICAL_RELIEF' // Optik / Rölyef
  | 'METAL_MINERAL'; // Metal / Mineral

export type MapTileStyle = 'satellite' | 'hybrid' | 'googleSat' | 'opentopo' | 'dark' | 'light';

export type MembershipPlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

export type UserRank = 'OBSERVER' | 'OPERATOR' | 'ANALYST' | 'CHIEF_ENGINEER' | 'ADMIN';

export type AppLanguage = 'tr' | 'en' | 'de' | 'ar' | 'ru' | 'fr' | 'es';

export interface AppAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'UPDATE' | 'ALERT' | 'PROMO';
  createdAt: string;
  author: string;
  active: boolean;
}

export interface InviteCode {
  id: string;
  code: string;
  tokens: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
  description?: string;
}

export interface UsedInviteCode {
  id: string;
  code: string;
  code_id?: string;
  user_id: string;
  user_email: string;
  tokens_awarded: number;
  used_at: string;
}

export interface SavedStudy {
  id: string;
  title: string;
  coordinates: string;
  lat: number;
  lng: number;
  locationName: string;
  date: string;
  satelliteName: string;
  hotspotCount: number;
  confidenceScore: number;
  depthRange: string;
  notes?: string;
  tags?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  plan: MembershipPlanTier;
  planNameTr: string;
  rank: UserRank;
  rankLevel: number;        // Sınırsız Rütbe Seviyesi (Level 1, 2, 3 ... 100+)
  rankXp: number;           // Mevcut XP Puanı
  nextRankXp: number;       // Bir sonraki seviye için gereken XP
  rankTitle: string;
  rankBadge: string;
  vipLevel: number;         // Sınırsız VIP Seviyesi (VIP 1, VIP 2 ... VIP 99+)
  vipPoints: number;        // Kredi yüklendikçe artan VIP Puanı
  nextVipPoints: number;    // Sonraki VIP Seviyesi eşiği
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  isChatMuted?: boolean;    // Admin tarafından sohbet yetkisinin kapatılması (Mute)
  role: 'USER' | 'ADMIN';
  creditsRemaining: number;
  totalScansPerformed: number;
  scansConducted?: number;
  memberSince: string;
  savedLocationsCount: number;
  savedStudies: SavedStudy[];
  preferredLanguage: AppLanguage;
  referralCode?: string;          // Benzersiz davet kodu (örn: TERA-REF-AHMET88)
  referredBy?: string;            // Kullanıcıyı davet eden kişinin kodu
  usedReferralCode?: string;      // Kullanılan davet kodu
  referralsCount?: number;        // Davet edilen arkadaş sayısı
  referralCreditsEarned?: number; // Referanslardan kazanılan toplam kredi
  phone?: string;                 // Telefon Numarası
  platform?: string;              // Bağlantı Platformu (Web, Android APK, Manuel vb.)
  deviceModel?: string;           // Cihaz Bilgisi (örn. Samsung Galaxy S22 Ultra, Xiaomi 13T)
  deviceSignature?: string;       // Benzersiz Donanım & Cihaz İmzası (Anti-Abuse)
  deviceBonusClaimed?: boolean;   // Bu cihazda hediye deneme kredisi kullanıldı mı?
  lastLoginIp?: string;           // Son Giriş IP
  lastLoginDate?: string;         // Son Giriş Tarihi / Saati
  licenseExpires?: string;        // Lisans Bitiş Tarihi (örn. '2027-01-01', 'SINIRSIZ')
  activeLicenseKey?: string;      // Aktif Lisans Anahtarı (örn: TERA-XXXX-XXXX-XXXX-TR)
  createdAt?: string;             // Oluşturulma Zamanı (ISO string)
  creditHistory?: {
    id: string;
    type: 'ADD' | 'SPEND' | 'PROMO' | 'REFUND';
    amount: number;
    description: string;
    date: string;
  }[];
}

export interface SystemScanLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  locationName: string;
  coordinates: { lat: number; lng: number };
  anomalyType: 'CAVITY' | 'METAL' | 'STRUCTURE' | 'MINERAL';
  depthMeters: number;
  confidenceScore: number;
  scanMode: string;
  satelliteName: string;
  timestamp: string;
}

export interface SecurityAndApiLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  category: 'AUTH' | 'API_GATEWAY' | 'DEM_TERRAIN' | 'RATE_LIMIT' | 'SATELLITE_FEED' | 'SUSPICIOUS_ACTIVITY';
  ip: string;
  platform: 'Web' | 'Android APK' | 'REST API';
  message: string;
  details?: string;
}

export interface GeneratedLicenseKey {
  key: string;
  type: string;
  credits: number;
  customer: string;
  createdAt: string;
  status: 'BEKLIYOR' | 'KULLANILDI';
  usedBy?: string;
  usedAt?: string;
}

export interface RemoteSensingSatellite {
  id: string;
  name: string;
  agency: string;
  orbitType: string;
  altitudeKm: number;
  sensors: string[];
  spectralBands: string[];
  resolutionMeters: number;
  penetrationDepthDesc: string;
  revisitDays: number;
  status: 'ACTIVE' | 'CALIBRATING';
  iconType: 'multispectral' | 'radar_sar' | 'thermal_tir';
  color: string;
}

export type ScanMode = 
  | 'SAR_VELD'          // Veldscan Termal & Sentetik Açıklıklı Radar
  | 'GPR_PULSE'         // Yer Radarı & Dielektrik Yansıma Hiperbolleri
  | 'MAGNETIC_GRADIENT' // Manyetik Çift Kutupluluk (Dipol)
  | 'LIDAR_BARE'        // Çıplak Zemin Mikro-Topografi
  | 'RESISTIVITY_ERT';  // Elektriksel Özdirenç Tomografisi

export type ScanResolution = 'STANDARD' | 'HD' | 'ULTRA';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MaterialProbabilities {
  cavityVoidPct: number;      // Yeraltı Boşluğu / Yapısal Zemin Odası
  metallicFerrousPct: number; // Ferromanyetik / Değerli Metal
  stoneMasonryPct: number;    // Harçlı Taş Duvar / Masif Temel
  mineralVeinPct: number;     // İletken Mineral / Alterasyon
}

export interface AnomalyHotspot {
  id: number;
  label: string; // e.g., "3×2 m · sıcak nokta"
  relativeX: number; // 0 to 1 inside scan polygon box
  relativeY: number; // 0 to 1 inside scan polygon box
  sizeMeters: string; // "3×2 m", "9×2 m", "4×2 m"
  intensity: number; // 0 to 100
  depthMeters: number; // e.g. 2.4 m
  anomalyType: 'METAL' | 'MINERAL' | 'CAVITY' | 'STRUCTURE' | 'WALL';
  anomalyTypeTr: string;
  score: number; // 1 to 10
  colorHex: string;
  // 3D Volumetric bounds
  dimX: number; // width in meters
  dimY: number; // length in meters
  dimZ: number; // depth/thickness in meters
  // Advanced Geophysical Inversion Parameters
  magneticDeltaNt?: number;        // e.g. +84.5 nT or -32.1 nT
  resistivityOhmM?: number;        // e.g. 1850 Ohm*m (Void), 35 Ohm*m (Metal)
  dielectricPermittivity?: number; // e.g. 5.5 - 8.2 (Limestone/Rock)
  radarReflectivityDb?: number;    // e.g. -14.2 dB
  materialProbabilities?: MaterialProbabilities;
  azimuthDeg?: number;             // Structure orientation angle (0-360)
  aspectRatio?: number;            // Length to width ratio for oriented elliptical/rectangular rendering
  focusSharpnessPct?: number;      // HD Focus sharpness percentage (e.g. 98.4%)
  snrDb?: number;                  // Signal-to-noise ratio in decibels (e.g. 28.5 dB)
}

export interface RadargramTrace {
  distanceMeters: number;
  twoWayTimeNs: number; // 0 - 80 ns
  depthMeters: number;   // 0 - 5.0 m
  amplitudeDb: number;   // -40 to +20 dB
  featureLabel?: string;
  hasHyperbola?: boolean;
}

export interface RadargramData {
  transectLengthMeters: number;
  maxDepthMeters: number;
  twoWayTimeMaxNs: number;
  traces: RadargramTrace[];
  hyperbolas: Array<{
    distM: number;
    depthM: number;
    timeNs: number;
    widthM: number;
    label: string;
    hotspotId: number;
    color: string;
  }>;
  strataLayers: Array<{
    depthM: number;
    nameTr: string;
    colorHex: string;
  }>;
}

export interface SubsurfaceChamber3D {
  id: string;
  index: number;
  x: number; // relative center -1 to 1
  y: number; // relative center -1 to 1
  depthFrom: number; // e.g. 1.2 m
  depthTo: number;   // e.g. 3.8 m
  widthM: number;
  lengthM: number;
  heightM: number;
  color: string;
  label: string;
  shapeType: 'box' | 'cylinder' | 'corridor';
}

export interface StructuralCorridor {
  id: string;
  points: { relX: number; relY: number }[];
  widthMeters: number;
  label: string;
}

export interface StructuralChamberPolygon {
  id: string;
  points?: { relX: number; relY: number }[];
  label: string;
  colorHex?: string;
  relX: number;
  relY: number;
  widthM?: number;
  lengthM?: number;
  depthMeters?: number;
  rotationDeg?: number;
  chamberType?: 'VAULT' | 'STONE_SLAB' | 'METALLIC_CORE' | 'VOID' | 'WALL_ENCLOSURE' | 'SARCOPHAGUS';
  innerStyle?: 'capsule' | 'rect_slab' | 'target_core' | 'green_gold' | 'void_black' | 'dual_ring';
}

export interface AnomalyAxisLine {
  id: string;
  start: { relX: number; relY: number };
  end: { relX: number; relY: number };
  color: string;
}

export interface ScanArea {
  id: string;
  center: Coordinates;
  zoom: number;
  locationName: string;
  polygonCorners: Coordinates[]; // 4 to 6 corner nodes
  hotspots: AnomalyHotspot[];
  chambers3D: SubsurfaceChamber3D[];
  corridors?: StructuralCorridor[];
  chambers2D?: StructuralChamberPolygon[];
  axisLines?: AnomalyAxisLine[];
  overallScore: number; // e.g. 6 or 5 or 4
  anomalyCount: number;
  scannedAt: Date;
  satelliteUsedId: string;
  notesTr: string;
  // Advanced Scan Configuration & Radargram
  scanMode?: ScanMode;
  scanResolution?: ScanResolution;
  isocontoursEnabled?: boolean;
  radargramData?: RadargramData;
  groundResolutionM?: number;    // Spatial ground resolution (e.g. 0.22 m/pixel)
  sharpnessIndex?: number;       // Focus clarity index (0-100)
  sarFocusQuality?: 'OPTIMAL' | 'HIGH' | 'MAXIMUM';
}

export interface AnomalyReport {
  scanId: string;
  coordinates: string;
  locationName: string;
  satelliteUsed: string;
  scanDate: string;
  confidenceScore: number; // out of 10
  hotspotCount: number;
  soilComposition: {
    ferrousMetalPct: number;
    conductiveMineralPct: number;
    cavityVoidPct: number;
    stoneMasonryPct: number;
    organicSoilPct: number;
  };
  depthProfile: {
    depthRangeM: string;
    dominantFeature: string;
    signalReflectivityDb: number;
  }[];
  spectralSignature: {
    wavelengthNm: number;
    reflectance: number;
  }[];
  recommendation: string;
}

export interface DepthFilter {
  minDepth: number; // meters e.g. 0.0
  maxDepth: number; // meters e.g. 5.0
  label: string;
}

export interface MeasurePoint {
  lat: number;
  lng: number;
}

export interface CommunityChatMessage {
  id: string;
  user_id?: string;
  userId?: string;
  user_name?: string;
  userName?: string;
  user_email?: string;
  userEmail?: string;
  user_role?: 'ADMIN' | 'USER';
  userRole?: 'ADMIN' | 'USER';
  vip_level?: number;
  vipLevel?: number;
  message: string;
  created_at?: string;
  createdAt?: string;
  location_tag?: string;
  locationTag?: string;
}

export interface LicensePackage {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  shopierUrl: string;
  description: string;
}

export const SHOPIER_LICENSE_PACKAGES: LicensePackage[] = [
  {
    id: 'license-1w',
    name: '1 Hafta Sınırsız Lisans',
    durationDays: 7,
    price: 1000,
    shopierUrl: 'https://www.shopier.com/ulubeyteknoloji/50957943',
    description: '7 Gün Sınırsız Tarama ve Analiz Lisansı (1.000 TL)',
  },
  {
    id: 'license-1m',
    name: '1 Ay Sınırsız Lisans',
    durationDays: 30,
    price: 3000,
    shopierUrl: 'https://www.shopier.com/ulubeyteknoloji/50957571',
    description: '30 Gün Sınırsız Tarama ve Analiz Lisansı (3.000 TL)',
  },
  {
    id: 'license-2m',
    name: '2 Ay Sınırsız Lisans',
    durationDays: 60,
    price: 6000,
    shopierUrl: 'https://www.shopier.com/ulubeyteknoloji/50958035',
    description: '60 Gün Sınırsız Tarama ve Analiz Lisansı (6.000 TL)',
  },
  {
    id: 'license-3m',
    name: '3 Ay Sınırsız Lisans',
    durationDays: 90,
    price: 9000,
    shopierUrl: 'https://www.shopier.com/ulubeyteknoloji/50958045',
    description: '90 Gün Sınırsız Tarama ve Analiz Lisansı (9.000 TL)',
  },
  {
    id: 'license-12m',
    name: '12 Ay Sınırsız Lisans',
    durationDays: 365,
    price: 36000,
    shopierUrl: 'https://www.shopier.com/ulubeyteknoloji/50958060',
    description: '365 Gün Sınırsız Tarama ve Analiz Lisansı (36.000 TL)',
  },
];
