/**
 * TerraScan AI - Remote Sensing Satellites & Geospatial Reference Sites
 */

import { RemoteSensingSatellite, ScanArea, UserProfile, LicensePackage, SHOPIER_LICENSE_PACKAGES } from '../types';

export type { LicensePackage };
export { SHOPIER_LICENSE_PACKAGES };

export const REMOTE_SENSING_SATELLITES: RemoteSensingSatellite[] = [
  {
    id: 'sentinel-2b',
    name: 'Sentinel-2B (MSI)',
    agency: 'ESA / Copernicus',
    orbitType: 'SSO Güneşle Eşzamanlı (786 km)',
    altitudeKm: 786,
    sensors: ['Multispectral Instrument (MSI)', 'Red-Edge', 'SWIR'],
    spectralBands: ['B2 (Mavi)', 'B3 (Yeşil)', 'B4 (Kırmızı)', 'B8 (Geniş NIR)', 'B11 (SWIR-1)', 'B12 (SWIR-2)'],
    resolutionMeters: 10,
    penetrationDepthDesc: 'Yüzey üstü ve kök bölgesi nem/mineral izleri (0 - 1.5 m)',
    revisitDays: 5,
    status: 'ACTIVE',
    iconType: 'multispectral',
    color: '#06b6d4',
  },
  {
    id: 'landsat-9',
    name: 'Landsat 9 (OLI-2 & TIRS-2)',
    agency: 'NASA / USGS',
    orbitType: 'LEO Polar SSO (705 km)',
    altitudeKm: 705,
    sensors: ['Operational Land Imager-2', 'Thermal Infrared Sensor-2'],
    spectralBands: ['Termal Kızılötesi TIR-1 (10.8µm)', 'TIR-2 (12µm)', 'Kısa Dalga SWIR'],
    resolutionMeters: 15,
    penetrationDepthDesc: 'Termal atalet & jeotermal sıcak nokta ayrımı (0.5 - 3.5 m)',
    revisitDays: 8,
    status: 'ACTIVE',
    iconType: 'thermal_tir',
    color: '#f97316',
  },
  {
    id: 'terra-aster',
    name: 'Terra ASTER (Mineral & SWIR)',
    agency: 'NASA / METI (Japonya)',
    orbitType: 'SSO (705 km)',
    altitudeKm: 705,
    sensors: ['Advanced Spaceborne Thermal Emission & Reflection (14 Bant)'],
    spectralBands: ['VNIR 3 Bant', 'SWIR 6 Bant (Al-OH, Fe-Mg, Karbonat)', 'TIR 5 Bant (Kuvars/Silikat)'],
    resolutionMeters: 15,
    penetrationDepthDesc: 'Metalik cevherleşme, kalkopirit, hematit ve hidrotermal alterasyon (1 - 4 m)',
    revisitDays: 16,
    status: 'ACTIVE',
    iconType: 'multispectral',
    color: '#a855f7',
  },
  {
    id: 'sentinel-1a',
    name: 'Sentinel-1A (C-SAR Yeraltı Radarı)',
    agency: 'ESA',
    orbitType: 'LEO Polar (693 km)',
    altitudeKm: 693,
    sensors: ['C-Band Synthetic Aperture Radar (SAR) 5.405 GHz'],
    spectralBands: ['VV + VH Polarizasyon', 'HH + HV Çapraz Faz'],
    resolutionMeters: 5,
    penetrationDepthDesc: 'Kuru kum ve gevşek alüvyonda dielektrik boşluk ve duvar tespiti (2 - 8 m)',
    revisitDays: 6,
    status: 'ACTIVE',
    iconType: 'radar_sar',
    color: '#10b981',
  },
  {
    id: 'worldview-3',
    name: 'WorldView-3 (Super-Resolution)',
    agency: 'Maxar Technologies',
    orbitType: 'LEO SSO (617 km)',
    altitudeKm: 617,
    sensors: ['Pankromatik 31cm', 'VNIR 8 Bant', 'SWIR 8 Bant', 'CAVIS'],
    spectralBands: ['Pankromatik 0.31m', 'Demir Oksit Bandı', 'Kil/Mineral İndeksi'],
    resolutionMeters: 0.31,
    penetrationDepthDesc: 'Mikro toprak çöküntüsü, zemin temel ve fay kırığı kalıntıları (0 - 2 m)',
    revisitDays: 1,
    status: 'ACTIVE',
    iconType: 'multispectral',
    color: '#3b82f6',
  },
  {
    id: 'imece-gokturk',
    name: 'İMECE & Göktürk (TÜBİTAK UZAY)',
    agency: 'Türkiye Uzay Ajansı / TUSAŞ',
    orbitType: 'LEO Güneşle Eşzamanlı (680 km)',
    altitudeKm: 680,
    sensors: ['Elektro-Optik Kamera (Alt-Metre)', 'Kızılötesi Sensör'],
    spectralBands: ['Pankromatik 0.99m', 'Kırmızı, Yeşil, Mavi, Yakın Kızılötesi'],
    resolutionMeters: 0.99,
    penetrationDepthDesc: 'Ulusal yüksek çözünürlüklü yüzey ve yapı rölyef ayrımı',
    revisitDays: 3,
    status: 'ACTIVE',
    iconType: 'multispectral',
    color: '#ef4444',
  }
];

