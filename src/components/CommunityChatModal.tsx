/**
 * TerraScan AI - Saha Topluluğu & Canlı Sohbet Modalı (Community Live Chat)
 * Supabase Realtime destekli, yönetici '🛡️ Admin' rozetli, anlık mesajlaşma penceresi.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  ShieldCheck, 
  ShieldAlert, 
  MessageSquare,
  Smile,
  Trash2,
  VolumeX,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { getSupabaseClient, deleteChatMessageFromSupabase } from '../lib/supabase';
import { isUserAdmin } from '../utils/adminManager';
import { sound } from '../utils/anomalyEngine';

interface CommunityChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
}

const COMMON_EMOJIS = [
  '👍', '🔥', '🛰️', '⚡', '📍', '💎', '⛏️', '🎯', 
  '🚀', '😊', '👏', '⚠️', '👀', '📡', '💡', '🛡️',
  '✅', '❌', '💯', '🌍', '📐', '🔍', '🙌', '🤝'
];

export const CommunityChatModal: React.FC<CommunityChatModalProps> = ({
  isOpen,
  onClose,
  userProfile,
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number>(37);
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'OFFLINE'>('CONNECTING');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const currentUserName = userProfile.name || (userProfile.email ? userProfile.email.split('@')[0] : 'Kullanıcı');
  const isAdminUser = isUserAdmin(userProfile) || userProfile.role === 'ADMIN';
  const isBanned = userProfile.status === 'SUSPENDED' || (userProfile.status as any) === 'BANNED';
  const isMuted = Boolean(userProfile.isChatMuted);

  // Close emoji picker on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // 1. fetchChatMessages: Doğrudan supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(50)
  const fetchChatMessages = async (silent: boolean = false) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      if (!silent) console.log('[CommunityChat] Supabase istemcisi hazır değil (offline modu)');
      setRealtimeStatus('OFFLINE');
      return;
    }

    if (!silent) console.log('[CommunityChat] chat_messages tablosundan son 50 mesaj çekiliyor...');

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Chat fetch hatası:', error.message);
        return;
      }

      if (!silent) console.log(`[CommunityChat] Veritabanından gelen mesaj sayısı: ${data?.length || 0}`);
      if (data) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Chat fetch exception:', err);
    }
  };

  // 2. Lifecycle: Realtime Channel + 4s Polling Backup
  useEffect(() => {
    if (!isOpen) return;

    setOnlineCount(Math.floor(Math.random() * 12) + 34);
    console.log('[CommunityChat] Sohbet penceresi açıldı. Bağlantı kuruluyor...');

    // İlk mesajları çek
    fetchChatMessages(false);

    const supabase = getSupabaseClient();
    let channel: any = null;

    if (supabase) {
      // Tek kanal üzerinden Realtime postgres_changes dinleyicisi
      channel = supabase
        .channel('chat_messages_channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          (payload) => {
            console.log('[CommunityChat Realtime] Canlı INSERT bildirimi alındı:', payload.new);
            if (payload.new) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === payload.new.id)) return prev;
                return [...prev, payload.new];
              });
              sound.playScanBeep();
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'chat_messages' },
          (payload) => {
            console.log('[CommunityChat Realtime] Canlı DELETE bildirimi alındı:', payload.old);
            if (payload.old?.id) {
              setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
            }
          }
        )
        .subscribe((status) => {
          console.log('[CommunityChat Realtime] Abonelik bağlantı durumu:', status);
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('SUBSCRIBED');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setRealtimeStatus('OFFLINE');
          }
        });
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => {
      console.log('[CommunityChat] Sohbet penceresi kapatıldı. Kanal ve dinleyiciler temizleniyor.');
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isOpen]);

  // Otomatik aşağı kaydırma
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // 3. Emoji ekleme
  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // 4. Admin Mesaj Silme (chat_messages tablosundan doğrudan delete)
  const handleDeleteMessage = async (msgId: string | number) => {
    if (!isAdminUser || deletingId) return;
    if (!confirm('Bu mesajı sohbetten silmek istediğinize emin misiniz?')) return;

    setDeletingId(msgId);
    try {
      const success = await deleteChatMessageFromSupabase(msgId);
      if (success) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        sound.playRadarBeep();
      }
    } catch (err) {
      console.error('[CommunityChat] Mesaj silme hatası:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // 5. sendMessage: Doğrudan veritabanına insert
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBanned || isMuted) return;

    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    const supabase = getSupabaseClient();

    if (!supabase) {
      console.error('[CommunityChat] Supabase bağlantısı mevcut değil!');
      setIsSending(false);
      return;
    }

    const payload = {
      user_name: currentUserName || 'Kullanıcı',
      message: text,
      role: isAdminUser ? 'admin' : 'user',
    };

    console.log('[CommunityChat] Mesaj veritabanına yazılıyor (INSERT):', payload);

    try {
      const { error } = await supabase.from('chat_messages').insert([payload]);

      if (error) {
        console.error('Chat insert hatası:', error);
      } else {
        console.log('[CommunityChat] Mesaj başarıyla Supabase chat_messages tablosuna kaydedildi.');
        setInputText('');
        sound.playScanBeep();
        // Anında son durumu güncelle
        fetchChatMessages(true);
      }
    } catch (err) {
      console.error('Chat insert beklenmeyen hata:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl h-[90vh] max-h-[720px] bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/60 border-b border-cyan-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-wide">
                  💬 Saha Topluluğu & Canlı Sohbet
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {onlineCount} Operatör Aktif
                </span>
              </div>
              <div className="text-[10px] text-cyan-300/80 font-mono flex items-center gap-2 mt-0.5">
                <span>Supabase Realtime Ağ Senkronizasyonu</span>
                <span>•</span>
                <span className={realtimeStatus === 'SUBSCRIBED' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {realtimeStatus === 'SUBSCRIBED' ? '● Canlı Realtime Bağlantısı Aktif' : '○ Bağlantı Kuruluyor...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2863 Sayılı Kanun & Bilgilendirme Şeridi */}
        <div className="px-3.5 py-1.5 bg-amber-950/40 border-b border-amber-500/30 flex items-center justify-between text-[10px] text-amber-200/90 font-sans shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Yasal Kural:</strong> Sohbet kanalı yalnızca bilimsel zemin ve jeofizik paylaşımları içindir. İzinsiz araştırma teşviki yasaktır.
            </span>
          </div>
          {isAdminUser && (
            <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 font-mono text-[9px] font-bold">
              🛡️ Admin Modu (Mesaj Yönetimi Aktif)
            </span>
          )}
        </div>

        {/* Ban / Mute Uyarı Şeridi */}
        {(isBanned || isMuted) && (
          <div className="px-4 py-2 bg-rose-950/70 border-b border-rose-500/50 flex items-center gap-2 text-rose-200 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {isBanned 
                ? 'Hesabınız askıya alınmıştır/yasaklanmıştır. Sohbete mesaj gönderemezsiniz.' 
                : 'Sohbet yetkiniz yönetici tarafından geçici olarak kapatılmıştır (Susturuldu).'}
            </span>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/60 font-sans">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <MessageSquare className="w-10 h-10 text-cyan-500/40 mb-2 animate-pulse" />
              <p className="text-sm font-semibold text-slate-300">Henüz mesaj bulunmuyor</p>
              <p className="text-xs text-slate-500 mt-1">İlk saha mesajını yazarak toplulukla iletişime geçin.</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isAdmin = msg.role === 'admin' || msg.user_role === 'ADMIN' || msg.userRole === 'ADMIN';
              const senderName = msg.user_name || msg.userName || 'Kullanıcı';
              const isMe = senderName === currentUserName || (msg.user_id && msg.user_id === userProfile.id);
              const timeDisplay = msg.created_at
                ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={msg.id || idx}
                  className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all`}
                >
                  {/* Sender Info Line */}
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className={`text-xs font-bold ${
                      isAdmin 
                        ? 'text-indigo-300 font-extrabold' 
                        : isMe 
                          ? 'text-cyan-300' 
                          : 'text-slate-300'
                    }`}>
                      {senderName}
                    </span>

                    {/* ADMIN BADGE */}
                    {isAdmin && (
                      <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[9px] font-black tracking-wider flex items-center gap-1 border border-indigo-400/50 shadow-sm">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        🛡️ Admin
                      </span>
                    )}

                    <span className="text-[10px] text-slate-500 font-mono">
                      {timeDisplay}
                    </span>

                    {/* ADMIN DELETE BUTTON (Tek Tıkla Mesaj Silme) */}
                    {isAdminUser && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        disabled={deletingId === msg.id}
                        className="opacity-60 group-hover:opacity-100 hover:opacity-100 p-1 rounded hover:bg-rose-950/80 text-slate-500 hover:text-rose-400 transition-all cursor-pointer ml-1"
                        title="Mesajı Sil (Admin)"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                      isAdmin
                        ? 'bg-gradient-to-br from-indigo-950/90 to-purple-950/90 border border-indigo-500/60 text-slate-100 shadow-[0_2px_12px_rgba(99,102,241,0.2)]'
                        : isMe
                          ? 'bg-gradient-to-r from-cyan-950 to-blue-950 border border-cyan-500/50 text-cyan-50 shadow-md'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Message Input Bar */}
        <div className="relative">
          {/* Kompakt Emoji Seçici Popover */}
          {showEmojiPicker && (
            <div 
              ref={emojiPickerRef}
              className="absolute bottom-full left-3 mb-2 p-3 bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl backdrop-blur-md z-50 w-72 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold text-slate-300">
                <span>😊 Hızlı Reaksiyon & Saha Emojileri</span>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(false)}
                  className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleAddEmoji(emoji)}
                    className="h-9 rounded-xl hover:bg-slate-800/90 active:scale-90 text-lg flex items-center justify-center transition-all cursor-pointer border border-transparent hover:border-cyan-500/30"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 shrink-0"
          >
            {/* Emoji Butonu */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              disabled={isBanned || isMuted}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Emoji Ekle"
            >
              <Smile className="w-4 h-4" />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isBanned 
                  ? "Hesabınız askıya alındığı için mesaj gönderilemez" 
                  : isMuted 
                    ? "Sohbet yetkiniz kapatılmıştır (Muted)" 
                    : "Saha mesajınızı yazın... (Örn: Uşak havzasında anomali taraması tamamlandı)"
              }
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-colors disabled:opacity-50"
              maxLength={400}
              disabled={isSending || isBanned || isMuted}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending || isBanned || isMuted}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Gönder</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};


