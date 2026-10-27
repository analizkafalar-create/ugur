import React from 'react';
import { 
  X, 
  Compass, 
  Scan, 
  Box, 
  FileText, 
  UserCheck, 
  Coins, 
  MapPin, 
  Layers, 
  ChevronRight,
  Sparkles,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';

interface MobileGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
  onOpenMembership?: (tab?: 'CREDITS' | 'SERVER' | 'PROFILE' | 'HISTORY' | 'PLANS') => void;
  onOpenReport?: () => void;
}

export const MobileGuideModal: React.FC<MobileGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  onOpenMembership,
  onOpenReport
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: 'Hesaba Giriş & Üyelik',
      badge: 'Giriş & Profil',
      color: 'from-blue-600 to-cyan-500',
      icon: <UserCheck className="w-5 h-5 text-cyan-300" />,
      desc: 'Sağ üst köşedeki [👤 Profil / Giriş] butonuna basarak mevcut hesabınıza giriş yapın veya saniyeler içinde yeni üye kaydı oluşturun. Girişte hoşgeldin jetonlarınız otomatik tanımlanır.',
      actionLabel: 'Giriş Yap / Üye Ol',
      action: () => {
        onClose();
        if (onOpenAuth) onOpenAuth();
      }
    },
    {
      num: 2,
      title: 'Koordinat veya Şehir Seçin',
      badge: 'Saha Tespiti',
      color: 'from-cyan-600 to-teal-500',
      icon: <MapPin className="w-5 h-5 text-teal-300" />,
      desc: 'Üst arama çubuğuna il, ilçe, köy veya doğrudan GPS koordinatınızı (örn: 38.477309 29.728954) yazın. Bulunduğunuz yer için mavi [🎯 GPS] butonuna basabilir veya haritada parmağınızla istediğiniz araziye doğrudan dokunabilirsiniz.',
    },
    {
      num: 3,
      title: 'Radarla Taramayı Başlatın',
      badge: '15 Kredi',
      color: 'from-purple-600 to-indigo-600',
      icon: <Scan className="w-5 h-5 text-purple-300" />,
      desc: 'Ekranın sağ alt köşesindeki mor [⚡ TARA] butonuna basın. Sentinel-1 SAR uydusu ve yer altı mikrodalga sensörleri 0.8m - 5.0m derinliğe kadar dielektrik ve manyetik anomali taraması yapar.',
    },
    {
      num: 4,
      title: 'Anomali ve Dehlizleri İnceleyin',
      badge: '2B & 3B Derinlik',
      color: 'from-amber-600 to-orange-500',
      icon: <Box className="w-5 h-5 text-amber-300" />,
      desc: 'Harita üzerinde beliren 1, 2, 3 numaralı dairelere dokunarak metalik odak, yapısal oda, taş temel ve boşlukların derinliğini görün. Üstteki [3B] veya mavi [⚡ DEHLİZ] butonuna basarak yapıyı 3 boyutlu derinlikte inceleyin.',
    },
    {
      num: 5,
      title: 'Resmi Rapor ve Kayıt Alın',
      badge: 'PDF Çıktısı',
      color: 'from-emerald-600 to-green-500',
      icon: <FileText className="w-5 h-5 text-emerald-300" />,
      desc: 'Sağ üst köşedeki mor [📄 Rapor] butonuna dokunarak renkli jeofizik zemin analiz raporunu PDF olarak indirin. Haritadaki mavi [📷 KAYDET] butonuyla sahayı profilinize kaydedin.',
      actionLabel: 'Raporu Gör',
      action: () => {
        onClose();
        if (onOpenReport) onOpenReport();
      }
    },
    {
      num: 6,
      title: 'Jeton Yükleme & Bakiye',
      badge: 'Tera Jeton',
      color: 'from-yellow-600 to-amber-500',
      icon: <Coins className="w-5 h-5 text-yellow-300" />,
      desc: 'Her derinlik çekimi 15 kredidir. Krediniz azaldığında üst bardaki [🪙 Jeton] butonuna basarak Shopier 3D Secure ile güvenle satın alabilir veya lisans anahtarınızla anında bakiye yükleyebilirsiniz.',
      actionLabel: 'Jeton Yükle',
      action: () => {
        onClose();
        if (onOpenMembership) onOpenMembership('CREDITS');
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                TerraScan Mobil Kullanım Rehberi
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Adım Adım
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Telefonda nasıl giriş yapılır ve nasıl taranır?</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-cyan-200">
              <span className="font-bold text-white block">Mobil Cihazlarda Kullanım Çok Kolaydır:</span>
              Haritaya parmakla dokunun veya arama kutusuna yer adı yazın, ardından alttaki mor <b>[⚡ TARA]</b> butonuna dokunarak yeraltı anomalilerini anında görün.
            </div>
          </div>

          {steps.map((step) => (
            <div 
              key={step.num}
              className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-cyan-500/40 transition-all flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${step.color} flex items-center justify-center text-white font-black text-xs shadow-md shrink-0`}>
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">{step.title}</h3>
                  </div>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-300 font-mono">
                  {step.badge}
                </span>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed pl-9">
                {step.desc}
              </p>

              {step.action && (
                <div className="pl-9 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playScanBeep();
                      step.action!();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                  >
                    <span>{step.actionLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onClose();
              if (onOpenAuth) onOpenAuth();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold text-xs transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Hesap Değiştir / Giriş</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-transform active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Anladım, Taramaya Başla</span>
          </button>
        </div>

      </div>
    </div>
  );
};
