import React, { useState, useMemo } from 'react';
import { Player, PlayerRole } from '../types.ts';
import {
  X,
  Upload,
  UserPlus,
  Trash2,
  Camera,
  RotateCcw,
  CheckCircle,
  FileImage,
  Layers,
  Loader2,
} from 'lucide-react';
import { generatePlayerAvatarSvg } from '../utils/avatar.ts';
import { sortPlayersByRoleAndSurname } from '../utils/playerSort.ts';
import { matchPlayerByFilename } from '../utils/playerMatch.ts';
import { optimizeImageFile } from '../utils/imageOptimizer.ts';
import { PlayerPhoto } from './PlayerPhoto.tsx';

interface RosterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onUpdatePlayers: (updated: Player[]) => void;
  onResetToDefault: () => void;
}

export const RosterManagerModal: React.FC<RosterManagerModalProps> = ({
  isOpen,
  onClose,
  players,
  onUpdatePlayers,
  onResetToDefault,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<PlayerRole>('POR');
  const [notification, setNotification] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // New player form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSurname, setNewSurname] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Notify helper
  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Bulk upload handler: matches players across the whole squad by surname
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: File[] = (Array.from(files) as File[]).filter((f) => f.type.startsWith('image/'));
    if (fileList.length === 0) return;

    setIsProcessing(true);
    let processedCount = 0;
    const updatedList = [...players];

    for (const file of fileList) {
      try {
        const photoData = await optimizeImageFile(file);
        const matched = matchPlayerByFilename(file.name, updatedList);

        if (matched) {
          const idx = updatedList.findIndex((p) => p.id === matched.id);
          if (idx >= 0) {
            updatedList[idx] = {
              ...updatedList[idx],
              photoUrl: photoData,
            };
            processedCount++;
          }
        } else {
          // Parse surname fallback
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          const cleanSurname = nameWithoutExt
            .replace(/^(DIF|CEN|ATT|POR)[_-]?/i, '')
            .replace(/^\d+[-_]?/, '')
            .trim()
            .toUpperCase();

          updatedList.push({
            id: `p_${activeTab.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: cleanSurname || 'GIOCATORE',
            role: activeTab,
            photoUrl: photoData,
          });
          processedCount++;
        }
      } catch (err) {
        console.error(`Errore caricamento ${file.name}:`, err);
      }
    }

    onUpdatePlayers(sortPlayersByRoleAndSurname(updatedList));
    setIsProcessing(false);
    showNotice(`Associate con successo ${processedCount} foto ai giocatori per cognome!`);
    e.target.value = '';
  };

  // Single player photo update
  const handleSinglePhotoChange = async (playerId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const dataUrl = await optimizeImageFile(file);
      const updated = players.map((p) => (p.id === playerId ? { ...p, photoUrl: dataUrl } : p));
      onUpdatePlayers(updated);
      showNotice(`Foto aggiornata per ${players.find((p) => p.id === playerId)?.name}`);
    } catch (err) {
      console.error('Errore elaborazione foto:', err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // Inline edit surname
  const handleSurnameChange = (playerId: string, newSurnameVal: string) => {
    const updated = players.map((p) =>
      p.id === playerId ? { ...p, name: newSurnameVal.toUpperCase() } : p
    );
    onUpdatePlayers(sortPlayersByRoleAndSurname(updated));
  };

  // Inline edit first name
  const handleFirstNameChange = (playerId: string, newFirstVal: string) => {
    const updated = players.map((p) =>
      p.id === playerId ? { ...p, firstName: newFirstVal } : p
    );
    onUpdatePlayers(updated);
  };

  // Delete player
  const handleDeletePlayer = (playerId: string) => {
    const pToDelete = players.find((p) => p.id === playerId);
    if (!confirm(`Sei sicuro di voler eliminare ${pToDelete?.name || 'questo giocatore'}?`)) return;
    const updated = players.filter((p) => p.id !== playerId);
    onUpdatePlayers(updated);
    showNotice(`Giocatore rimosso`);
  };

  // Add single new player
  const handleAddNewPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurname.trim()) return;

    const photo = newPhotoUrl || generatePlayerAvatarSvg(newSurname.trim(), activeTab);

    const created: Player = {
      id: `p_${activeTab.toLowerCase()}_${Date.now()}`,
      name: newSurname.trim().toUpperCase(),
      firstName: newFirstName.trim() || undefined,
      role: activeTab,
      photoUrl: photo,
    };

    onUpdatePlayers(sortPlayersByRoleAndSurname([...players, created]));
    setNewSurname('');
    setNewFirstName('');
    setNewPhotoUrl('');
    setShowAddForm(false);
    showNotice(`Giocatore ${created.name} aggiunto al gruppo ${activeTab}!`);
  };

  // Filter & sort players for current tab A-Z by surname
  const tabPlayers = useMemo(() => {
    return players
      .filter((p) => p.role === activeTab)
      .sort((a, b) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }));
  }, [players, activeTab]);

  return (
    <div
      id="roster-manager-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="roster-manager-modal-container"
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Gestione Rosa & Foto Giocatori
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Giocatori ordinati per ruolo e cognome A-Z. Carica le foto con il cognome del giocatore.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            id="btn-close-roster-manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification toast */}
        {notification && (
          <div className="px-6 py-2.5 bg-amber-500/20 border-b border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Role Tabs (POR, DIF, CEN, ATT) */}
        <div className="px-6 pt-4 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {(
              [
                { id: 'POR', label: 'Portieri (POR)', color: 'border-amber-500 text-amber-400' },
                { id: 'DIF', label: 'Difensori (DIF)', color: 'border-cyan-500 text-cyan-400' },
                { id: 'CEN', label: 'Centrocampisti (CEN)', color: 'border-emerald-500 text-emerald-400' },
                { id: 'ATT', label: 'Attaccanti (ATT)', color: 'border-rose-500 text-rose-400' },
              ] as const
            ).map((tab) => {
              const count = players.filter((p) => p.role === tab.id).length;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setShowAddForm(false);
                  }}
                  className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    isActive
                      ? `${tab.color} text-white`
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                  id={`tab-roster-${tab.id}`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bulk Upload Section */}
        <div className="p-4 sm:p-5 bg-zinc-950/60 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-center sm:justify-start">
              <Upload className="w-4 h-4 text-amber-400" />
              Carica Foto Giocatori (Auto-Match per Cognome)
            </div>
            <p className="text-[11px] text-zinc-400">
              Seleziona più immagini nominate col cognome (es. <code>ANGELUCCI.jpeg</code>, <code>VISCOMI.jpeg</code>). Vengono associate in automatico a tutti i ruoli!
            </p>
          </div>

          <label className="cursor-pointer shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all">
            <FileImage className="w-4 h-4" />
            <span>Sfoglia e Carica Foto</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleBulkUpload}
              className="hidden"
              id="bulk-photo-input"
            />
          </label>
        </div>

        {/* Players in Active Group */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {tabPlayers.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <p className="text-sm">Nessun giocatore presente nel gruppo {activeTab}.</p>
              <p className="text-xs">Usa il pulsante sopra per caricare le foto o aggiungili manualmente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tabPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
                  id={`roster-card-${player.id}`}
                >
                  {/* Photo & change button */}
                  <div className="relative group shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-900 shadow">
                      <PlayerPhoto player={player} />
                    </div>

                    {/* Change photo hover button */}
                    <label
                      title="Cambia foto"
                      className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                    >
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSinglePhotoChange(player.id, e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Info & editable fields */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={player.name}
                        onChange={(e) => handleSurnameChange(player.id, e.target.value)}
                        className="w-full bg-transparent text-sm font-extrabold text-white uppercase focus:bg-zinc-900 focus:outline-none px-1.5 py-0.5 rounded border border-transparent focus:border-zinc-700 truncate"
                        title="Cognome (modificabile)"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 px-1.5">
                      <input
                        type="text"
                        placeholder="Nome (opzionale)"
                        value={player.firstName || ''}
                        onChange={(e) => handleFirstNameChange(player.id, e.target.value)}
                        className="w-full bg-transparent text-xs text-zinc-400 focus:text-zinc-200 focus:bg-zinc-900 focus:outline-none px-1 py-0.5 rounded border border-transparent focus:border-zinc-700"
                        title="Nome del giocatore"
                      />
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeletePlayer(player.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
                    title="Elimina giocatore"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add single player drawer */}
        {showAddForm && (
          <form
            onSubmit={handleAddNewPlayer}
            className="p-4 border-t border-zinc-800 bg-zinc-950 space-y-3"
          >
            <h4 className="text-xs font-bold text-zinc-300 uppercase">
              Aggiungi Giocatore a {activeTab}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-zinc-400">Cognome *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. VISCOMI"
                  value={newSurname}
                  onChange={(e) => setNewSurname(e.target.value.toUpperCase())}
                  className="w-full mt-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:border-amber-400 uppercase"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-400">Nome</label>
                <input
                  type="text"
                  placeholder="Es. Carlo Alberto"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-400">Foto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      try {
                        const compressed = await optimizeImageFile(f);
                        setNewPhotoUrl(compressed);
                      } catch (err) {
                        console.error('Errore compressione foto:', err);
                      }
                    }
                  }}
                  className="w-full mt-1 text-[10px] text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-zinc-800 file:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-1 text-xs font-bold bg-amber-400 text-zinc-950 rounded-lg hover:bg-amber-300"
              >
                Salva Giocatore
              </button>
            </div>
          </form>
        )}

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-xl hover:bg-amber-400/20 transition-all"
              id="btn-add-player-roster"
            >
              <UserPlus className="w-4 h-4" />
              + Aggiungi Singolo Giocatore
            </button>
            <button
              onClick={() => {
                if (confirm('Vuoi ripristinare la rosa ufficiale predefinita?')) {
                  onResetToDefault();
                  showNotice('Rosa ripristinata ai 22 giocatori ufficiali');
                }
              }}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Ripristina la lista ufficiale dei 22 giocatori"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Ripristina Rosa Ufficiale
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
          >
            Fatto
          </button>
        </div>
      </div>
    </div>
  );
};
