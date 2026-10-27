/**
 * TerraScan AI - Sıkça Sorulan Sorular (SSS / FAQ) & Teknik Kılavuz Veritabanı
 * Yasal Mevzuat (2863 S.K.), Jeofizik Standartlar ve Sistem Rehberi
 */

export interface FAQItem {
  id: string;
  category: 'LICENSE' | 'LEGAL' | 'SAR_RADAR' | 'VOXLER' | 'CREDITS_VIP' | 'SECURITY';
  categoryLabel: string;
  question: string;
  answer: string;
  badge?: string;
}

export const FAQ_CATEGORIES = [
  { key: 'ALL', label: 'Tüm Sorular', icon: 'Sparkles' },
  { key: 'LICENSE', label: 'Lisans & Aktivasyon', icon: 'Key' },
  { key: 'SAR_RADAR', label: 'SAR Uydu & Radargram', icon: 'Radio' },
  { key: 'VOXLER', label: 'Voxler 3B & CSV Cihaz', icon: 'Box' },
  { key: 'LEGAL', label: 'Yasal Mevzuat (2863 S.K.)', icon: 'Scale' },
  { key: 'CREDITS_VIP', label: 'Jeton & VIP Seviyesi', icon: 'Coins' },
  { key: 'SECURITY', label: 'Veri & Cihaz Güvenliği', icon: 'ShieldCheck' },
] as const;

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'lic-1',
    category: 'LICENSE',
    categoryLabel: 'Lisans & Aktivasyon',
    question: 'Lisans anahtarımı nasıl aktif edebilirim?',
    answer: 'Edindiğiniz TERA-XXXX-XXXX-XXXX-TR biçimindeki lisans anahtarınızı profilinizdeki "Lisans / Key Doğrulama" veya Giriş ekranındaki "Promosyon / Lisans Kodu" bölümüne girerek anında aktifleştirebilirsiniz. Geçerli kod doğrulandığında sınırsız kullanım süresi ve VIP puanları profilinize anında yansır.',
    badge: 'Önemli'
  },
  {
    id: 'lic-2',
    category: 'LICENSE',
    categoryLabel: 'Lisans & Aktivasyon',
    question: 'Lisans anahtarı formatı nasıl olmalıdır?',
    answer: 'Sistem lisans anahtarları uluslararası kriptografik standartta "TERA-XXXX-XXXX-XXXX-TR" (Örn: TERA-9842-8841-5520-TR) biçimindedir. Harf ve rakamlar büyük harfle, aralarında tire (-) olacak şekilde girilmelidir.',
  },
  {
    id: 'lic-3',
    category: 'LICENSE',
    categoryLabel: 'Lisans & Aktivasyon',
    question: 'Lisans sürem bittiğinde kayıtlı sahalarım silinir mi?',
    answer: 'Hayır. Lisans süreniz sona erse dahi profilinize kaydettiğiniz tüm saha koordinatları, spektral analiz kayıtları ve çalışma geçmişiniz güvenli sunucumuzda şifrelenmiş olarak korunmaya devam eder.',
  },
  {
    id: 'sar-1',
    category: 'SAR_RADAR',
    categoryLabel: 'SAR Uydu & Radargram',
    question: 'Sentinel-1 SAR interferometri zemin analizi nasıl çalışır?',
    answer: 'TerraScan AI, ESA Sentinel-1 ve NASA ALOS PALSAR C-band / L-band radar uydularının mikrodalga saçılma (backscatter) ve faz farkı (InSAR) verilerini kullanır. Zemin nemi, dielektrik katsayısı, boşluk ve zemin altı yoğunluk değişimlerini yapay zeka spektral katmanları ile haritalandırır.',
    badge: 'Jeofizik'
  },
  {
    id: 'sar-2',
    category: 'SAR_RADAR',
    categoryLabel: 'SAR Uydu & Radargram',
    question: 'Sistem maksimum kaç metre derinliğe kadar sinyal analizi yapar?',
    answer: 'Derinlik kapasitesi zemin yapısına, nem oranına ve kayaç direncine (rezistivite) bağlı olarak değişir. Kuru kireçtaşı ve kumlu arazilerde L-Band radargram sinyalleri 15-25 metre derinliğe kadar zemin katmanlaşmasını tespit edebilirken, ıslak killi zeminlerde penetrasyon 3-8 metre bandında seyreder.',
  },
  {
    id: 'vox-1',
    category: 'VOXLER',
    categoryLabel: 'Voxler 3B & CSV Cihaz',
    question: 'Hangi yeraltı görüntüleme cihazlarının CSV/CVS verileri desteklenir?',
    answer: 'Voxler 3B Cihaz Çekimi modülü OKM Rover / Fusion, Conrad GR-3, Lorenz Deepmax Z1, Tero Vido, Geonics EM, GPR (MALA, Sensors & Software) ve tüm standart 3 sütunlu (X, Y, Değer) veya 4 sütunlu (X, Y, Z, Voltaj) CSV, CVS, DAT ve TXT dosyalarını destekler.',
    badge: 'PRO'
  },
  {
    id: 'vox-2',
    category: 'VOXLER',
    categoryLabel: 'Voxler 3B & CSV Cihaz',
    question: 'Voxler kesitlerinde metal ve boşluk anomalileri nasıl ayırt edilir?',
    answer: 'Jeofizik renk haritasında (Turbo/Resistivity); pozitif yüksek genlikli kırmızı/magenta alanlar yüksek iletkenlikli metalik veya mineralize yapıları, negatif düşük mavi/mor alanlar ise oda, tünel, mahzen gibi dielektrik boşluk ve zayıf zemin zonlarını temsil eder.',
  },
  {
    id: 'leg-1',
    category: 'LEGAL',
    categoryLabel: 'Yasal Mevzuat (2863 S.K.)',
    question: '2863 Sayılı Kültür ve Tabiat Varlıklarını Koruma Kanunu nedir?',
    answer: 'Türkiye Cumhuriyeti 2863 Sayılı Kanunu uyarınca izinsiz define aramak, kaçak kazı yapmak ve kültür varlıklarına müdahale etmek kesinlikle yasaktır ve ağır cezai yaptırımlara tabidir. TerraScan AI, yalnızca bilimsel, akademik ve jeofizik zemin modelleme amaçlıdır.',
    badge: 'Yasal Sorumluluk'
  },
  {
    id: 'leg-2',
    category: 'LEGAL',
    categoryLabel: 'Yasal Mevzuat (2863 S.K.)',
    question: 'Saha çalışmalarında resmi izin nasıl alınır?',
    answer: 'Tüm yüzey araştırması ve zemin etüdü faaliyetlerinde ilgili mülki amirlikler, Kültür Varlıkları ve Müzeler Genel Müdürlüğü ile Maden ve Petrol İşleri Genel Müdürlüğü (MAPEG) mevzuatlarına tam uyum sağlanmalıdır.',
  },
  {
    id: 'cred-1',
    category: 'CREDITS_VIP',
    categoryLabel: 'Jeton & VIP Seviyesi',
    question: 'Yeni üye olduğumda verilen Tera Jeton nasıl kullanılır?',
    answer: 'İlk defa kayıt olan her yeni kullanıcıya tek sefere mahsus 10 Tera Jeton hoş geldin hediyesi tanımlanır. Her bir radar çekimi 1 jeton tüketir. Ayrıca arkadaş davet kodu ile davet ettiğiniz her kişi için +15 jeton kazanırsınız.',
  },
  {
    id: 'cred-2',
    category: 'CREDITS_VIP',
    categoryLabel: 'Jeton & VIP Seviyesi',
    question: 'VIP Seviyeleri ve Rütbeler nasıl yükselir?',
    answer: 'Yaptığınız her başarılı saha taraması size XP kazandırarak rütbenizi (Çırak, Jeofizikçi, Saha Uzmanı, Baş Jeofizikçi vb.) yükseltir. Yüklenen her lisans paketi ise VIP puanı ekleyerek VIP 1-10 seviyesine yükseltir ve öncelikli uydu işlem kanalı sağlar.',
  },
  {
    id: 'sec-1',
    category: 'SECURITY',
    categoryLabel: 'Veri & Cihaz Güvenliği',
    question: 'Taradığım saha koordinatları ve cihaz çekimlerim gizli tutuluyor mu?',
    answer: 'Evet. Tüm koordinat girişleri, kaydedilen sahalar ve yüklenen CSV cihaz verileri uçtan uca AES-256 ve SSL şifreleme ile izole sunucularda saklanır. Üçüncü şahıslarla asla paylaşılmaz.',
    badge: 'Güvenlik'
  },
];
