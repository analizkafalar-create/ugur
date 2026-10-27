import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Headphones, 
  User, 
  ShieldAlert, 
  Satellite, 
  HelpCircle, 
  Smartphone, 
  Play,
  Scale,
  MessageSquare,
  Gift,
  Coins,
  Share2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Check
} from 'lucide-react';
import { sound } from '../utils/anomalyEngine';
import { UserProfile } from '../types';
import { getUserReferralCode } from '../utils/userManager';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  badge?: string;
  actions?: { label: string; action: () => void; icon?: React.ReactNode }[];
}

interface LiveSupportModalProps {
  onClose: () => void;
  onOpenMembership?: (tab?: 'CREDITS' | 'SERVER' | 'PROFILE' | 'HISTORY') => void;
  userProfile?: UserProfile;
}

const FAQ_PROMPTS = [
  {
    label: '🎁 Arkadaşını Getir 15 Kredi Kazan',
    query: 'Arkadaşımı davet ederek nasıl 15 kredi kazanırım? Davet kodu nasıl çalışır?',
  },
  {
    label: '🪙 15 Kredi Düşüşü & Paketler',
    query: 'Tarama başına kaç kredi düşer? 100 ve 250 jeton paketlerinde kaç kredi verilir?',
  },
  {
    label: '📱 APK Yayında: Güncellemeler Yansır mı?',
    query: 'Uygulamam APK olarak yayında, buradan güncelleme yapınca telefondaki APK\'da da anında değişir mi?',
  },
  {
    label: '🔑 Lisans Edinme & Satın Alma',
    query: 'Nasıl yeni lisans veya paket satın alırım?',
  },
  {
    label: '⚖️ 2863 Sayılı Kanun & Mevzuat',
    query: 'Türkiye Cumhuriyeti mevzuatına göre izinsiz yüzey araştırması veya kazı yapmak yasal mıdır?',
  },
  {
    label: '🛰️ SAR Radar & Derinlik Çözünürlüğü',
    query: 'TerraScan uyduları ne kadar derine inebilir ve hangi çözünürlükte analiz yapar?',
  },
  {
    label: '🔍 Koordinat Nasıl Taranır?',
    query: 'Farklı bir koordinatı nasıl tarayabilirim ve haritada tıkla-tara nasıl kullanılır?',
  },
];

