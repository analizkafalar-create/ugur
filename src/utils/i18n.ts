/**
 * TerraScan - Multi-Language (i18n) Dictionary & Translation Helper
 * Supports: Turkish (TR), English (EN), German (DE), Arabic (AR), Russian (RU), French (FR), Spanish (ES)
 */

import { AppLanguage, UserRank } from '../types';

export interface TranslationDict {
  appName: string;
  appSub: string;
  geoRadar: string;
  // Navigation & Header
  view2D: string;
  view3D: string;
  satellite: string;
  report: string;
  playStore: string;
  apkGuide: string;
  liveSupport: string;
  server: string;
  credits: string;
  login: string;
  register: string;
  profile: string;
  logout: string;
  saveStudy: string;
  savedStudies: string;
  searchPlaceholder: string;
  scanNow: string;
  clear: string;
  // Google Maps & Navigation
  openGoogleMaps: string;
  directionsToPoint: string;
  searchLocationPlaceholder: string;
  searchProvinceDistrictVillage: string;
  // Voxler 3D & Cameras
  voxler3DMode: string;
  cameraPresetNadir: string;
  cameraPresetIso: string;
  cameraPresetOrbit: string;
  cameraPresetHorizon: string;
  cameraPresetDrill: string;
  cameraAutoOrbit: string;
  cameraLockTarget: string;
  cameraResetView: string;
  sliceDepth: string;
  orthoSliceXy: string;
  orthoSliceXz: string;
  orthoSliceYz: string;
  drillLogs: string;
  // Unlimited Ranks & VIP
  vipLevelText: string;
  vipPointsText: string;
  unlimitedRanks: string;
  unlimitedVip: string;
  // Auth
  authTitle: string;
  authSub: string;
  welcomeBack: string;
  createAccount: string;
  fullName: string;
  email: string;
  password: string;
  loginBtn: string;
  registerBtn: string;
  demoBtn: string;
  initialCreditsNotice: string;
  invalidCreds: string;
  accountCreated: string;
  // Profile & Ranks
  rank: string;
  rankXp: string;
  totalScans: string;
  remainingCredits: string;
  memberSince: string;
  accountStatus: string;
  active: string;
  suspended: string;
  editProfile: string;
  changeLanguage: string;
  // Study Saving
  saveStudyTitle: string;
  saveStudyDesc: string;
  studyName: string;
  studyNotes: string;
  studySavedSuccess: string;
  loadOnMap: string;
  viewReport: string;
  deleteStudy: string;
  noStudiesYet: string;
  // Server Admin
  serverCenter: string;
  serverPinPlaceholder: string;
  serverAuthBtn: string;
  userManagement: string;
  addCredits: string;
  changeRank: string;
  toggleStatus: string;
  deleteUser: string;
  saveChanges: string;
}