export const INITIAL_USER_PROFILE: UserProfile = {
  id: 'usr-analiz-2026',
  name: 'Analiz Uzmanı',
  email: 'analizkafalar@gmail.com',
  plan: 'PRO',
  planNameTr: 'Tera Jetonlu Üyelik',
  rank: 'ANALYST',
  rankLevel: 18,
  rankXp: 3400,
  nextRankXp: 3800,
  rankTitle: 'Uzman Jeoradar Analisti (Seviye 18)',
  rankBadge: '🥇',
  vipLevel: 5,
  vipPoints: 1250,
  nextVipPoints: 1600,
  status: 'ACTIVE',
  role: 'USER',
  creditsRemaining: 10,
  totalScansPerformed: 134,
  scansConducted: 134,
  memberSince: '14 Mart 2025',
  savedLocationsCount: 18,
  preferredLanguage: 'tr',
  savedStudies: [],
};

// Preset reference scanning locations (Geophysical, geotechnical and structural survey sites)
export const PRESET_SCAN_SITES: {
  name: string;
  coords: string;
  lat: number;
  lng: number;
  description: string;
}[] = [
  {
    name: 'Uşak Jeofizik ve Zemin Araştırma Sahası',
    coords: '38.477309 29.728954',
    lat: 38.477309,
    lng: 29.728954,
    description: 'Yeraltı taş formasyon ve dehliz bağlantısı (3D Hacimsel Anomali)',
  },
  {
    name: 'Ağrı - Doğubayazıt Sahası',
    coords: '39.168312 43.869999',
    lat: 39.168312,
    lng: 43.869999,
    description: '9x2 m sıcak nokta koridoru ve metal/mineral kümesi',
  },
  {
    name: 'Denizli Masif Kireçtaşı ve Boşluk Sahası',
    coords: '37.925410 29.123840',
    lat: 37.92541,
    lng: 29.12384,
    description: 'Tonozlu yapısal boşluklar ve kireçtaşı fay kırığı anomalisi',
  },
  {
    name: 'Şanlıurfa Harran Jeolojik Kayaç Formasyonu',
    coords: '37.223241 38.922419',
    lat: 37.223241,
    lng: 38.922419,
    description: 'Konsantrik taş çevreleme ve yeraltı masif kayaç anomalisi',
  },
  {
    name: 'Çanakkale Boğaz Kıyısı Jeoteknik Zemin Sahası',
    coords: '39.957444 26.238865',
    lat: 39.957444,
    lng: 26.238865,
    description: 'Çok katmanlı jeolojik tabakalaşma ve temel izleri',
  },
  {
    name: 'Kapadokya Tüf Kayaç Yeraltı Galeri Sahası',
    coords: '38.373510 34.734910',
    lat: 38.37351,
    lng: 34.73491,
    description: 'Tüf kayalara oyulu çok katlı yeraltı boşluk ve galeri ağları',
  }
];
