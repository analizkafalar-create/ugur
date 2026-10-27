import React, { useState } from 'react';
import { 
  X, 
  Bookmark, 
  MapPin, 
  Satellite, 
  Activity, 
  Calendar, 
  Check, 
  Layers,
  FileText
} from 'lucide-react';
import { UserProfile, SavedStudy, AppLanguage, ScanArea } from '../types';
import { TRANSLATIONS } from '../utils/i18n';
import { sound } from '../utils/anomalyEngine';
import { updateUser } from '../utils/userManager';

interface SaveStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile;
  userProfile?: UserProfile;
  scanArea: ScanArea | null;
  satelliteName?: string;
  activeSatellite?: { name: string };
  onStudySaved?: (updatedUser: UserProfile) => void;
  onSaveSuccess?: (savedStudy: SavedStudy) => void;
  currentLang: AppLanguage;
}

export const SaveStudyModal: React.FC<SaveStudyModalProps> = ({
  isOpen,
  onClose,
  user,
  userProfile,
  scanArea,
  satelliteName,
  activeSatellite,
  onStudySaved,
  onSaveSuccess,
  currentLang,
}) => {
  const activeUser = user || userProfile;
  const satName = satelliteName || activeSatellite?.name || 'TerraSAR-X High-Res';
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.tr;

  const defaultTitle = scanArea?.locationName 
    ? `${scanArea.locationName} - Jeofizik Taraması`
    : `Saha Taraması (${scanArea ? `${scanArea.center.lat.toFixed(4)}, ${scanArea.center.lng.toFixed(4)}` : 'Konum'})`;

  const [title, setTitle] = useState(defaultTitle);
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen || !activeUser) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const lat = scanArea ? scanArea.center.lat : 38.477309;
    const lng = scanArea ? scanArea.center.lng : 29.728954;
    const coordsStr = `${lat.toFixed(6)} ${lng.toFixed(6)}`;

    const newStudy: SavedStudy = {
      id: `study-${Date.now()}`,
      title: title.trim(),
      coordinates: coordsStr,
      lat,
      lng,
      locationName: scanArea?.locationName || 'Özel Saha Koordinatı',
      date: new Date().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }),
      satelliteName: satName,
      hotspotCount: scanArea?.hotspots?.length || 0,
      confidenceScore: scanArea ? Math.min(9.9, +(8.5 + (scanArea.hotspots?.length || 1) * 0.3).toFixed(1)) : 9.0,
      depthRange: '0.8 - 4.8 m',
      notes: notes.trim() || undefined,
      tags: ['Saha Kaydı', satName.split(' ')[0]],
    };

    const currentStudies = activeUser.savedStudies || [];
    const updatedUser: UserProfile = {
      ...activeUser,
      savedStudies: [newStudy, ...currentStudies],
      savedLocationsCount: (activeUser.savedLocationsCount || 0) + 1,
    };

    updateUser(updatedUser);
    sound.playAnomalyDiscovered();
    setIsSaved(true);

    setTimeout(() => {
      if (typeof onStudySaved === 'function') {
        onStudySaved(updatedUser);
      }
      if (typeof onSaveSuccess === 'function') {
        onSaveSuccess(newStudy);
      }
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Bookmark className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{t.saveStudyTitle}</h3>
              <p className="text-[11px] text-slate-400">{t.saveStudyDesc}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Telemetry Summary Pill */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">Koordinat</span>
              <span className="font-mono text-cyan-300 font-bold">
                {scanArea ? `${scanArea.center.lat.toFixed(4)}, ${scanArea.center.lng.toFixed(4)}` : '38.4773, 29.7289'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Aktif Uydu</span>
              <span className="text-slate-200 font-medium truncate block">{satelliteName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Tespit Edilen Anomali</span>
              <span className="text-emerald-400 font-bold font-mono">
                {scanArea?.hotspots?.length || 0} Odak / Hotspot
              </span>
            </div>
          </div>

          {isSaved ? (
            <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-center space-y-2 animate-fadeIn">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 mx-auto">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <h4 className="font-bold text-emerald-300 text-sm">{t.studySavedSuccess}</h4>
              <p className="text-xs text-slate-300">Profilinizdeki "Kayıtlı Çalışmalarım" sekmesinden istediğiniz an bu taramayı yeniden yükleyebilirsiniz.</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.studyName} <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Uşak Sivaslı Yeraltı Boşluk Analizi"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t.studyNotes}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Saha yapısı, toprak tipi, dielektrik direnç veya arazideki gözlemlerinizi not edin..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none shadow-inner"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{t.saveStudy}</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
