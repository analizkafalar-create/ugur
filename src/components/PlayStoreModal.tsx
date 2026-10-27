/**
 * TerraScan - Google Play Store & Android APK / AAB Yayınlama Rehberi Modalı
 */

import React, { useState } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  Terminal, 
  Smartphone, 
  Globe, 
  ShieldCheck, 
  Copy, 
  Check, 
  Layers, 
  Play, 
  HelpCircle,
  FileCode,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

interface PlayStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayStoreModal: React.FC<PlayStoreModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'EASY_APK' | 'PWABUILDER' | 'CONSOLE_STEPS' | 'BUBBLEWRAP' | 'PWA_DIRECT'>('EASY_APK');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-...run.app';

  const handleCopy = (text: string, label: string) => {
    sound.playScanBeep();
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn font-sans">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  GOOGLE PLAY STORE & ANDROID APK REHBERİ
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  APK & .AAB Hazır
                </span>
              </div>
              <p className="text-xs text-slate-400">
                TerraScan'i Android cihazınıza doğrudan APK olarak kurma ve Play Store'a yükleme adımları
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 overflow-x-auto text-xs font-semibold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('EASY_APK')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'EASY_APK'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-bold">⚡ EN KOLAY APK YAPMA YOLU</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PWABUILDER')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'PWABUILDER'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>2. PWABuilder (Play Store .AAB)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONSOLE_STEPS')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'CONSOLE_STEPS'
                ? 'border-teal-500 text-teal-400 bg-teal-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>3. Play Console Yayını</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BUBBLEWRAP')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'BUBBLEWRAP'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>4. Bubblewrap Terminal</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-sans">
          
          {/* TAB 0: EN KOLAY APK YAPMA YOLU */}
          {activeTab === 'EASY_APK' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/50 shadow-lg">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      En Kolay Şekilde APK Yapma ve Telefona Yükleme Yolu
                    </h3>
                    <p className="text-[11px] text-emerald-300 font-mono">
                      Kod yazmadan, bilgisayara gerek kalmadan 2 pratik yöntem:
                    </p>
                  </div>
                </div>
              </div>

              {/* Yöntem 1: Doğrudan Telefona Yükleme (En Hızlısı) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs">
                      1
                    </span>
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      1. YÖNTEM: Telefondan Tek Tıkla Kurulum (En Kolay / 1 Saniye)
                    </h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    Önerilen
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed text-xs">
                  APK dosyası indirip güvenlik uyarılarıyla uğraşmak istemiyorsanız, modern Android telefonlar bu uygulamayı doğrudan Play Store uygulaması gibi yükleyebilir:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-emerald-400 font-bold font-mono">Adım 1</div>
                    <p className="text-slate-300 text-[11px]">
                      Android telefonunuzda <strong>Google Chrome</strong> tarayıcısını açıp uygulamanın linkine girin.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-emerald-400 font-bold font-mono">Adım 2</div>
                    <p className="text-slate-300 text-[11px]">
                      Chrome'un sağ üst köşesindeki <strong>üç nokta (⋮)</strong> menüsüne dokunun.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-emerald-400 font-bold font-mono">Adım 3</div>
                    <p className="text-slate-300 text-[11px]">
                      <strong>"Uygulamayı Yükle"</strong> veya <strong>"Ana Ekrana Ekle"</strong> seçeneğine basın.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Sonuç: Uygulama telefonunuzun menüsüne kendi özel <strong>TerraScan</strong> logosuyla yerel bir APK gibi kurulur ve tarayıcı çubukları olmadan tam ekran çalışır!
                  </span>
                </div>
              </div>

              {/* Yöntem 2: Gerçek .APK Dosyası İndirme (PWABuilder / Web2APK) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 font-black flex items-center justify-center text-xs">
                      2
                    </span>
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      2. YÖNTEM: İndirilebilir Gerçek .APK / .AAB Dosyası Alma (Kodsuz)
                    </h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                    Dosya Halinde
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed text-xs">
                  Eğer elinizde fiziksel bir <code>.apk</code> veya Play Store için <code>.aab</code> dosyası olmasını istiyorsanız:
                </p>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold text-[11px]">1. Uygulamanızın Canlı Linki:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentAppUrl, 'easy_url')}
                      className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] flex items-center gap-1 transition-all"
                    >
                      {copiedText === 'easy_url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText === 'easy_url' ? 'Kopyalandı!' : 'Linki Kopyala'}</span>
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-cyan-300 text-[11px] truncate">
                    {currentAppUrl}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                    <span className="text-cyan-400 font-mono font-bold">A)</span>
                    <div>
                      <strong className="text-white block mb-0.5">PWABuilder ile İndirme (Resmi Microsoft & Google Aracı):</strong>
                      <p className="text-slate-400 text-[11px]">
                        <a href="https://www.pwabuilder.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-bold">pwabuilder.com</a> adresine gidin, yukarıdaki linki yapıştırın ve <strong>"Package For Stores" -&gt; "Android"</strong> seçeneğinden tek tıkla APK/AAB paketini indirin.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                    <span className="text-cyan-400 font-mono font-bold">B)</span>
                    <div>
                      <strong className="text-white block mb-0.5">Web2APK / AppsGeyser ile İndirme:</strong>
                      <p className="text-slate-400 text-[11px]">
                        <a href="https://www.web2application.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-bold">web2application.com</a> veya <a href="https://appsgeyser.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-bold">appsgeyser.com</a> sitelerine girip linki yapıştırarak doğrudan kurulum dosyası olan <code>.apk</code> dosyanızı 30 saniyede indirebilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: PWABUILDER */}
          {activeTab === 'PWABUILDER' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 border border-emerald-500/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    PWABuilder İle 5 Dakikada Google Play (.AAB) Paketi Oluşturma
                  </h3>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Google Play Store artık klasik <code>.apk</code> yerine optimize edilmiş <code>.aab</code> (Android App Bundle) dosyası zorunlu kılmaktadır. Microsoft ve Google ortaklığıyla geliştirilen ücretsiz <strong>PWABuilder</strong>, tek tıkla uygulamanızı Google Play mağaza paketine dönüştürür.
                </p>
              </div>

              {/* Step by Step Guide */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">1</span>
                      UYGULAMA CANLI LİNKİNİZİ KOPYALAYIN
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentAppUrl, 'url')}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] flex items-center gap-1 transition-all"
                    >
                      {copiedText === 'url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText === 'url' ? 'Kopyalandı!' : 'Linki Kopyala'}</span>
                    </button>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-cyan-300 truncate">
                    {currentAppUrl}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">2</span>
                      PWABUILDER.COM SİTESİNE GİDİN VE URL'Yİ YAPIŞTIRIN
                    </span>
                    <a
                      href="https://www.pwabuilder.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-sm"
                    >
                      <span>PWABuilder'ı Aç</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Siteyi açtığınızda kopyaladığınız linki kutucuğa yapıştırıp <strong>"Start"</strong> butonuna basın. Uygulamanızın manifest ve ikonları otomatik test edilecektir.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <span className="font-mono font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">3</span>
                    "PACKAGE FOR STORE" &gt; "GOOGLE PLAY" SEÇİN
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Test başarılı olduğunda <strong>"Package For Store"</strong> butonuna basın ve <strong>"Google Play"</strong> seçeneğini tıklayın. Paket adı olarak <code>com.terrascan.georadar</code> verebilirsiniz.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <span className="font-mono font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">4</span>
                    İNDİRİLEN .AAB DOSYASINI GOOGLE PLAY CONSOLE'A YÜKLEYİN
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    PWABuilder size imzalanmış bir ZIP paketi verir. ZIP içindeki <code>app-release-bundle.aab</code> dosyasını doğrudan Google Play Console'a yükleyerek yayına alabilirsiniz!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLAY CONSOLE STEPS */}
          {activeTab === 'CONSOLE_STEPS' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/70 border border-cyan-500/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      Google Play Console Yayına Alma Kontrol Listesi
                    </h3>
                    <p className="text-xs text-slate-300">
                      Uygulamanızın Google tarafından reddedilmeden 24-48 saat içinde onaylanması için gerekenler
                    </p>
                  </div>
                  <a
                    href="https://play.google.com/console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-sm"
                  >
                    <span>Play Console'a Git</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    1. Uygulama Başlığı ve Açıklama
                  </span>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div><strong>Uygulama Adı:</strong> TerraScan - Uydu Yeraltı Radarı</div>
                    <div><strong>Kısa Açıklama:</strong> Uydu uzaktan algılama ve jeofizik zemin anomali analizi</div>
                    <div className="text-slate-400"><em>(Not: Mağaza kuralları gereği yapay zeka/AI iddiaları yerine jeofizik radar ve uzaktan algılama vurgusu yapılmıştır.)</em></div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    2. Uygulama İkonu (512x512)
                  </span>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div>Google Play, 512x512 piksel yüksek çözünürlüklü şeffaf olmayan ikon ister.</div>
                    <div className="pt-1">
                      <a
                        href="/icon-512.svg"
                        target="_blank"
                        className="text-cyan-400 hover:underline font-mono"
                      >
                        /icon-512.svg (Yeni Modern Radar İkonunu Görüntüle)
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    3. Gizlilik Politikası (Privacy Policy)
                  </span>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div>Play Store için gizlilik politikası URL'si zorunludur.</div>
                    <div>Uygulamanızın canlı linkini veya GitHub Pages linkinizi girebilirsiniz. Uygulamamız 2863 sayılı kanun yasal bildirimini içermektedir.</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    4. Yaş ve İçerik Derecelendirmesi
                  </span>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div>Play Console anketinde kategori: <strong>Araçlar / Navigasyon</strong></div>
                    <div>Şiddet, kumar veya sakıncalı içerik barındırmadığı için <strong>3+ (Herkese Uygun)</strong> derecesi alır.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BUBBLEWRAP CLI */}
          {activeTab === 'BUBBLEWRAP' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/70 border border-indigo-500/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">
                    Google Chrome Ekibinin Resmi Aracı: Bubblewrap CLI
                  </h3>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Terminal veya komut satırı kullanmayı tercih ediyorsanız, Google'ın resmi <strong>Bubblewrap (TWA)</strong> CLI aracıyla doğrudan Android Studio projesi oluşturabilir ve imzalı <code>.aab</code> paketini derleyebilirsiniz.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">1. Bubblewrap CLI Kurulumu (Terminal):</span>
                  <div className="p-2.5 rounded bg-slate-900 font-mono text-indigo-300 flex items-center justify-between">
                    <span>npm install -g @bubblewrap/cli</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('npm install -g @bubblewrap/cli', 'cmd1')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedText === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">2. Manifest İle Projeyi Başlatma:</span>
                  <div className="p-2.5 rounded bg-slate-900 font-mono text-indigo-300 flex items-center justify-between">
                    <span>bubblewrap init --manifest {currentAppUrl}/manifest.json</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`bubblewrap init --manifest ${currentAppUrl}/manifest.json`, 'cmd2')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedText === 'cmd2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-mono">3. Google Play Paketini Derleme (.aab):</span>
                  <div className="p-2.5 rounded bg-slate-900 font-mono text-indigo-300 flex items-center justify-between">
                    <span>bubblewrap build</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('bubblewrap build', 'cmd3')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedText === 'cmd3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PWA DIRECT INSTALL */}
          {activeTab === 'PWA_DIRECT' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-orange-950/70 border border-amber-500/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    Google Play Beklemeden Telefona Doğrudan Kurulum (PWA)
                  </h3>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  TerraScan tam donanımlı bir <strong>Progressive Web App (PWA)</strong> altyapısına sahiptir. Android Chrome veya Samsung Browser üzerinden tek tıkla cihazınıza yerel bir uygulama gibi yükleyebilir, tam ekran modunda çevrimdışı ve GPS destekli kullanabilirsiniz.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white">Android Cihazlarda Nasıl Kurulur?</h4>
                <ol className="space-y-2 text-slate-300 text-[11px] list-decimal list-inside leading-relaxed">
                  <li>Telefonunuzda <strong>Google Chrome</strong> tarayıcısını açın ve uygulamanın adresine gidin.</li>
                  <li>Sağ üstteki <strong>üç nokta (⋮)</strong> menüsüne dokunun.</li>
                  <li><strong>"Uygulamayı Yükle"</strong> veya <strong>"Ana Ekrana Ekle"</strong> seçeneğine basın.</li>
                  <li>TerraScan anında telefonunuzun uygulama çekmecesine bağımsız bir uygulama olarak kurulacaktır!</li>
                </ol>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Google Play Store TWA & PWA v3 Uyumlu Paket</span>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all shadow-sm active:scale-95"
          >
            Tamam, Anladım
          </button>
        </div>

      </div>
    </div>
  );
};
