# Gerçek Topografik (DEM) Tabanlı Tam Ekran LiDAR Isı Haritası Uygulama Planı

## 1. Genel Bakış ve Hedef
Mevcut ısı haritasında bulunan sabit (hardcoded) temel, tümülüs ve etiket koordinatları tamamen kaldırılacaktır. Bunun yerine, haritanın o anki ekran görünümündeki (**viewport**) gerçek topografik rakım (Digital Elevation Model - DEM), eğim (Slope), bakı (Aspect) ve yüzey eğriliği (Topographic Position Index / Laplacian Curvature) verilerini gerçek zamanlı işleyen, **her koordinatta tamamen orijinal ve gerçek arazi kabartmasını** yansıtan tam ekran bir LiDAR ısı haritası motoru kurulacaktır.

---

## 2. Mimari ve Teknik Bileşenler

### A. Gerçek Topografik Rakım (DEM) Veri Motoru (`src/utils/demTileLoader.ts`)
- **Küresel Gerçek Rakım Karoları (AWS Terrarium DEM):**
  - Haritanın o anki görünüm sınırları (`bounds: north, south, east, west` ve `zoom`) üzerinden gerçek topografik yükseklik karoları (`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`) CORS uyumlu olarak bellekte birleştirilir.
  - Her pikselin gerçek metre cinsinden rakımı `height = (R * 256 + G + B / 256) - 32768` formülü ile milimetrik hassasiyetle çözülür ve雙doğrusal (bilinear) enterpolasyon ile pürüzsüzleştirilir.
- **Gerçek Topografik Türev Analizleri (Sabit Şablon Yok):**
  - **Eğim (Slope) & Yönelim (Aspect):** 3x3 Sobel/Horn diferansiyel operatörü ile arazinin gerçek eğim açısı ve sırt/yamaç kırılmaları hesaplanır.
  - **Mikro-Kabartma & Yerel Eğrilik (TPI / Laplacian Residual Relief):** Arazinin genel eğimi (trend surface) çıkarılarak yerel tümsekler (tümülüs/yığma adayları), çöküntüler (oda/boşluk adayları) ve doğrusal sırt/teras hatları (antik duvar/temel adayları) gerçek rakım farklarından izole edilir.
  - **Çok Açılı Hillshade (Azimut Gölgelendirme):** Derinlik, hedef türü ve 6'lı sıralı filtre seçimine göre topografik kabartma katmanı gerçek zamanlı işlenir.

### B. 26-Bant Surfer Pro & LiDAR Render Motoru Güncellemesi (`src/utils/lidarReliefRenderer.ts`)
- **Sabit Yapıların Kaldırılması:**
  - Mevcut dosyadaki sabit koordinatlı dikdörtgen temel (`0.69, 0.93`), sabit tümülüs (`0.53, 0.14`) ve sabit duvar çizgileri tamamen silinecektir.
- **Gerçek Arazi Verisiyle Renklendirme:**
  - Kullanıcının seçtiği **Hedef Türü** (`GOLD_TREASURE`, `TOMB_CHAMBER`, `ANCIENT_WALLS`, `VOID_TUNNEL`, `GENERAL_EXPLORE`), **Arama Derinliği** (`0.4m - 5.0m`), **Görünüm Modu** (`Map Color Relief`, `Video Termal`, `Hibrit Mod`, `Röntgen Gri`), **Hassasiyet** ve **6'lı Sıralı Filtre** parametreleri doğrudan gerçek DEM/TPI/Eğim matrisine uygulanacaktır.
  - 26-bantlı Surfer Pro izohips kontur çizgileri, arazinin gerçek eşyükselti ve yerel anomali gradyanlarını takip edecektir.

### C. Dinamik Topografik Anomali Tespiti ve Etiketleme (`src/components/MapScannerCanvas.tsx`)
- **Tam Ekran Gerçek Zamanlı LiDAR Katmanı:**
  - LiDAR ısı haritası aktif edildiğinde sadece küçük bir parselde değil, **tüm harita görünümü (viewport)** üzerinde gerçek zamanlı olarak çalışacaktır. Harita kaydırıldığında veya yakınlaştırıldığında (`moveend` / `zoomend`) yeni görünümün gerçek topografik verisi otomatik hesaplanacaktır.
- **Dinamik Anomali Tespiti ve Beyaz Bilgi Etiketleri:**
  - Sabit 3 etiket kaldırılıp, o anki ekranın gerçek topografik analiz matrisinde tespit edilen en güçlü yerel anomaliler (yerel tepe/kubbe, yerel çöküntü/boşluk, doğrusal eğim kırılması/temel hattı) otomatik bulunacaktır.
  - Beyaz bilgi etiketleri (`Tümülüs / Yığma Tepe Anomalisi`, `Doğrusal Eğim Kırılması / Temel Hattı`, `Yerel Çöküntü / Boşluk Adayı` vb.) tespit edilen gerçek koordinatların üzerine, gerçek rakım farkı, eğim açısı ve tahmini derinlik değerleriyle dinamik olarak yerleştirilecektir.

---

## 3. Etkilenecek Dosyalar
1. `src/utils/demTileLoader.ts` *(Yeni)* — Gerçek zamanlı DEM karo yükleyici, bilinear rakım çözücü, eğim (Slope), TPI ve Laplacian mikro-kabartma hesaplayıcı.
2. `src/utils/lidarReliefRenderer.ts` *(Güncelleme)* — Sabit şekillerin kaldırılması, gerçek DEM/TPI matrisinden 26-bant Surfer Pro / Termal / Hibrit / Röntgen render ve gerçek zamanlı dinamik anomali çıkarımı.
3. `src/components/MapScannerCanvas.tsx` *(Güncelleme)* — Tam ekran (full-viewport) gerçek zamanlı LiDAR canvas katmanı ve tespit edilen gerçek topografik noktalara bağlı dinamik bilgi etiketleri.
