/**
 * Turkish Administrative & Settlement Geo-Database (İller, İlçeler, Köyler, Tarihi/Arkeolojik Alanlar)
 * Enables instant search by Province (İl), District (İlçe), Village (Köy/Belde), or Archaeological Sites.
 */

export interface GeoLocationItem {
  name: string;
  type: 'IL' | 'ILCE' | 'KOY' | 'ARKEOLOJI' | 'JEOFIZIK';
  typeLabel: string;
  province: string;
  district?: string;
  lat: number;
  lng: number;
  description?: string;
}

export const TURKISH_LOCATIONS: GeoLocationItem[] = [
  // İller ve Jeofizik Merkezleri
  { name: 'Uşak', type: 'IL', typeLabel: 'İl Merkezi', province: 'Uşak', lat: 38.6823, lng: 29.4082, description: 'Ege Bölgesi, İç Batı Anadolu Jeofizik Havzası' },
  { name: 'Banaz', type: 'ILCE', typeLabel: 'İlçe', province: 'Uşak', lat: 38.7408, lng: 29.7578, description: 'Banaz Çayı Vadisi, Zemin Anomali Bölgesi' },
  { name: 'Eşme', type: 'ILCE', typeLabel: 'İlçe', province: 'Uşak', lat: 38.3986, lng: 28.9667, description: 'Volkanik Zemin ve Jeotermal Anomaliler' },
  { name: 'Sivaslı', type: 'ILCE', typeLabel: 'İlçe', province: 'Uşak', lat: 38.5083, lng: 29.6833, description: 'Sebaste Antik Kenti ve Jeofizik Zemin Anomalisi Sahası' },
  { name: 'Ulubey', type: 'ILCE', typeLabel: 'İlçe', province: 'Uşak', lat: 38.4206, lng: 29.2894, description: 'Dünyanın 2. Büyük Kanyonu, Kaya Boşluk Formasyonları' },
  { name: 'Karahallı', type: 'ILCE', typeLabel: 'İlçe', province: 'Uşak', lat: 38.3228, lng: 29.5317, description: 'Clandras Köprüsü ve Antik Su Kanalları' },
  { name: 'Hacıkadem Köyü', type: 'KOY', typeLabel: 'Köy', province: 'Uşak', district: 'Merkez', lat: 38.6412, lng: 29.4531, description: 'Yeraltı akifer ve karstik boşluk tespit sahası' },
  { name: 'Kızılcasöğüt Beldesi', type: 'KOY', typeLabel: 'Belde', province: 'Uşak', district: 'Banaz', lat: 38.6667, lng: 29.6333, description: 'Yeraltı su ve mineral alterasyon alanı' },
  { name: 'Güre Köyü (Lidya Havzası)', type: 'ARKEOLOJI', typeLabel: 'Ören Yeri / Köy', province: 'Uşak', district: 'Merkez', lat: 38.6534, lng: 29.1764, description: 'Lidya Tümülüsleri ve Jeoteknik Zemin Anomalisi Sahası' },
  
  // İç Anadolu & Kapadokya (Yeraltı Şehirleri)
  { name: 'Derinkuyu Yeraltı Şehri', type: 'ARKEOLOJI', typeLabel: 'Yeraltı Şehri', province: 'Nevşehir', district: 'Derinkuyu', lat: 38.3736, lng: 34.7350, description: '8 Katlı 85m Derinlikte Devasa Yeraltı Odaları ve Dehlizleri' },
  { name: 'Kaymaklı Yeraltı Şehri', type: 'ARKEOLOJI', typeLabel: 'Yeraltı Şehri', province: 'Nevşehir', district: 'Kaymaklı', lat: 38.4599, lng: 34.7523, description: 'Tüf Kayaya Oyulu Antik Tünel ve Boşluk Sistemleri' },
  { name: 'Göreme', type: 'KOY', typeLabel: 'Tarihi Belde', province: 'Nevşehir', district: 'Merkez', lat: 38.6431, lng: 34.8289, description: 'Kapadokya Peri Bacaları ve Yeraltı Boşluk Formasyonları' },
  { name: 'Özkonak Yeraltı Şehri', type: 'ARKEOLOJI', typeLabel: 'Yeraltı Şehri', province: 'Nevşehir', district: 'Avanos', lat: 38.7561, lng: 35.0069, description: 'Haberleşme Kanalları ve Koridor Tünelleri' },
  { name: 'Gaziemir Yeraltı Şehri', type: 'ARKEOLOJI', typeLabel: 'Yeraltı Şehri', province: 'Aksaray', district: 'Güzelyurt', lat: 38.2589, lng: 34.3314, description: 'Kervansaraylı Yeraltı Zemin Kompleksi' },

  // Ege ve Akdeniz Arkeolojik ve Maden Sahaları
  { name: 'İzmir', type: 'IL', typeLabel: 'İl Merkezi', province: 'İzmir', lat: 38.4237, lng: 27.1428, description: 'Körfez Tektonik Fay ve Zemin Formasyonu' },
  { name: 'Urla', type: 'ILCE', typeLabel: 'İlçe', province: 'İzmir', lat: 38.3229, lng: 26.7640, description: 'Klazomenai Antik Zeytinyağı İşlikleri' },
  { name: 'Çeşme', type: 'ILCE', typeLabel: 'İlçe', province: 'İzmir', lat: 38.3235, lng: 26.3042, description: 'Termal Fay Hatları ve Kıyı Sedimanları' },
  { name: 'Selçuk (Efes)', type: 'ARKEOLOJI', typeLabel: 'Antik Kent', province: 'İzmir', district: 'Selçuk', lat: 37.9400, lng: 27.3414, description: 'Efes Antik Kenti ve Yamaç Evler Yeraltı Temel Yapıları' },
  { name: 'Şirince Köyü', type: 'KOY', typeLabel: 'Tarihi Köy', province: 'İzmir', district: 'Selçuk', lat: 37.9442, lng: 27.4328, description: 'Geleneksel Mimari ve Zemin Taramaları' },
  { name: 'Bergama (Pergamon)', type: 'ARKEOLOJI', typeLabel: 'Antik Kent', province: 'İzmir', district: 'Bergama', lat: 39.1325, lng: 27.1842, description: 'Akropol, Asklepion Antik Yeraltı Dehliz ve Tünelleri' },
  { name: 'Aydın', type: 'IL', typeLabel: 'İl Merkezi', province: 'Aydın', lat: 37.8444, lng: 27.8458, description: 'Menderes Grabeni Jeotermal Havzası' },
  { name: 'Afrodisias', type: 'ARKEOLOJI', typeLabel: 'Antik Kent', province: 'Aydın', district: 'Karacasu', lat: 37.7089, lng: 28.7239, description: 'Mermer Ocakları ve Antik Tapınak Temelleri' },
  { name: 'Denizli (Hierapolis & Pamukkale)', type: 'IL', typeLabel: 'İl Merkezi', province: 'Denizli', lat: 37.9254, lng: 29.1239, description: 'Plütonyum (Cehennem Kapısı) Yeraltı Gaz Boşluğu' },
  { name: 'Muğla', type: 'IL', typeLabel: 'İl Merkezi', province: 'Muğla', lat: 37.2153, lng: 28.3636, description: 'Menteşe Karstik Polye ve Mağaralar' },
  { name: 'Bodrum (Halikarnas)', type: 'ILCE', typeLabel: 'İlçe', province: 'Muğla', lat: 37.0344, lng: 27.4305, description: 'Mausoleum Temelleri ve Yeraltı Boşluk Odaları' },
  { name: 'Fethiye', type: 'ILCE', typeLabel: 'İlçe', province: 'Muğla', lat: 36.6217, lng: 29.1164, description: 'Amyntas Kaya Boşluk Formasyonu ve Tlos' },
  { name: 'Kayaköy', type: 'KOY', typeLabel: 'Tarihi Köy', province: 'Muğla', district: 'Fethiye', lat: 36.5744, lng: 29.0911, description: 'Kaya Odaları ve Taş Mimari Temelleri' },
  { name: 'Kaş (Antiphellos)', type: 'ILCE', typeLabel: 'İlçe', province: 'Antalya', lat: 36.1999, lng: 29.6433, description: 'Likya Taş Blokları ve Su Altı Yapıları' },
  { name: 'Kekova (Batık Şehir)', type: 'ARKEOLOJI', typeLabel: 'Batık Şehir', province: 'Antalya', district: 'Demre', lat: 36.1867, lng: 29.8631, description: 'Tektonik Batık Liman ve Yeraltı Boşlukları' },
  { name: 'Antalya', type: 'IL', typeLabel: 'İl Merkezi', province: 'Antalya', lat: 36.8969, lng: 30.7133, description: 'Traverten Platosu ve Karstik Düdenler' },
  { name: 'Çıralı & Olympos', type: 'KOY', typeLabel: 'Köy / Antik', province: 'Antalya', district: 'Kemer', lat: 36.4172, lng: 30.4764, description: 'Yanartaş (Chimaera) Doğal Gaz Çıkışı' },

  // Marmara & Çanakkale
  { name: 'Çanakkale (Truva / Troy)', type: 'ARKEOLOJI', typeLabel: 'Antik Kent', province: 'Çanakkale', district: 'Merkez', lat: 39.9575, lng: 26.2389, description: '9 Kültür Katı ve Arkeojeofizik Savunma Hendekleri' },
  { name: 'Adatepe Köyü', type: 'KOY', typeLabel: 'Tarihi Köy', province: 'Çanakkale', district: 'Ayvacık', lat: 39.5961, lng: 26.6083, description: 'Zeus Altarı ve Kazdağları Zemin Yapısı' },
  { name: 'Assos (Behramkale)', type: 'ARKEOLOJI', typeLabel: 'Antik Kent / Köy', province: 'Çanakkale', district: 'Ayvacık', lat: 39.4897, lng: 26.3364, description: 'Andezit Taş Ocakları ve Antik Yapı Temelleri' },
  { name: 'Bursa', type: 'IL', typeLabel: 'İl Merkezi', province: 'Bursa', lat: 40.1885, lng: 29.0610, description: 'Kuzey Anadolu Fayı Güney Kolu' },
  { name: 'Cumalıkızık Köyü', type: 'KOY', typeLabel: 'UNESCO Köyü', province: 'Bursa', district: 'Yıldırım', lat: 40.1772, lng: 29.1706, description: '700 Yıllık Osmanlı Vakıf Köyü Zemin Yapısı' },
  { name: 'İstanbul (Sultanahmet)', type: 'IL', typeLabel: 'Tarihi Yarımada', province: 'İstanbul', district: 'Fatih', lat: 41.0054, lng: 28.9768, description: 'Yerebatan Sarnıcı ve Bizans Yeraltı Galerileri' },

  // Güneydoğu & Doğu Anadolu (Göbeklitepe, Karahantepe, Nemrut)
  { name: 'Göbeklitepe', type: 'ARKEOLOJI', typeLabel: 'Neolitik Merkez', province: 'Şanlıurfa', district: 'Haliliye', lat: 37.2231, lng: 38.9225, description: '12.000 Yıllık T Biçimli Dikilitaşlar ve Taş Odalar' },
  { name: 'Karahantepe', type: 'ARKEOLOJI', typeLabel: 'Neolitik Merkez', province: 'Şanlıurfa', district: 'Haliliye', lat: 37.0733, lng: 39.4678, description: 'Kayaya Oyulu Neolitik Yapılar ve Tören Alanı' },
  { name: 'Harran', type: 'ILCE', typeLabel: 'Tarihi İlçe', province: 'Şanlıurfa', lat: 36.8644, lng: 39.0278, description: 'Kümbet Evler ve Antik Rasathane Höyüğü' },
  { name: 'Nemrut Dağı Tümülüsü', type: 'ARKEOLOJI', typeLabel: 'Kraliyet Tümülüsü', province: 'Adıyaman', district: 'Kahta', lat: 37.9806, lng: 38.7408, description: 'Kırma Taş Yığını Altında Litolojik Zemin Boşluk Formasyonu' },
  { name: 'Dara Antik Kenti (Zindan)', type: 'ARKEOLOJI', typeLabel: 'Antik Kent', province: 'Mardin', district: 'Artuklu', lat: 37.1817, lng: 40.9458, description: 'Devasa Kayaya Oyulu Su Sarnıçları ve Yeraltı Galerileri' },
  { name: 'Ahlat (Tarihi Sit Sahası)', type: 'ARKEOLOJI', typeLabel: 'Tarihi Sit Sahası', province: 'Bitlis', district: 'Ahlat', lat: 38.7550, lng: 42.4839, description: 'Tarihi Mimari Kalıntılar ve Kümbet Temelleri' },
  { name: 'Ani Harabeleri', type: 'ARKEOLOJI', typeLabel: 'Antik Kent', province: 'Kars', district: 'Arpaçay', lat: 40.5075, lng: 43.5728, description: '1001 Kiliseli Şehir ve Yeraltı Mağara Konutları' },

  // Karadeniz & İç Anadolu
  { name: 'Safranbolu', type: 'ILCE', typeLabel: 'Tarihi İlçe', province: 'Karabük', lat: 41.2508, lng: 32.6942, description: 'Kanyonlar ve Tarihi Yeraltı Su Kanalları' },
  { name: 'Yörük Köyü', type: 'KOY', typeLabel: 'Tarihi Köy', province: 'Karabük', district: 'Safranbolu', lat: 41.2294, lng: 32.7489, description: 'Bektaşi Konakları ve Zemin Boşlukları' },
  { name: 'Hattuşa (Boğazkale)', type: 'ARKEOLOJI', typeLabel: 'Hitit Başkenti', province: 'Çorum', district: 'Boğazkale', lat: 40.0197, lng: 34.6153, description: 'Yerkapı Tüneli (Potern) ve Hitit Yeraltı Geçitleri' },
  { name: 'Gordion (Midas Tümülüsü)', type: 'ARKEOLOJI', typeLabel: 'Frig Başkenti', province: 'Ankara', district: 'Polatlı', lat: 39.6508, lng: 31.9867, description: 'Midas Ahşap Yapı Formasyonu ve 53m Yüksekliğinde Tümülüs Boşluk Anomalisi' },
  { name: 'Çatalhöyük', type: 'ARKEOLOJI', typeLabel: 'Neolitik Höyük', province: 'Konya', district: 'Çumra', lat: 37.6675, lng: 32.8272, description: '9.000 Yıllık Sokaksız Damdan Girişli Yeraltı Evleri' },
  { name: 'Sümela Manastırı', type: 'ARKEOLOJI', typeLabel: 'Kaya Manastırı', province: 'Trabzon', district: 'Maçka', lat: 40.6900, lng: 39.6583, description: 'Karadağ Sarp Kayalığına Oyulu Mağara Kilisesi' },
];

/**
 * Searches local catalog by query string (case-insensitive Turkish).
 */
export function searchLocalLocations(query: string): GeoLocationItem[] {
  const cleanQ = query.trim().toLocaleLowerCase('tr-TR');
  if (!cleanQ || cleanQ.length < 2) return [];

  return TURKISH_LOCATIONS.filter((loc) => {
    const nameMatch = loc.name.toLocaleLowerCase('tr-TR').includes(cleanQ);
    const provMatch = loc.province.toLocaleLowerCase('tr-TR').includes(cleanQ);
    const distMatch = loc.district ? loc.district.toLocaleLowerCase('tr-TR').includes(cleanQ) : false;
    const descMatch = loc.description ? loc.description.toLocaleLowerCase('tr-TR').includes(cleanQ) : false;
    return nameMatch || provMatch || distMatch || descMatch;
  }).slice(0, 8);
}

/**
 * Parses coordinate string (e.g. "38.477309 29.728954" or "38.47, 29.72")
 */
export function parseCoordinates(input?: string | null): { lat: number; lng: number } | null {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().replace(/,/g, ' ');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}