export const TRANSLATIONS: Record<AppLanguage, TranslationDict> = {
  tr: {
    appName: 'TERRASCAN',
    appSub: 'Uydu Yeraltı Radarı',
    geoRadar: 'GEO-RADAR',
    view2D: '2B',
    view3D: '3B',
    satellite: '3B Uydu',
    report: 'Rapor',
    playStore: 'Play Store',
    apkGuide: 'APK',
    liveSupport: 'Canlı Destek',
    server: 'SUNUCU',
    credits: 'Tera Jeton',
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    profile: 'Profilim',
    logout: 'Çıkış Yap',
    saveStudy: 'Çalışmayı Kaydet',
    savedStudies: 'Kayıtlı Çalışmalarım',
    searchPlaceholder: 'İl, ilçe, köy adı veya koordinat (örn: Uşak Banaz / 38.47 29.72)',
    scanNow: 'Alanı Tara',
    clear: 'Temizle',
    openGoogleMaps: 'Google Haritalar\'da Aç',
    directionsToPoint: 'Yol Tarifi Al (Navigasyon)',
    searchLocationPlaceholder: 'İl, İlçe, Köy veya Koordinat Ara...',
    searchProvinceDistrictVillage: 'İl / İlçe / Köy veya Koordinat Arayın',
    voxler3DMode: 'Voxler 3B Hacimsel Tarama',
    cameraPresetNadir: 'Kuşbakışı (Nadir 90°)',
    cameraPresetIso: 'Voxler İzometrik',
    cameraPresetOrbit: 'Eğimli Yeraltı Turu (45°)',
    cameraPresetHorizon: 'Zemin Ufuk Açısı',
    cameraPresetDrill: 'Sondaj Kuyu Kamerası',
    cameraAutoOrbit: '360° Otomatik Tur',
    cameraLockTarget: 'Kamerayı Hedefe Oturt',
    cameraResetView: 'Kamerayı Sıfırla',
    sliceDepth: 'Kesit Derinliği',
    orthoSliceXy: 'Yatay Kesit (XY)',
    orthoSliceXz: 'Boyuna Kesit (XZ)',
    orthoSliceYz: 'Enine Kesit (YZ)',
    drillLogs: 'Sondaj Katmanları',
    vipLevelText: 'VIP Seviyesi',
    vipPointsText: 'VIP Puanı',
    unlimitedRanks: 'Sınırsız Rütbe Kademesi',
    unlimitedVip: 'Sınırsız VIP Statüsü',
    authTitle: 'TERRASCAN ÜYELİK GİRİŞİ',
    authSub: 'Jeofizik uydu tarama ve yeraltı anomali analiz platformu',
    welcomeBack: 'Hesabınıza Giriş Yapın',
    createAccount: 'Yeni Üyelik Oluştur (+10 Hediye Jeton)',
    fullName: 'Ad Soyad',
    email: 'E-posta Adresi',
    password: 'Şifre',
    loginBtn: 'Giriş Yap',
    registerBtn: 'Ücretsiz Kayıt Ol',
    demoBtn: 'Hızlı Misafir Girişi',
    initialCreditsNotice: 'Tüm yeni üyelere otomatik 10 Tera Jeton tanımlanır.',
    invalidCreds: 'Hatalı e-posta veya şifre girdiniz.',
    accountCreated: 'Hesabınız başarıyla oluşturuldu! +10 Tera Jeton tanımlandı.',
    rank: 'Rütbe Seviyesi',
    rankXp: 'Rütbe XP İlerlemesi',
    totalScans: 'Toplam Yapılan Tarama',
    remainingCredits: 'Kalan Tera Jeton',
    memberSince: 'Kayıt Tarihi',
    accountStatus: 'Hesap Durumu',
    active: 'Aktif Üye',
    suspended: 'Askıya Alındı',
    editProfile: 'Profili Güncelle',
    changeLanguage: 'Uygulama Dili',
    saveStudyTitle: 'Mevcut Taramayı Kaydet',
    saveStudyDesc: 'Bu sahadaki koordinat, anomali tespiti ve uydu verilerini profilinize kaydedin.',
    studyName: 'Çalışma / Saha Adı',
    studyNotes: 'Saha Notları & Açıklama (İsteğe Bağlı)',
    studySavedSuccess: 'Çalışmanız başarıyla profilinize kaydedildi!',
    loadOnMap: 'Haritada Aç',
    viewReport: 'Raporu İncele',
    deleteStudy: 'Çalışmayı Sil',
    noStudiesYet: 'Henüz kayıtlı bir saha çalışmanız bulunmuyor. Haritadan bir tarama yapıp "Çalışmayı Kaydet" butonuna basabilirsiniz.',
    serverCenter: 'SUNUCU & YÖNETİM MERKEZİ',
    serverPinPlaceholder: 'Yönetici Güvenlik PIN Kodu',
    serverAuthBtn: 'Güvenli Yönetici Doğrulaması',
    userManagement: 'Kayıtlı Üye Yönetimi',
    addCredits: 'Jeton Ekle (VIP Puanı Kazandırır)',
    changeRank: 'Rütbe / Seviye Değiştir',
    toggleStatus: 'Durum Değiştir',
    deleteUser: 'Üyeyi Sil',
    saveChanges: 'Değişiklikleri Kaydet',
  },
  en: {
    appName: 'TERRASCAN',
    appSub: 'Satellite Subsurface Radar',
    geoRadar: 'GEO-RADAR',
    view2D: '2D',
    view3D: '3D',
    satellite: '3D Satellite',
    report: 'Report',
    playStore: 'Play Store',
    apkGuide: 'APK',
    liveSupport: 'Live Support',
    server: 'SERVER',
    credits: 'Tera Tokens',
    login: 'Sign In',
    register: 'Sign Up',
    profile: 'My Profile',
    logout: 'Log Out',
    saveStudy: 'Save Study',
    savedStudies: 'My Saved Studies',
    searchPlaceholder: 'Search province, district, village or coords (e.g. Usak Banaz / 38.47 29.72)',
    scanNow: 'Scan Area',
    clear: 'Clear',
    openGoogleMaps: 'Open in Google Maps',
    directionsToPoint: 'Get Directions (Navigation)',
    searchLocationPlaceholder: 'Search City, District, Village or Coords...',
    searchProvinceDistrictVillage: 'Search City / Town / Village or GPS Coords',
    voxler3DMode: 'Voxler 3D Volumetric Scan',
    cameraPresetNadir: 'Top-Down (Nadir 90°)',
    cameraPresetIso: 'Voxler Isometric',
    cameraPresetOrbit: 'Orbit Angle (45°)',
    cameraPresetHorizon: 'Ground Horizon Level',
    cameraPresetDrill: 'Borehole Drill-Cam',
    cameraAutoOrbit: '360° Auto Orbit',
    cameraLockTarget: 'Lock Camera on Target',
    cameraResetView: 'Reset Camera',
    sliceDepth: 'Slice Depth',
    orthoSliceXy: 'Horizontal Slice (XY)',
    orthoSliceXz: 'Longitudinal Slice (XZ)',
    orthoSliceYz: 'Transverse Slice (YZ)',
    drillLogs: 'Borehole Strata Logs',
    vipLevelText: 'VIP Level',
    vipPointsText: 'VIP Points',
    unlimitedRanks: 'Unlimited Rank Progression',
    unlimitedVip: 'Unlimited VIP Status',
    authTitle: 'TERRASCAN PORTAL ACCESS',
    authSub: 'Geophysical satellite imaging & subsurface anomaly analytics',
    welcomeBack: 'Sign In to Your Account',
    createAccount: 'Create New Account (+10 Welcome Tokens)',
    fullName: 'Full Name',
    email: 'Email Address',
    password: 'Password',
    loginBtn: 'Sign In',
    registerBtn: 'Free Registration',
    demoBtn: 'Quick Guest Access',
    initialCreditsNotice: 'All new members receive 10 complimentary Tera Tokens.',
    invalidCreds: 'Invalid email or password.',
    accountCreated: 'Account created successfully! +10 Tera Tokens added.',
    rank: 'Rank Level',
    rankXp: 'Rank XP Progress',
    totalScans: 'Total Scans Performed',
    remainingCredits: 'Remaining Tera Tokens',
    memberSince: 'Member Since',
    accountStatus: 'Account Status',
    active: 'Active Member',
    suspended: 'Suspended',
    editProfile: 'Edit Profile',
    changeLanguage: 'App Language',
    saveStudyTitle: 'Save Current Survey',
    saveStudyDesc: 'Save coordinates, anomaly hotspots, and satellite data to your profile.',
    studyName: 'Study / Location Title',
    studyNotes: 'Field Notes & Observations (Optional)',
    studySavedSuccess: 'Survey successfully saved to your profile!',
    loadOnMap: 'Load on Map',
    viewReport: 'View Report',
    deleteStudy: 'Delete Study',
    noStudiesYet: 'No saved studies yet. Perform a scan and click "Save Study".',
    serverCenter: 'SERVER & ADMIN HUB',
    serverPinPlaceholder: 'Admin Security PIN Code',
    serverAuthBtn: 'Authenticate Admin Access',
    userManagement: 'Registered Member Management',
    addCredits: 'Grant Tokens (Increases VIP Points)',
    changeRank: 'Change Rank & Level',
    toggleStatus: 'Toggle Status',
    deleteUser: 'Delete Member',
    saveChanges: 'Save Changes',
  },
  de: {
    appName: 'TERRASCAN',
    appSub: 'Satelliten-Untergrundradar',
    geoRadar: 'GEO-RADAR',
    view2D: '2D',
    view3D: '3D',
    satellite: '3D-Satellit',
    report: 'Bericht',
    playStore: 'Play Store',
    apkGuide: 'APK',
    liveSupport: 'Live-Support',
    server: 'SERVER',
    credits: 'Tera-Token',
    login: 'Anmelden',
    register: 'Registrieren',
    profile: 'Mein Profil',
    logout: 'Abmelden',
    saveStudy: 'Studie speichern',
    savedStudies: 'Gespeicherte Studien',
    searchPlaceholder: 'Stadt, Bezirk, Dorf oder Koordinaten suchen...',
    scanNow: 'Bereich scannen',
    clear: 'Löschen',
    openGoogleMaps: 'In Google Maps öffnen',
    directionsToPoint: 'Route berechnen (Navigation)',
    searchLocationPlaceholder: 'Ort, Bezirk, Dorf oder Koordinaten...',
    searchProvinceDistrictVillage: 'Stadt / Bezirk / Dorf oder GPS-Koordinaten',
    voxler3DMode: 'Voxler 3D Volumetrischer Scan',
    cameraPresetNadir: 'Draufsicht (Nadir 90°)',
    cameraPresetIso: 'Voxler Isometrisch',
    cameraPresetOrbit: 'Umlaufwinkel (45°)',
    cameraPresetHorizon: 'Bodenhorizont',
    cameraPresetDrill: 'Bohrloch-Kamera',
    cameraAutoOrbit: '360° Automatische Drehung',
    cameraLockTarget: 'Kamera auf Ziel fixieren',
    cameraResetView: 'Kamera zurücksetzen',
    sliceDepth: 'Schnitttiefe',
    orthoSliceXy: 'Horizontalschnitt (XY)',
    orthoSliceXz: 'Längsschnitt (XZ)',
    orthoSliceYz: 'Querschnitt (YZ)',
    drillLogs: 'Bohrloch-Schichten',
    vipLevelText: 'VIP-Stufe',
    vipPointsText: 'VIP-Punkte',
    unlimitedRanks: 'Unbegrenzte Rangstufen',
    unlimitedVip: 'Unbegrenzter VIP-Status',
    authTitle: 'TERRASCAN ZUGANG',
    authSub: 'Geophysikalische Satelliten- und Untergrundanalyse',
    welcomeBack: 'In Ihr Konto einloggen',
    createAccount: 'Konto erstellen (+10 Willkommens-Token)',
    fullName: 'Vollständiger Name',
    email: 'E-Mail-Adresse',
    password: 'Passwort',
    loginBtn: 'Anmelden',
    registerBtn: 'Kostenlos Registrieren',
    demoBtn: 'Gastzugang',
    initialCreditsNotice: 'Neue Mitglieder erhalten 10 Tera-Token.',
    invalidCreds: 'Ungültige E-Mail oder Passwort.',
    accountCreated: 'Konto erfolgreich erstellt! +10 Token gutgeschrieben.',
    rank: 'Rangstufe',
    rankXp: 'Rangfortschritt XP',
    totalScans: 'Durchgeführte Scans',
    remainingCredits: 'Verbleibende Token',
    memberSince: 'Mitglied seit',
    accountStatus: 'Kontostatus',
    active: 'Aktiv',
    suspended: 'Gesperrt',
    editProfile: 'Profil bearbeiten',
    changeLanguage: 'Sprache',
    saveStudyTitle: 'Aktuelle Studie speichern',
    saveStudyDesc: 'Speichern Sie Koordinaten und Anomalien in Ihrem Profil.',
    studyName: 'Name der Studie',
    studyNotes: 'Feldnotizen (optional)',
    studySavedSuccess: 'Studie erfolgreich gespeichert!',
    loadOnMap: 'Auf Karte laden',
    viewReport: 'Bericht öffnen',
    deleteStudy: 'Löschen',
    noStudiesYet: 'Noch keine Studien gespeichert.',
    serverCenter: 'SERVER- & ADMIN-VERWALTUNG',
    serverPinPlaceholder: 'Admin-Sicherheits-PIN',
    serverAuthBtn: 'Admin autorisieren',
    userManagement: 'Mitgliederverwaltung',
    addCredits: 'Token hinzufügen (VIP-Punkte erhöhen)',
    changeRank: 'Rang & Stufe ändern',
    toggleStatus: 'Status umschalten',
    deleteUser: 'Benutzer löschen',
    saveChanges: 'Änderungen speichern',
  },
  ar: {
    appName: 'TERRASCAN',
    appSub: 'رادار الأقمار الصناعية تحت الأرض',
    geoRadar: 'GEO-RADAR',
    view2D: '2D',
    view3D: '3D',
    satellite: 'أقمار 3D',
    report: 'تقرير',
    playStore: 'Play Store',
    apkGuide: 'APK',
    liveSupport: 'دعم مباشر',
    server: 'الخادم',
    credits: 'رموز تيرا',
    login: 'تسجيل الدخول',
    register: 'تسجيل جديد',
    profile: 'الملف الشخصي',
    logout: 'خروج',
    saveStudy: 'حفظ الدراسة',
    savedStudies: 'الدراسات المحفوظة',
    searchPlaceholder: 'ابحث عن مدينة أو قرية أو إحداثيات...',
    scanNow: 'مسح المنطقة',
    clear: 'مسح',
    openGoogleMaps: 'فتح في خرائط Google',
    directionsToPoint: 'الاتجاهات المباشرة (ملاحة)',
    searchLocationPlaceholder: 'ابحث عن مدينة، بلدة، قرية أو إحداثيات...',
    searchProvinceDistrictVillage: 'ابحث بالمدينة / البلدة / القرية أو GPS',
    voxler3DMode: 'مسح Voxler ثلاثي الأبعاد الحجمي',
    cameraPresetNadir: 'منظر علوي (Nadir 90°)',
    cameraPresetIso: 'منظور متساوي القياس Voxler',
    cameraPresetOrbit: 'مدار 45 درجة',
    cameraPresetHorizon: 'أفق الأرض',
    cameraPresetDrill: 'كاميرا الحفر الباطنية',
    cameraAutoOrbit: 'دوران تلقائي 360°',
    cameraLockTarget: 'تثبيت الكاميرا على الهدف',
    cameraResetView: 'إعادة ضبط الكاميرا',
    sliceDepth: 'عمق المقطع',
    orthoSliceXy: 'مقطع أفقي (XY)',
    orthoSliceXz: 'مقطع طولي (XZ)',
    orthoSliceYz: 'مقطع عرضي (YZ)',
    drillLogs: 'سجلات طبقات الحفر',
    vipLevelText: 'مستوى VIP',
    vipPointsText: 'نقاط VIP',
    unlimitedRanks: 'رتب ومستويات غير محدودة',
    unlimitedVip: 'عضوية VIP غير محدودة',
    authTitle: 'تسجيل الدخول إلى TERRASCAN',
    authSub: 'منصة مسح الأقمار الصناعية الجيوفيزيائية وتحليل الشذوذ',
    welcomeBack: 'تسجيل الدخول إلى حسابك',
    createAccount: 'إنشاء حساب جديد (+10 رموز هدية)',
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    loginBtn: 'دخول',
    registerBtn: 'تسجيل مجاني',
    demoBtn: 'دخول ضيف سريع',
    initialCreditsNotice: 'يحصل جميع الأعضاء الجدد على 10 رموز تيرا مجانية.',
    invalidCreds: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    accountCreated: 'تم إنشاء الحساب بنجاح! تم منح 10 رموز تيرا.',
    rank: 'الرتبة والمستوى',
    rankXp: 'تقدم نقاط الخبرة XP',
    totalScans: 'إجمالي عمليات المسح',
    remainingCredits: 'الرموز المتبقية',
    memberSince: 'تاريخ الانضمام',
    accountStatus: 'حالة الحساب',
    active: 'نشط',
    suspended: 'معلق',
    editProfile: 'تعديل الملف',
    changeLanguage: 'لغة التطبيق',
    saveStudyTitle: 'حفظ المسح الحالي',
    saveStudyDesc: 'احفظ الإحداثيات والشذوذ المكتشف في ملفك الشخصي.',
    studyName: 'اسم الدراسة / الموقع',
    studyNotes: 'ملاحظات ميدانية (اختياري)',
    studySavedSuccess: 'تم حفظ الدراسة بنجاح!',
    loadOnMap: 'فتح في الخريطة',
    viewReport: 'عرض التقرير',
    deleteStudy: 'حذف الدراسة',
    noStudiesYet: 'لا توجد دراسات محفوظة حتى الآن.',
    serverCenter: 'مركز إدارة الخادم',
    serverPinPlaceholder: 'رمز PIN الأمني للمسؤول',
    serverAuthBtn: 'توثيق المسؤول',
    userManagement: 'إدارة الأعضاء',
    addCredits: 'إضافة رموز (تزيد نقاط VIP)',
    changeRank: 'تغيير الرتبة والمستوى',
    toggleStatus: 'تغيير الحالة',
    deleteUser: 'حذف العضو',
    saveChanges: 'حفظ التغييرات',
  },
  ru: {
    appName: 'TERRASCAN',
    appSub: 'Спутниковый радар подповерхностного зондирования',
    geoRadar: 'GEO-RADAR',
    view2D: '2D',
    view3D: '3D',
    satellite: '3D Спутник',
    report: 'Отчет',
    playStore: 'Play Store',
    apkGuide: 'APK',
    liveSupport: 'Поддержка',
    server: 'СЕРВЕР',
    credits: 'Тера-Жетоны',
    login: 'Вход',
    register: 'Регистрация',
    profile: 'Профиль',
    logout: 'Выйти',
    saveStudy: 'Сохранить исследование',
    savedStudies: 'Мои сохраненные объекты',
    searchPlaceholder: 'Город, район, село или координаты (напр. 38.47 29.72)',
    scanNow: 'Сканировать',
    clear: 'Очистить',
    openGoogleMaps: 'Открыть в Google Картах',
    directionsToPoint: 'Построить маршрут (Навигация)',
    searchLocationPlaceholder: 'Поиск города, района, села или координат...',
    searchProvinceDistrictVillage: 'Поиск населенного пункта или GPS',
    voxler3DMode: 'Объемное сканирование Voxler 3D',
    cameraPresetNadir: 'Вид сверху (Надир 90°)',
    cameraPresetIso: 'Изометрия Voxler',
    cameraPresetOrbit: 'Наклонная орбита (45°)',
    cameraPresetHorizon: 'Уровень горизонта',
    cameraPresetDrill: 'Камера скважины',
    cameraAutoOrbit: 'Автоповорот 360°',
    cameraLockTarget: 'Навести камеру на аномалию',
    cameraResetView: 'Сбросить камеру',
    sliceDepth: 'Глубина среза',
    orthoSliceXy: 'Горизонтальный срез (XY)',
    orthoSliceXz: 'Продольный срез (XZ)',
    orthoSliceYz: 'Поперечный срез (YZ)',
    drillLogs: 'Стратиграфия скважин',
    vipLevelText: 'Уровень VIP',
    vipPointsText: 'Очки VIP',
    unlimitedRanks: 'Неограниченные ранги и уровни',
    unlimitedVip: 'Неограниченный статус VIP',
    authTitle: 'ВХОД В TERRASCAN',
    authSub: 'Геофизический спутниковый анализ подповерхностных аномалий',
    welcomeBack: 'Вход в личный кабинет',
    createAccount: 'Регистрация (+10 приветственных жетонов)',
    fullName: 'Имя и Фамилия',
    email: 'Электронная почта',
    password: 'Пароль',
    loginBtn: 'Войти',
    registerBtn: 'Зарегистрироваться',
    demoBtn: 'Быстрый гостевой вход',
    initialCreditsNotice: 'Каждому новому участнику начисляется 10 жетонов.',
    invalidCreds: 'Неверный логин или пароль.',
    accountCreated: 'Аккаунт успешно создан! Начислено 10 Тера-Жетонов.',
    rank: 'Ранг и Уровень',
    rankXp: 'Опыт ранга (XP)',
    totalScans: 'Всего сканирований',
    remainingCredits: 'Остаток жетонов',
    memberSince: 'Дата регистрации',
    accountStatus: 'Статус аккаунта',
    active: 'Активен',
    suspended: 'Приостановлен',
    editProfile: 'Редактировать профиль',
    changeLanguage: 'Язык интерфейса',
    saveStudyTitle: 'Сохранить текущее сканирование',
    saveStudyDesc: 'Сохраните координаты, аномалии и данные спутника в свой профиль.',
    studyName: 'Название участка / работы',
    studyNotes: 'Полевые заметки (необязательно)',
    studySavedSuccess: 'Исследование успешно сохранено в профиле!',
    loadOnMap: 'Открыть на карте',
    viewReport: 'Открыть отчет',
    deleteStudy: 'Удалить запись',
    noStudiesYet: 'Пока нет сохраненных исследований. Выполните сканирование и нажмите «Сохранить исследование».',
    serverCenter: 'СЕРВЕРНАЯ ПАНЕЛЬ УПРАВЛЕНИЯ',
    serverPinPlaceholder: 'Секретный PIN-код администратора',
    serverAuthBtn: 'Вход администратора',
    userManagement: 'Управление пользователями',
    addCredits: 'Добавить жетоны (повышает VIP)',
    changeRank: 'Сменить ранг и уровень',
    toggleStatus: 'Изменить статус',
    deleteUser: 'Удалить пользователя',
    saveChanges: 'Сохранить изменения',
  },
  fr: {
    appName: 'TERRASCAN',
    appSub: 'Radar Satellitaire Sous-Sol',
    geoRadar: 'GEO-RADAR',
    view2D: '2D',
    view3D: '3D',
    satellite: '3D Satellite',
    report: 'Rapport',
    playStore: 'Play Store',
    apkGuide: 'APK',
    liveSupport: 'Support Direct',
    server: 'SERVEUR',
    credits: 'Jetons Tera',
    login: 'Connexion',
    register: 'Inscription',
    profile: 'Mon Profil',
    logout: 'Déconnexion',
    saveStudy: 'Enregistrer Étude',
    savedStudies: 'Études Enregistrées',
    searchPlaceholder: 'Ville, village ou coordonnées GPS...',
    scanNow: 'Scanner Zone',
    clear: 'Effacer',
    openGoogleMaps: 'Ouvrir dans Google Maps',
    directionsToPoint: 'Itinéraire GPS (Navigation)',
    searchLocationPlaceholder: 'Rechercher ville, village ou coordonnées...',
    searchProvinceDistrictVillage: 'Ville / Village / Coordonnées GPS',
    voxler3DMode: 'Scan Volumétrique 3D Voxler',
    cameraPresetNadir: 'Vue du Dessus (Nadir 90°)',
    cameraPresetIso: 'Isométrique Voxler',
    cameraPresetOrbit: 'Orbite Inclinée (45°)',
    cameraPresetHorizon: 'Niveau de l\'Horizon',
    cameraPresetDrill: 'Caméra de Forage',
    cameraAutoOrbit: 'Rotation Auto 360°',
    cameraLockTarget: 'Verrouiller sur la Cible',
    cameraResetView: 'Réinitialiser Caméra',
    sliceDepth: 'Profondeur de Coupe',
    orthoSliceXy: 'Coupe Horizontale (XY)',
    orthoSliceXz: 'Coupe Longitudinale (XZ)',
    orthoSliceYz: 'Coupe Transversale (YZ)',
    drillLogs: 'Carottages Géologiques',
    vipLevelText: 'Niveau VIP',
    vipPointsText: 'Points VIP',
    unlimitedRanks: 'Niveaux et Rangs Illimités',
    unlimitedVip: 'Statut VIP Illimité',
    authTitle: 'ACCÈS TERRASCAN',
    authSub: 'Imagerie géophysique satellitaire et détection sous-sol',
    welcomeBack: 'Connexion à votre compte',
    createAccount: 'Créer un Compte (+10 Jetons Offerts)',
    fullName: 'Nom Complet',
    email: 'Adresse E-mail',
    password: 'Mot de passe',
    loginBtn: 'Se Connecter',
    registerBtn: 'Inscription Gratuite',
    demoBtn: 'Accès Invité',
    initialCreditsNotice: 'Tous les nouveaux membres reçoivent 10 Jetons Tera.',
    invalidCreds: 'E-mail ou mot de passe incorrect.',
    accountCreated: 'Compte créé avec succès ! +10 Jetons offerts.',
    rank: 'Rang & Niveau',
    rankXp: 'Progression XP',
    totalScans: 'Scans Réalisés',
    remainingCredits: 'Jetons Restants',
    memberSince: 'Membre Depuis',
    accountStatus: 'Statut du Compte',
    active: 'Actif',
    suspended: 'Suspendu',
    editProfile: 'Modifier Profil',
    changeLanguage: 'Langue de l\'Application',
    saveStudyTitle: 'Enregistrer le Scan Actuel',
    saveStudyDesc: 'Sauvegardez les coordonnées et anomalies dans votre profil.',
    studyName: 'Titre du Site / Étude',
    studyNotes: 'Notes de Terrain (Optionnel)',
    studySavedSuccess: 'Étude sauvegardée avec succès !',
    loadOnMap: 'Charger sur la Carte',
    viewReport: 'Voir le Rapport',
    deleteStudy: 'Supprimer',
    noStudiesYet: 'Aucune étude sauvegardée pour le moment.',
    serverCenter: 'CENTRE D\'ADMINISTRATION DU SERVEUR',
    serverPinPlaceholder: 'Code PIN Administrateur',
    serverAuthBtn: 'Authentification Admin',
    userManagement: 'Gestion des Membres',
    addCredits: 'Ajouter des Jetons (Augmente les Points VIP)',
    changeRank: 'Changer Rang & Niveau',
    toggleStatus: 'Modifier Statut',
    deleteUser: 'Supprimer Membre',
    saveChanges: 'Enregistrer',
  },
  es: {
    appName: 'TERRASCAN',
    appSub: 'Radar Satelital Subterráneo',
    geoRadar: 'GEO-RADAR',
    view2D: '2D',
    view3D: '3D',
    satellite: 'Satélite 3D',
    report: 'Informe',
    playStore: 'Play Store',
    apkGuide: 'APK',
    liveSupport: 'Soporte en Vivo',
    server: 'SERVIDOR',
    credits: 'Fichas Tera',
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    profile: 'Mi Perfil',
    logout: 'Cerrar Sesión',
    saveStudy: 'Guardar Estudio',
    savedStudies: 'Estudios Guardados',
    searchPlaceholder: 'Ciudad, pueblo, aldea o coordenadas...',
    scanNow: 'Escanear Área',
    clear: 'Limpiar',
    openGoogleMaps: 'Abrir en Google Maps',
    directionsToPoint: 'Obtener Ruta (Navegación)',
    searchLocationPlaceholder: 'Buscar ciudad, aldea o coordenadas GPS...',
    searchProvinceDistrictVillage: 'Ciudad / Pueblo / Coordenadas GPS',
    voxler3DMode: 'Escaneo Volumétrico 3D Voxler',
    cameraPresetNadir: 'Vista Superior (Nadir 90°)',
    cameraPresetIso: 'Isométrico Voxler',
    cameraPresetOrbit: 'Órbita Inclinada (45°)',
    cameraPresetHorizon: 'Nivel del Horizonte',
    cameraPresetDrill: 'Cámara de Perforación',
    cameraAutoOrbit: 'Giro Automático 360°',
    cameraLockTarget: 'Bloquear Cámara en el Objetivo',
    cameraResetView: 'Restablecer Cámara',
    sliceDepth: 'Profundidad de Corte',
    orthoSliceXy: 'Corte Horizontal (XY)',
    orthoSliceXz: 'Corte Longitudinal (XZ)',
    orthoSliceYz: 'Corte Transversal (YZ)',
    drillLogs: 'Registros de Sondajes',
    vipLevelText: 'Nivel VIP',
    vipPointsText: 'Puntos VIP',
    unlimitedRanks: 'Rangos y Niveles Ilimitados',
    unlimitedVip: 'Estatus VIP Ilimitado',
    authTitle: 'ACCESO TERRASCAN',
    authSub: 'Plataforma geofísica satelital de detección subterránea',
    welcomeBack: 'Inicia sesión en tu cuenta',
    createAccount: 'Crear Nueva Cuenta (+10 Fichas de Regalo)',
    fullName: 'Nombre Completo',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    loginBtn: 'Iniciar Sesión',
    registerBtn: 'Registro Gratuito',
    demoBtn: 'Acceso Rápido Invitado',
    initialCreditsNotice: 'Todos los nuevos miembros reciben 10 Fichas Tera.',
    invalidCreds: 'Correo o contraseña no válidos.',
    accountCreated: '¡Cuenta creada con éxito! +10 Fichas añadidas.',
    rank: 'Rango y Nivel',
    rankXp: 'Progreso de XP',
    totalScans: 'Escaneos Totales',
    remainingCredits: 'Fichas Restantes',
    memberSince: 'Miembro Desde',
    accountStatus: 'Estado de Cuenta',
    active: 'Activo',
    suspended: 'Suspendido',
    editProfile: 'Editar Perfil',
    changeLanguage: 'Idioma de la App',
    saveStudyTitle: 'Guardar Escaneo Actual',
    saveStudyDesc: 'Guarda coordenadas y anomalías detectadas en tu perfil.',
    studyName: 'Nombre del Estudio / Sitio',
    studyNotes: 'Notas de Campo (Opcional)',
    studySavedSuccess: '¡Estudio guardado con éxito!',
    loadOnMap: 'Cargar en el Mapa',
    viewReport: 'Ver Informe',
    deleteStudy: 'Eliminar Estudio',
    noStudiesYet: 'No hay estudios guardados aún.',
    serverCenter: 'CENTRO DE ADMINISTRACIÓN DEL SERVIDOR',
    serverPinPlaceholder: 'Código PIN de Seguridad',
    serverAuthBtn: 'Autenticar Administrador',
    userManagement: 'Gestión de Miembros',
    addCredits: 'Añadir Fichas (Suma Puntos VIP)',
    changeRank: 'Cambiar Rango y Nivel',
    toggleStatus: 'Cambiar Estado',
    deleteUser: 'Eliminar Miembro',
    saveChanges: 'Guardar Cambios',
  },
};

