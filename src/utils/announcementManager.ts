import { AppAnnouncement } from '../types';

const ANNOUNCEMENTS_STORAGE_KEY = 'terrascan_system_announcements_v2';

const DEFAULT_ANNOUNCEMENTS: AppAnnouncement[] = [
  {
    id: 'ann-1',
    title: '🚀 Sentinel-2B & Landsat 9 Çoklu Spektral Derinlik Modu Aktif',
    message: 'Yeni nesil multispektral uydu katmanları ile 0.8m - 5.0m derinlikteki yapısal yeraltı boşlukları ve metalik alterasyon odakları yüksek çözünürlükle haritalandırılmaktadır.',
    type: 'UPDATE',
    createdAt: 'Bugün 10:00',
    author: 'Sistem Yöneticisi',
    active: true,
  },
  {
    id: 'ann-2',
    title: '🎁 Arkadaşını Getir, Anında +15 Tera Jeton Kazan!',
    message: 'Kullanıcı profilinizdeki benzersiz davet kodunu arkadaşlarınızla paylaşın. Kayıt olan her arkadaşınız ve siz 15 Kredi (1 ücretsiz tam çekim hakkı) kazanın.',
    type: 'PROMO',
    createdAt: 'Dün 14:30',
    author: 'Yönetim Masası',
    active: true,
  },
  {
    id: 'ann-3',
    title: '⚠️ 2863 Sayılı Kanun Uyarınca Bilgilendirme',
    message: 'TerraScan uzaktan algılama ve jeofizik zemin analiz sistemi tescilli sit ve korunması gerekli kültür varlığı alanlarında izinsiz kazıyı teşvik etmez; yalnızca bilimsel, jeolojik ve zemin araştırma amaçlıdır.',
    type: 'INFO',
    createdAt: '01.09.2026',
    author: 'Hukuk & Mevzuat Masası',
    active: true,
  },
];

export function getAnnouncements(): AppAnnouncement[] {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading announcements from storage', e);
  }
  saveAnnouncements(DEFAULT_ANNOUNCEMENTS);
  return DEFAULT_ANNOUNCEMENTS;
}

export function saveAnnouncements(list: AppAnnouncement[]): void {
  try {
    localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('terrascan_announcements_updated', { detail: list }));
  } catch (e) {
    console.warn('Error saving announcements to storage', e);
  }
}

export function createAnnouncement(
  title: string,
  message: string,
  type: AppAnnouncement['type'] = 'INFO',
  author: string = 'Sistem Yöneticisi'
): AppAnnouncement {
  const current = getAnnouncements();
  const newAnn: AppAnnouncement = {
    id: `ann-${Date.now()}`,
    title: title.trim(),
    message: message.trim(),
    type,
    createdAt: new Date().toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    author,
    active: true,
  };

  const updated = [newAnn, ...current];
  saveAnnouncements(updated);
  return newAnn;
}

export function deleteAnnouncement(id: string): AppAnnouncement[] {
  const current = getAnnouncements();
  const updated = current.filter((a) => a.id !== id);
  saveAnnouncements(updated);
  return updated;
}

export function toggleAnnouncementStatus(id: string): AppAnnouncement[] {
  const current = getAnnouncements();
  const updated = current.map((a) => (a.id === id ? { ...a, active: !a.active } : a));
  saveAnnouncements(updated);
  return updated;
}