export const LiveSupportModal: React.FC<LiveSupportModalProps> = ({ 
  onClose,
  onOpenMembership,
  userProfile
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Merhaba! Ben TerraScan Canlı Jeofizik ve Sistem Destek Danışmanıyım. 15 Kredi düşüş sistemi, "Arkadaşını Getir 15 Kredi Kazan" davet programı, APK canlı güncellemeleri, Google Play Faturalandırma veya T.C. 2863 sayılı yasal mevzuat hakkında 7/24 yardımcı olabilirim. Nasıl yardımcı olabilirim?',
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (userText: string) => {
    if (!userText.trim()) return;

    sound.playScanBeep();
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Contextual intelligent responses
    setTimeout(() => {
      const lower = userText.toLowerCase();
      let reply = '';
      let actions: { label: string; action: () => void; icon?: React.ReactNode }[] | undefined = undefined;

      if (
        lower.includes('satın') ||
        lower.includes('nasıl alırım') ||
        lower.includes('ücret') ||
        lower.includes('fiyat') ||
        lower.includes('ödeme') ||
        lower.includes('nasıl yapılır') ||
        lower.includes('kaç para') ||
        lower.includes('paket satın') ||
        lower.includes('google play') ||
        lower.includes('play store') ||
        lower.includes('play billing') ||
        lower.includes('kartla') ||
        lower.includes('kredi kartı')
      ) {
        reply = 'Uygulama içi satın alma veya doğrudan link paylaşımı yapılmamaktadır. Yeni bir lisans edinmek veya mevcut paketinizi yönetmek için tarayıcınızı açarak web sitemizi ziyaret edebilirsiniz.';
        actions = [];
      } else if (
        lower.includes('lisans') ||
        lower.includes('anahtar') ||
        lower.includes('key') ||
        userText.toUpperCase().includes('TERA-')
      ) {
        const cleanKey = userText.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        const isValidFormat = /^TERA-[A-Z0-9]{2,8}-[A-Z0-9]{3,8}-[A-Z0-9]{3,8}-[A-Z0-9]{2,4}$/.test(cleanKey) ||
                              /^TERA-[A-Z0-9]{4,8}-[A-Z0-9]{4,8}-[A-Z0-9]{2,4}$/.test(cleanKey);
        if (isValidFormat) {
          reply = `Lisans anahtarı biçimi geçerlidir (${cleanKey}). Lisansınızı aktifleştirmek için menüdeki "Jeton Yükle" bölümünden Lisans Kodu alanına giriş yapabilirsiniz.`;
        } else {
          reply = "Girilen lisans anahtarı formatı geçersizdir. Lütfen 'TERA-XXXX-XXXX-XXXX-TR' formatındaki lisans kodunuzu kontrol ediniz.";
        }
      } else if (lower.includes('arkadaş') || lower.includes('davet') || lower.includes('referans') || lower.includes('getir') || lower.includes('hediye kredi')) {
        const myCode = userProfile ? getUserReferralCode(userProfile) : 'TERA-REF-ÖZEL';
        reply = `🤝 "Arkadaşını Getir 15 Kredi Kazan" Programı:\n\n1. Profil sekmesinde size özel atanmış benzersiz davet kodunuzu (${myCode}) bulun.\n2. "Kodu Kopyala" veya "WhatsApp ile Paylaş" butonuna basarak arkadaşınıza iletin.\n3. Arkadaşınız üye olup Profilindeki "Arkadaş Davet Kodu" alanına sizin kodunuzu yazdığında HEM ARKADAŞINIZ HEM DE SİZ anında +15 Kredi (Tam 1 Anomali Çekim Hakkı) kazanırsınız!\n\nDavet edebileceğiniz arkadaş sayısında herhangi bir limit yoktur; sınırsız arkadaş davet edip ücretsiz çekim kredisi biriktirebilirsiniz!`;
        if (onOpenMembership) {
          actions = [
            {
              label: '🎁 Profilde Davet Kodumu Gör',
              action: () => onOpenMembership('PROFILE'),
              icon: <Gift className="w-3.5 h-3.5 text-emerald-400" />
            }
          ];
        }
      } else if (lower.includes('apk') || lower.includes('güncelle') || lower.includes('yayın') || lower.includes('telefonda') || lower.includes('android') || lower.includes('webview') || lower.includes('değişir mi')) {
        reply = `📱 APK & Canlı Güncelleme Garantisi:\n\nEVET, OTOMATİK DEĞİŞİR! TerraScan APK uygulamanız canlı web tabanlı (WebView / TWA) mimariye sahip olduğu için web sisteminde yapılan tüm değişiklikler (lisans aktivasyon sistemi, 15 kredi düşüş kuralı, arkadaşını davet et modülü vb.) kullanıcının telefonundaki APK'ya ANINDA ve OTOMATİK olarak yansır.\n\nKullanıcıların yeni bir APK indirmesine veya mağazadan güncelleme yapmasına gerek yoktur; uygulamayı açtıklarında doğrudan en güncel canlı sürümü kullanırlar.`;
      } else if (lower.includes('kredi') || lower.includes('jeton') || lower.includes('15 kredi') || lower.includes('düş') || lower.includes('bakiye')) {
        reply = `🪙 Kredi ve Harcama Kuralları:\n\n• Her Anomali Çekiminde 15 Kredi Düşer: Haritada tıkladığınız veya koordinat aradığınız her anomali taraması için bakiyenizden tam 15 Kredi düşülür.\n• Yeni Üyelik: Sisteme yeni kaydolan her üyeye 1 ücretsiz çekim için 15 Kredi hoş geldin bakiyesi verilir.\n• Arkadaşını Getir: Her davet ettiğiniz arkadaşınız için +15 Kredi anında hediye edilir!\n• Lisans Kodu: Elinizdeki lisans anahtarı ile Jeton Yükle sekmesinden anında bakiye aktifleştirebilirsiniz.`;
        if (onOpenMembership) {
          actions = [
            {
              label: '🔑 Lisans Kodu ile Yükle',
              action: () => onOpenMembership('CREDITS'),
              icon: <Coins className="w-3.5 h-3.5 text-amber-400" />
            }
          ];
        }
      } else if (lower.includes('google') || lower.includes('play')) {
        reply = 'Uygulama içi satın alma veya doğrudan link paylaşımı yapılmamaktadır. Yeni bir lisans edinmek veya mevcut paketinizi yönetmek için tarayıcınızı açarak web sitemizi ziyaret edebilirsiniz.';
        actions = [];
      } else if (lower.includes('whatsapp') || lower.includes('temsilci') || lower.includes('danışman') || lower.includes('yetkili') || lower.includes('iletişim') || lower.includes('telefon')) {
        reply = `💬 Doğrudan WhatsApp Jeofizik Danışma Hattı:\n\nSaha ölçümleri, kuyu logları, kurumsal lisanslama veya teknik destek için resmi WhatsApp hattımızla doğrudan iletişime geçebilirsiniz.`;
        actions = [
          {
            label: '📲 WhatsApp İle Mesaj Gönder',
            action: () => {
              const text = encodeURIComponent('Merhaba, TerraScan uydu zemin anomali sistemi hakkında bilgi ve destek almak istiyorum.');
              window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
            },
            icon: <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
          }
        ];
      } else if (lower.includes('kazı') || lower.includes('kanun') || lower.includes('mevzuat') || lower.includes('ceza') || lower.includes('2863') || lower.includes('sit') || lower.includes('izinsiz')) {
        reply = `⚖️ YASAL ZORUNLULUK & 2863 SAYILI KANUN UYARISI:\n\n2863 sayılı Kültür ve Tabiat Varlıklarını Koruma Kanunu Madde 74 uyarınca; izinsiz olarak kültür varlığı aramak veya kaçak kazı/sondaj gerçekleştirmek 2 yıldan 5 yıla kadar HAPİS CEZASI ile cezalandırılan ağır bir suçtur.\n\nTerraScan yazılımı ve jeofizik algoritmaları kesinlikle izinsiz arama veya fiziki müdahale aracı DEĞİLDİR. Yalnızca bilimsel jeoloji, zemin mekaniği ve akademik uzaktan algılama simülasyonu amacıyla tasarlanmıştır. T.C. kanunlarına aykırı hiçbir eylemde bulunmayınız.`;
      } else if (lower.includes('derin') || lower.includes('metre') || lower.includes('radar') || lower.includes('çözünürlük') || lower.includes('sar') || lower.includes('frekans')) {
        reply = `🛰️ SAR Radar & Dielektrik Algılama Teknolojisi:\n\n• TerraSAR-X (X-Bant 3.1 cm dalga boyu) ve Sentinel-1/2 (C/L Bant) radar geri saçılımı interferometrisi kullanılır.\n• Dielektrik geçirgenlik farkına göre yüzeyden 0.8 metre ila 5.0 metre altındaki yoğunluk sapmaları, jeolojik kırıklar ve yapısal yeraltı boşlukları tespit edilir.\n• 3B Voxel Hacim modellemesi ve B-Scan radargram kesiti ile derinlik seviyelerini ayrıntılı olarak inceleyebilirsiniz.`;
      } else if (lower.includes('koordinat') || lower.includes('nasıl') || lower.includes('tara') || lower.includes('tıkl')) {
        reply = `🔍 Koordinat Arama & Tıkla-Tara Kullanımı:\n\n1. Ekranın üst kısmındaki arama çubuğuna dilediğiniz enlem/boylam koordinatını yazıp Enter tuşuna basabilirsiniz (Örn: "38.477309 29.728954").\n2. Veya harita üzerinde fareyle ya da parmağınızla herhangi bir noktaya doğrudan tıklayabilirsiniz.\n3. Tıkladığınız her arazi için Sentinel-2B ve radar verileri işlenerek benzersiz anomali haritası anında üretilir (Her çekimde 15 Kredi düşülür).`;
      } else {
        reply = `Sorunuz için teşekkür ederiz: "${userText}".\n\nTerraScan jeofizik uydu anomali tarama sistemi; her taramada 15 Kredi düşen bakiye yapısı, "Arkadaşını Getir 15 Kredi Kazan" davet ödülü ve T.C. 2863 sayılı kanununa tam uyumlu bilimsel simülasyon altyapısıyla çalışır.\n\nDaha fazla yardım için aşağıdaki hızlı butonları kullanabilir veya WhatsApp destek hattımıza yazabilirsiniz.`;
      }

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: reply,
          time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          actions,
        },
      ]);
      sound.playAnomalyDiscovered();
    }, 500);
  };

  const handleClearChat = () => {
    sound.playScanBeep();
    setMessages([
      {
        id: 'welcome-new',
        sender: 'assistant',
        text: 'Sohbet sıfırlandı. TerraScan uydu sistemleri, 15 kredi kuralı, arkadaşını davet etme veya Google Play ödemeleriyle ilgili sorularınızı iletebilirsiniz.',
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleOpenWhatsApp = () => {
    sound.playScanBeep();
    const text = encodeURIComponent('Merhaba, TerraScan uydu ve jeofizik tarama sistemi hakkında canlı destek almak istiyorum.');
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl h-[88vh] max-h-[680px] flex flex-col bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-[0_0_35px_rgba(6,182,212,0.25)] overflow-hidden font-sans text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 border border-cyan-400/60 flex items-center justify-center text-white shadow-md">
                <Headphones className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">TerraScan Canlı Destek</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  7/24 Çevrimiçi
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>Jeofizik & Sistem Danışmanı</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400 font-mono text-[10px]">Cevap: Anında</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearChat}
              title="Sohbeti Sıfırla"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                sound.playScanBeep();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Bar (WhatsApp, Arkadaşını Davet Et, Kredi Yükle) */}
        <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="text-[11px] whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center gap-1.5 transition-all shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp Destek</span>
          </button>

          {onOpenMembership && (
            <>
              <button
                type="button"
                onClick={() => onOpenMembership('PROFILE')}
                className="text-[11px] whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 font-semibold flex items-center gap-1.5 transition-all shrink-0"
              >
                <Gift className="w-3.5 h-3.5 text-indigo-400" />
                <span>Arkadaşını Getir (+15 Kredi)</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenMembership('CREDITS')}
                className="text-[11px] whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-semibold flex items-center gap-1.5 transition-all shrink-0"
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Kredi Yükle (Google Play)</span>
              </button>
            </>
          )}
        </div>

        {/* Quick FAQ Prompts Scroll Bar */}
        <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/60 overflow-x-auto flex gap-1.5 shrink-0 no-scrollbar">
          {FAQ_PROMPTS.map((faq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(faq.query)}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-cyan-950 hover:border-cyan-500 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
            >
              {faq.label}
            </button>
          ))}
        </div>

        {/* Chat Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gradient-to-b from-slate-900/60 via-slate-900/90 to-slate-950">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-cyan-600/30 border border-cyan-500/40 text-cyan-300'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-tl-none whitespace-pre-line'
                }`}
              >
                <p>{msg.text}</p>

                {/* Optional Action Buttons inside assistant reply */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-wrap gap-2">
                    {msg.actions.map((act, actIdx) => (
                      <button
                        key={actIdx}
                        type="button"
                        onClick={act.action}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-slate-600 hover:border-cyan-500 text-cyan-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                      >
                        {act.icon}
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className={`text-[9px] mt-1.5 text-right font-mono ${
                    msg.sender === 'user' ? 'text-purple-200' : 'text-slate-500'
                  }`}
                >
                  {msg.time}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-slate-400 text-xs pl-9">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-slate-500 ml-1">Jeofizik Danışmanı yanıt hazırlıyor...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Legal Disclaimer Pill in Support Box */}
        <div className="px-3.5 py-1.5 bg-rose-950/40 border-t border-rose-900/50 text-[10px] text-rose-300 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5 font-medium truncate">
            <Scale className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>2863 S.K. Md. 74: İzinsiz kazı & define aramak hapis cezası gerektiren suçtur.</span>
          </span>
          <span className="font-mono text-slate-400 shrink-0 ml-2">T.C. Mevzuat Uyumlu</span>
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputValue);
          }}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Bir soru yazın (örn: 'Arkadaşımı nasıl davet ederim?', 'APK güncellemeleri...')"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white transition-all shadow-md shadow-cyan-600/30 shrink-0 cursor-pointer"
            title="Gönder"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