export const LANGUAGES: { code: AppLanguage; label: string; flag: string }[] = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export const RANK_INFO: Record<UserRank, { badge: string; titleTr: string; titleEn: string; minScans: number }> = {
  OBSERVER: { badge: '🥉', titleTr: 'Jeofizik Gözlemci', titleEn: 'Geophysical Observer', minScans: 0 },
  OPERATOR: { badge: '🥈', titleTr: 'Kıdemli Saha Operatörü', titleEn: 'Senior Field Operator', minScans: 5 },
  ANALYST: { badge: '🥇', titleTr: 'Uzman Jeoradar Analisti', titleEn: 'Expert GPR Analyst', minScans: 20 },
  CHIEF_ENGINEER: { badge: '💎', titleTr: 'VIP Baş Mühendis', titleEn: 'VIP Chief Geophysicist', minScans: 50 },
  ADMIN: { badge: '👑', titleTr: 'Sistem Yöneticisi', titleEn: 'System Administrator', minScans: 100 },
};

/**
 * Calculates infinite, unlimited rank titles, levels, and badges!
 */
export function getRankBadgeAndTitle(rank: UserRank, lang: AppLanguage = 'tr', level: number = 1) {
  const base = RANK_INFO[rank] || RANK_INFO.OBSERVER;
  
  // Unlimited prestige titles
  let badge = base.badge;
  let titleTr = `${base.titleTr} (Seviye ${level})`;
  let titleEn = `${base.titleEn} (Level ${level})`;

  if (level >= 100) {
    badge = '🌌';
    titleTr = `Kozmik Jeofizik Üstadı (Seviye ${level})`;
    titleEn = `Cosmic Geophysical Master (Level ${level})`;
  } else if (level >= 60) {
    badge = '👑';
    titleTr = `Jeoradar Genel Direktörü (Seviye ${level})`;
    titleEn = `Georadar Director General (Level ${level})`;
  } else if (level >= 30) {
    badge = '💎';
    titleTr = `Baş Jeofizik Mühendisi (Seviye ${level})`;
    titleEn = `Chief Geophysical Engineer (Level ${level})`;
  } else if (level >= 15) {
    badge = '🥇';
    titleTr = `Uzman Jeoradar Analisti (Seviye ${level})`;
    titleEn = `Expert Radar Analyst (Level ${level})`;
  } else if (level >= 5) {
    badge = '🥈';
    titleTr = `Kıdemli Saha Operatörü (Seviye ${level})`;
    titleEn = `Senior Field Operator (Level ${level})`;
  }

  return {
    badge,
    title: lang === 'tr' ? titleTr : titleEn,
  };
}
